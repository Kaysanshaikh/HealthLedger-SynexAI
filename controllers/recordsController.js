const healthLedgerService = require("../services/healthLedgerService");
const db = require("../services/databaseService");
const validation = require("../utils/validation");
const { query } = require("../config/database");
const pinataService = require("../services/pinataService");
const mlModelService = require("../services/mlModelService");

exports.create = async (req, res) => {
  try {
    const { recordId, patient, cid, meta, recordType, creatorWallet } = req.body || {};

    if (!recordId || !patient || !cid) {
      return res
        .status(400)
        .json({ error: "recordId, patient and cid are required" });
    }

    console.log("📝 Creating record:", { recordId, patient, cid });

    // 1. Create record on blockchain
    const tx = await healthLedgerService.createRecord(recordId, patient, cid, meta);
    const receipt = await tx.wait();

    console.log("✅ Blockchain record created");

    // 2. Get patient HH number from database
    const patientUser = await db.getUserByWallet(patient);
    const patientHHNumber = patientUser ? patientUser.hh_number : null;

    // 3. Index record in database for fast search
    const metadata = meta ? JSON.parse(meta) : {};
    const searchableText = `${metadata.testName || ''} ${metadata.testType || ''} ${metadata.results || ''} ${metadata.notes || ''}`.trim();

    await db.indexRecord({
      recordId: recordId,
      patientWallet: patient,
      patientHHNumber: patientHHNumber,
      creatorWallet: creatorWallet || patient,
      ipfsCid: cid,
      recordType: recordType || 'general',
      metadata: metadata,
      searchableText: searchableText || 'medical record',
      blockchainTxHash: receipt.hash
    });

    console.log("✅ Record indexed in database");

    // 4. Log access
    await db.logAccess(
      recordId,
      creatorWallet || patient,
      'creator',
      'create',
      req.ip,
      req.headers['user-agent']
    );

    // 5. Notify patient
    if (creatorWallet && creatorWallet !== patient) {
      await db.createNotification(
        patient,
        'New Medical Record',
        'A new medical record has been added to your account',
        'record_created',
        recordId
      );
    }

    return res.json({
      txHash: receipt.hash,
      status: receipt.status,
      recordId: recordId,
      message: "Record created and indexed successfully"
    });
  } catch (error) {
    console.error("❌ Create record error:", error);
    return res.status(400).json({ error: error.message });
  }
};

exports.get = async (req, res) => {
  try {
    const { recordId } = req.params;

    console.log("📋 Fetching record:", recordId);

    // First, try to get from database (faster)
    try {
      const dbRecord = await db.getRecordById(recordId);
      if (dbRecord) {
        console.log("✅ Record found in database");

        // Also get from blockchain for complete data
        try {
          const blockchainRecord = await healthLedgerService.getRecord(recordId);
          return res.json({
            record: {
              ...blockchainRecord,
              ...dbRecord
            }
          });
        } catch (blockchainError) {
          // If blockchain fails, return database record
          console.log("⚠️ Blockchain fetch failed, returning database record");
          return res.json({ record: dbRecord });
        }
      }
    } catch (dbError) {
      console.log("Database lookup failed, trying blockchain...");
    }

    // If not in database, try blockchain
    const record = await healthLedgerService.getRecord(recordId);
    console.log("✅ Record found on blockchain");
    return res.json({ record });

  } catch (error) {
    console.error("❌ Get record error:", error);

    // User-friendly error messages
    let userMessage = "Record not found";

    if (error.message.includes("not found")) {
      userMessage = "No medical records found. You may not have any records yet, or the record ID is incorrect.";
    } else if (error.message.includes("access denied") || error.message.includes("unauthorized")) {
      userMessage = "You don't have permission to view this record.";
    } else if (error.message.includes("network")) {
      userMessage = "Network error. Please check your connection and try again.";
    }

    return res.status(404).json({
      error: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getPatientRecords = async (req, res) => {
  try {
    const { hhNumber } = req.params;
    const user = req.user; // Set by authMiddleware

    console.log("📋 Fetching all records for patient:", hhNumber);

    // 🛡️ SECURITY: Authorization Check
    const isPatient = parseInt(user.hhNumber) === parseInt(hhNumber);
    let hasAccess = isPatient;

    if (!hasAccess && user.role === 'doctor') {
      const access = await query(
        `SELECT is_active FROM doctor_patient_access 
         WHERE doctor_hh_number = $1 AND patient_hh_number = $2 AND is_active = true`,
        [parseInt(user.hhNumber), parseInt(hhNumber)]
      );
      hasAccess = access.rows.length > 0;
    }

    if (!hasAccess) {
      console.error(`🚨 UNAUTHORIZED RECORD LISTING: User ${user.hhNumber} tried to list records for patient ${hhNumber}`);
      return res.status(403).json({ error: "Access Denied. You do not have permission to view records for this patient." });
    }

    // Get user by HH number
    const patientUser = await db.getUserByHHNumber(parseInt(hhNumber));

    if (!patientUser) {
      return res.status(404).json({
        error: "No account found with this HH Number. Please check the number and try again.",
        records: []
      });
    }

    // Get records from database - use the PATIENT'S wallet address, not the requester's (which might be a doctor's)
    console.log(`🔍 Searching for records for patient HH ${hhNumber} with wallet ${patientUser.wallet_address}`);

    // Fetch records by both HH number and the verified patient wallet address
    const recordsByHH = await db.getRecordsByPatientHH(parseInt(hhNumber), 100);
    console.log(`📊 Found ${recordsByHH.length} records by HH number`);

    const recordsByWallet = await db.getRecordsByPatient(patientUser.wallet_address, 100);
    console.log(`📊 Found ${recordsByWallet.length} records by wallet address`);

    // Combine and deduplicate records
    const combinedRecords = [...recordsByHH, ...recordsByWallet];
    const uniqueRecords = Array.from(new Map(combinedRecords.map(record => [record.record_id, record])).values());
    const records = uniqueRecords;

    console.log(`✅ Total found ${records.length} records for patient ${hhNumber}`);

    // SECURITY CHECK: Ensure records belong to this patient
    const filteredRecords = records.filter(record => {
      // Primary check: HH numbers must match
      const recordHH = parseInt(record.patient_hh_number);
      const expectedHH = parseInt(hhNumber);
      const hhMatches = recordHH === expectedHH;

      // Secondary check: Wallet addresses must match the PATIENT'S verified wallet
      const recordWallet = (record.patient_wallet || '').toLowerCase();
      const expectedWallet = (patientUser.wallet_address || '').toLowerCase();
      const walletMatches = recordWallet === expectedWallet;

      console.log(`🔍 Checking record ${record.record_id}:`);
      console.log(`   Record HH: ${record.patient_hh_number}, Expected HH: ${hhNumber} -> Matches: ${hhMatches}`);
      console.log(`   Record Wallet: ${recordWallet}, Expected Patient Wallet: ${expectedWallet} -> Matches: ${walletMatches}`);

      // SECURITY: A record is valid if it matches the HH number OR the verified wallet address
      // (This handles legacy records and wallet migrations)
      const belongsToPatient = hhMatches || walletMatches;
      console.log(`   Final Result: ${belongsToPatient}`);

      if (!belongsToPatient) {
        console.error(`🚨 SECURITY ALERT: Record ${record.record_id} does not belong to patient!`);
        console.error(`   HH Check: ${recordHH} === ${expectedHH} = ${hhMatches}`);
        console.error(`   Wallet Check: ${recordWallet} === ${expectedWallet} = ${walletMatches}`);
        return false;
      }

      return true;
    });

    if (filteredRecords.length !== records.length) {
      console.error(`🚨 SECURITY BREACH: Filtered out ${records.length - filteredRecords.length} records that didn't belong to patient ${hhNumber}`);
    }

    if (filteredRecords.length === 0) {
      return res.json({
        message: "No medical records found yet. Records will appear here once they are created.",
        records: [],
        count: 0
      });
    }

    return res.json({
      records: filteredRecords,
      count: filteredRecords.length,
      patient: {
        hhNumber: user.hh_number,
        walletAddress: user.wallet_address
      }
    });

  } catch (error) {
    console.error("❌ Get patient records error:", error);

    const userMessage = validation.getUserFriendlyError(error);

    return res.status(500).json({
      error: userMessage,
      records: [],
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { cid, meta } = req.body || {};

    if (!cid && !meta) {
      return res.status(400).json({ error: "cid or meta required" });
    }

    const tx = await healthLedgerService.updateRecord(recordId, cid || "", meta || "");
    const receipt = await tx.wait();

    return res.json({ txHash: receipt.hash, status: receipt.status });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.grantAccess = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { address } = req.body || {};

    if (!address) {
      return res.status(400).json({ error: "address is required" });
    }

    const tx = await healthLedgerService.grantAccess(recordId, address);
    const receipt = await tx.wait();
    return res.json({ txHash: receipt.hash, status: receipt.status });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.revokeAccess = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { address } = req.body || {};

    if (!address) {
      return res.status(400).json({ error: "address is required" });
    }

    const tx = await healthLedgerService.revokeAccess(recordId, address);
    const receipt = await tx.wait();
    return res.json({ txHash: receipt.hash, status: receipt.status });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.hasAccess = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: "address query parameter required" });
    }

    const hasAccess = await healthLedgerService.hasAccess(recordId, address);
    return res.json({ hasAccess });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.grantAccessByPatient = async (req, res) => {
  try {
    const { hhNumber } = req.params;
    const { doctorHHNumber } = req.body;

    console.log("🔐 Patient granting access:", { patientHH: hhNumber, doctorHH: doctorHHNumber });

    if (!doctorHHNumber) {
      return res.status(400).json({ error: "Doctor's HH Number is required" });
    }

    // Get patient's wallet address from database
    const patient = await db.getUserByHHNumber(parseInt(hhNumber));

    if (!patient) {
      return res.status(404).json({ error: "Your account was not found. Please make sure you're registered as a patient." });
    }

    // Get doctor's wallet address from database
    const doctor = await db.getUserByHHNumber(parseInt(doctorHHNumber));

    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found. Please check the HH Number." });
    }

    if (doctor.role !== 'doctor') {
      return res.status(400).json({ error: "The HH Number provided is not registered as a doctor." });
    }

    const patientAddress = patient.wallet_address;
    const doctorAddress = doctor.wallet_address;

    console.log("👤 Patient HH:", hhNumber);
    console.log("👨‍⚕️ Doctor HH:", doctorHHNumber);

    // Store in database using HH numbers as primary identifiers
    await query(
      `INSERT INTO doctor_patient_access 
       (doctor_hh_number, patient_hh_number, doctor_wallet, patient_wallet, granted_by, is_active, granted_at)
       VALUES ($1, $2, LOWER($3), LOWER($4), LOWER($5), true, CURRENT_TIMESTAMP)
       ON CONFLICT (doctor_hh_number, patient_hh_number) 
       DO UPDATE SET 
         is_active = true, 
         granted_at = CURRENT_TIMESTAMP, 
         revoked_at = NULL`,
      [parseInt(doctorHHNumber), parseInt(hhNumber), doctorAddress, patientAddress, patientAddress]
    );

    console.log("✅ Access granted successfully");

    // Create notification for doctor
    await db.createNotification(
      doctorAddress,
      'Access Granted',
      `Patient (HH: ${hhNumber}) has granted you access to their medical records`,
      'access_granted',
      null
    );

    return res.json({
      message: "Access granted successfully",
      success: true
    });
  } catch (error) {
    console.error("❌ Failed to grant access:", error);

    const userMessage = validation.getUserFriendlyError(error);
    return res.status(400).json({ error: userMessage });
  }
};

exports.revokeAccessByPatient = async (req, res) => {
  try {
    const { hhNumber } = req.params;
    const { doctorHHNumber } = req.body;

    console.log("🚫 Patient revoking access:", { patientHH: hhNumber, doctorHH: doctorHHNumber });

    if (!doctorHHNumber) {
      return res.status(400).json({ error: "Doctor's HH Number is required" });
    }

    // Get patient's wallet address from database
    const patient = await db.getUserByHHNumber(parseInt(hhNumber));

    if (!patient) {
      return res.status(404).json({ error: "Your account was not found. Please make sure you're registered as a patient." });
    }

    // Get doctor's wallet address from database
    const doctor = await db.getUserByHHNumber(parseInt(doctorHHNumber));

    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found. Please check the HH Number." });
    }

    const patientAddress = patient.wallet_address;
    const doctorAddress = doctor.wallet_address;

    console.log("👤 Patient HH:", hhNumber);
    console.log("👨‍⚕️ Doctor HH:", doctorHHNumber);

    // Update database to revoke access using HH numbers
    await query(
      `UPDATE doctor_patient_access 
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP
       WHERE doctor_hh_number = $1 AND patient_hh_number = $2`,
      [parseInt(doctorHHNumber), parseInt(hhNumber)]
    );

    console.log("✅ Access revoked successfully");

    // Create notification for doctor
    await db.createNotification(
      doctorAddress,
      'Access Revoked',
      `Patient (HH: ${hhNumber}) has revoked your access to their medical records`,
      'access_revoked',
      null
    );

    return res.json({
      message: "Access revoked successfully",
      success: true
    });
  } catch (error) {
    console.error("❌ Failed to revoke access:", error);

    const userMessage = validation.getUserFriendlyError(error);
    return res.status(400).json({ error: userMessage });
  }
};

exports.getGrantedDoctors = async (req, res) => {
  try {
    const { hhNumber } = req.params;

    console.log("📋 Getting granted doctors for patient:", hhNumber);

    // Get patient's wallet address
    const patient = await db.getUserByHHNumber(parseInt(hhNumber));

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found",
        doctors: []
      });
    }

    // Get all doctors (active and revoked) using HH numbers - no duplicates
    const result = await query(
      `SELECT DISTINCT ON (dpa.doctor_hh_number)
        dpa.doctor_hh_number,
        dp.full_name,
        dp.specialization,
        dp.hospital,
        u.email,
        dpa.granted_at,
        dpa.revoked_at,
        dpa.is_active
       FROM doctor_patient_access dpa
       JOIN users u ON dpa.doctor_hh_number = u.hh_number
       LEFT JOIN doctor_profiles dp ON dpa.doctor_hh_number = dp.hh_number
       WHERE dpa.patient_hh_number = $1
       ORDER BY dpa.doctor_hh_number, dpa.granted_at DESC`,
      [parseInt(hhNumber)]
    );

    console.log(`✅ Found ${result.rows.length} doctors with access`);

    res.json({
      doctors: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error("❌ Get granted doctors error:", error);
    res.status(500).json({
      error: "Unable to load granted doctors",
      doctors: []
    });
  }
};

exports.createDiagnosticReport = async (req, res) => {
  try {
    const { patientHHNumber, testName, testType, results, notes, ipfsCID, diagnosticHHNumber, fileName, fileType, fileSize, healthMetrics } = req.body;

    console.log("📋 Creating diagnostic report:", req.body);

    if (!patientHHNumber || !testName || !testType || !results) {
      return res.status(400).json({ error: "Patient HH Number, Test Name, Test Type, and Results are required" });
    }

    // Create a unique record ID based on patient HH number and timestamp
    const recordId = `diagnostic-${patientHHNumber}-${Date.now()}`;

    // Map testType to disease category for ML relevancy
    const testTypeToDiseaseCategory = {
      'metabolic': 'diabetes',
      'cardiovascular': 'cvd',
      'genomics': 'cancer',
      'respiratory': 'respiratory',
      'lifestyle': 'general',
      'other': 'general'
    };
    const diseaseCategory = testTypeToDiseaseCategory[testType] || 'general';

    // Create metadata JSON
    const metadata = {
      testName,
      testType,
      diseaseCategory,
      results,
      notes: notes || "",
      diagnosticHHNumber,
      createdAt: new Date().toISOString()
    };

    // Add health metrics to metadata if provided
    if (healthMetrics && Array.isArray(healthMetrics) && healthMetrics.length > 0) {
      metadata.healthMetrics = healthMetrics;
      console.log(`📊 ${healthMetrics.length} structured health metrics included for ML training`);
    }

    // Add file metadata if provided
    if (fileName) {
      metadata.fileName = fileName;
      metadata.fileType = fileType;
      metadata.fileSize = fileSize;
    }

    // Use IPFS CID if provided, otherwise use a placeholder
    const cid = ipfsCID || "QmPlaceholder";
    const meta = JSON.stringify(metadata);

    // Get patient wallet address from database
    const patient = await db.getUserByHHNumber(parseInt(patientHHNumber));

    if (!patient) {
      return res.status(404).json({ error: "Patient not found. Please check the HH Number." });
    }

    const patientAddress = patient.wallet_address;

    console.log("👤 Patient address:", patientAddress);
    console.log("📝 Creating record with ID:", recordId);

    let receipt = null;
    try {
      const tx = await healthLedgerService.createRecord(recordId, patientAddress, cid, meta);
      receipt = await tx.wait();
      console.log("✅ Diagnostic report created on blockchain");
    } catch (blockchainError) {
      console.warn("⚠️ Blockchain unavailable, creating database-only record:", blockchainError.message);
      // Continue with database indexing even if blockchain fails
    }

    // Get diagnostic center user from database
    const diagnosticCenter = await db.getUserByHHNumber(parseInt(diagnosticHHNumber));

    if (!diagnosticCenter) {
      return res.status(400).json({ error: "Invalid diagnostic center HH Number" });
    }

    // Index record in database for fast search
    const searchableText = `${testName} ${testType} ${results} ${notes || ''}`.trim();

    console.log(`🏥 Diagnostic center: ${diagnosticHHNumber} (${diagnosticCenter.wallet_address})`);
    console.log(`👤 Patient: ${patientHHNumber} (${patientAddress})`);

    await db.indexRecord({
      recordId: recordId,
      patientWallet: patientAddress,
      patientHHNumber: parseInt(patientHHNumber),
      creatorWallet: diagnosticCenter.wallet_address, // FIXED: Use diagnostic center's wallet
      ipfsCid: cid,
      recordType: 'diagnostic-report',
      metadata: metadata,
      searchableText: searchableText,
      blockchainTxHash: receipt?.hash || null
    });

    console.log("✅ Diagnostic report indexed in database");

    // Save structured health metrics to diagnostic_metrics table for ML training
    if (healthMetrics && Array.isArray(healthMetrics) && healthMetrics.length > 0) {
      for (const metric of healthMetrics) {
        if (metric.name && metric.value !== undefined && metric.value !== '') {
          try {
            await query(
              `INSERT INTO diagnostic_metrics (record_id, patient_hh_number, disease_category, metric_name, metric_value, metric_unit)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [recordId, parseInt(patientHHNumber), diseaseCategory, metric.name, parseFloat(metric.value), metric.unit || null]
            );
          } catch (metricErr) {
            console.warn(`⚠️ Failed to save metric ${metric.name}:`, metricErr.message);
          }
        }
      }
      console.log(`📊 ${healthMetrics.length} health metrics saved for ML training`);
    }

    // Create notification for patient
    if (patient) {
      await db.createNotification(
        patientAddress,
        'New Diagnostic Report',
        `A new diagnostic report has been created: ${testName}`,
        'record_created',
        recordId
      );
    }

    return res.json({
      message: "Diagnostic report created successfully",
      txHash: receipt?.hash || null,
      recordId,
      status: receipt?.status || 'database-only',
      blockchainStatus: receipt ? 'confirmed' : 'pending-blockchain',
      metricsCount: (healthMetrics || []).length
    });
  } catch (error) {
    console.error("❌ Failed to create diagnostic report:", error);
    return res.status(400).json({ error: error.message });
  }
};

/**
 * Upload medical record file to IPFS via Pinata
 * Supports: PDF, DOC, DOCX, JPG, JPEG, PNG (max 1MB)
 */
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { patientHHNumber, recordType, description, skipRecordCreation } = req.body;

    if (!patientHHNumber) {
      return res.status(400).json({ error: "Patient HH Number is required" });
    }

    console.log("📤 Uploading medical file:", {
      fileName: req.file.originalname,
      size: `${(req.file.size / 1024).toFixed(2)}KB`,
      type: req.file.mimetype,
      skipRecordCreation: skipRecordCreation === 'true'
    });

    // 🛡️ SECURITY: Encrypt the file buffer before uploading to IPFS
    const encryptedData = mlModelService.encryptData(req.file.buffer);
    const encryptedBuffer = Buffer.from(encryptedData, 'utf8');

    // Upload encrypted JSON to Pinata IPFS
    const uploadResult = await pinataService.uploadFile(
      encryptedBuffer,
      `${req.file.originalname}.encrypted`,
      {
        patientHHNumber: patientHHNumber,
        recordType: recordType || 'medical-record',
        description: description || '',
        uploadedBy: req.body.uploaderHHNumber || patientHHNumber,
        isEncrypted: 'true'
      }
    );

    console.log("✅ File uploaded to IPFS:", uploadResult.cid);

    // If skipRecordCreation is true, only return the upload result without creating a record
    // This is used when the diagnostic form will create the record with additional metadata
    if (skipRecordCreation === 'true') {
      console.log("⏭️ Skipping record creation (will be created by diagnostic form)");
      return res.json({
        success: true,
        message: "File uploaded successfully",
        ipfs: {
          cid: uploadResult.cid,
          url: uploadResult.url,
          size: uploadResult.size
        },
        metadata: {
          fileName: req.file.originalname,
          fileType: uploadResult.fileType,
          fileSize: req.file.size
        }
      });
    }

    // Create record ID
    const recordId = `record-${patientHHNumber}-${Date.now()}`;

    // Get patient wallet address
    const patient = await db.getUserByHHNumber(parseInt(patientHHNumber));
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Create metadata
    const metadata = {
      fileName: req.file.originalname,
      fileType: uploadResult.fileType,
      fileSize: req.file.size,
      recordType: recordType || 'medical-record',
      description: description || '',
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.body.uploaderHHNumber || patientHHNumber
    };

    // Store on blockchain
    const tx = await healthLedgerService.createRecord(
      recordId,
      patient.wallet_address,
      uploadResult.cid,
      JSON.stringify(metadata)
    );
    const receipt = await tx.wait();

    // Index in database
    await db.indexRecord({
      recordId: recordId,
      patientWallet: patient.wallet_address,
      patientHHNumber: parseInt(patientHHNumber),
      creatorWallet: req.body.uploaderWallet || patient.wallet_address,
      ipfsCid: uploadResult.cid,
      recordType: recordType || 'medical-record',
      metadata: metadata,
      searchableText: `${req.file.originalname} ${description || ''}`,
      blockchainTxHash: receipt.hash
    });

    // Create notification
    await db.createNotification(
      patient.wallet_address,
      'New Medical Record Uploaded',
      `A new ${recordType || 'medical record'} has been uploaded: ${req.file.originalname}`,
      'record_created',
      recordId
    );

    return res.json({
      success: true,
      message: "File uploaded successfully",
      recordId: recordId,
      ipfs: {
        cid: uploadResult.cid,
        url: uploadResult.url,
        size: uploadResult.size
      },
      blockchain: {
        txHash: receipt.hash,
        status: receipt.status
      }
    });

  } catch (error) {
    console.error("❌ File upload error:", error);
    return res.status(500).json({
      error: error.message || "Failed to upload file"
    });
  }
};

/**
 * Retrieve medical record file from IPFS
 */
exports.retrieveFile = async (req, res) => {
  try {
    const { cid } = req.params;

    if (!cid) {
      return res.status(400).json({ error: "IPFS CID is required" });
    }

    console.log("📥 Retrieving file from IPFS:", cid);



    // 🛡️ SECURITY: Fetch record from DB to verify ownership/access
    const record = await db.getRecordByCID(cid);
    if (!record) {
      return res.status(404).json({ error: "Record not found in database" });
    }

    // Authorization check: User must be patient OR authorized doctor
    const user = req.user; // Set by authMiddleware
    const isPatient = parseInt(user.hhNumber) === parseInt(record.patient_hh_number);

    let hasAccess = isPatient;
    if (!hasAccess && user.role === 'doctor') {
      const access = await query(
        `SELECT is_active FROM doctor_patient_access 
         WHERE doctor_hh_number = $1 AND patient_hh_number = $2 AND is_active = true`,
        [parseInt(user.hhNumber), parseInt(record.patient_hh_number)]
      );
      hasAccess = access.rows.length > 0;
    }

    if (!hasAccess) {
      console.error(`🚨 UNAUTHORIZED ACCESS ATTEMPT: User ${user.hhNumber} tried to access record ${record.record_id}`);
      return res.status(403).json({ error: "Access Denied. You do not have permission to view this medical record." });
    }

    // Get file from IPFS
    const encryptedBuffer = await pinataService.retrieveFile(cid);
    const encryptedData = encryptedBuffer.toString('utf8');

    // Decrypt file
    let fileBuffer;
    try {
      fileBuffer = mlModelService.decryptData(encryptedData);
    } catch (decryptError) {
      console.warn("⚠️ Decryption failed, serving as raw (legacy file?)");
      fileBuffer = encryptedBuffer;
    }

    let fileName = 'medical-record';
    let contentType = 'application/octet-stream';

    if (record && record.metadata) {
      fileName = record.metadata.fileName || fileName;
      const fileType = record.metadata.fileType || '';
      contentType = pinataService.getContentType(fileType);
    }

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Send decrypted file
    res.send(fileBuffer);

  } catch (error) {
    console.error("❌ File retrieval error:", error);
    return res.status(500).json({
      error: error.message || "Failed to retrieve file"
    });
  }
};

/**
 * Get file URL from IPFS CID
 */
exports.getFileUrl = async (req, res) => {
  try {
    const { cid } = req.params;

    if (!cid) {
      return res.status(400).json({ error: "IPFS CID is required" });
    }

    const url = pinataService.getFileUrl(cid);

    return res.json({
      success: true,
      cid: cid,
      url: url,
      gatewayUrl: url
    });

  } catch (error) {
    console.error("❌ Get file URL error:", error);
    return res.status(500).json({
      error: error.message || "Failed to get file URL"
    });
  }
};

exports.getDiagnosticReports = async (req, res) => {
  try {
    const { hhNumber } = req.params;

    console.log("📋 Fetching reports for diagnostic center HH Number:", hhNumber);

    if (!hhNumber) {
      return res.status(400).json({ error: "Diagnostic center HH Number is required" });
    }

    // Get all records created by this diagnostic center
    const reports = await db.getRecordsByCreator('diagnostic', parseInt(hhNumber));

    if (!reports || reports.length === 0) {
      return res.json({
        message: "No reports found. You haven't created any diagnostic reports yet.",
        reports: []
      });
    }

    console.log(`✅ Found ${reports.length} reports for diagnostic center ${hhNumber}`);

    return res.json({
      message: `Found ${reports.length} report(s)`,
      reports: reports
    });
  } catch (error) {
    console.error("❌ Failed to fetch diagnostic reports:", error);
    return res.status(500).json({ error: "Unable to fetch reports. Please try again." });
  }
};


