const { query, getClient } = require('../config/database');

class DatabaseService {
  // Direct query method for compatibility with FL routes
  async query(text, params) {
    return await query(text, params);
  }

  // ==================== USER OPERATIONS ====================

  async createUser(walletAddress, email, role, hhNumber, passwordHash = null) {
    const result = await query(
      `INSERT INTO users (wallet_address, email, role, hh_number, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [walletAddress, email, role, hhNumber, passwordHash]
    );
    return result.rows[0];
  }

  async getUserByWallet(walletAddress) {
    const result = await query(
      'SELECT * FROM users WHERE wallet_address = $1 LIMIT 1',
      [walletAddress]
    );
    return result.rows[0];
  }

  async getUserByWalletAndRole(walletAddress, role) {
    const result = await query(
      'SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1) AND role = $2',
      [walletAddress, role]
    );
    return result.rows[0];
  }

  async getUserByWalletAndHH(walletAddress, hhNumber) {
    const result = await query(
      'SELECT * FROM users WHERE wallet_address = $1 AND hh_number = $2',
      [walletAddress, hhNumber]
    );
    return result.rows[0];
  }

  async getUserByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async getUserByHHNumber(hhNumber) {
    const result = await query(
      'SELECT * FROM users WHERE hh_number = $1',
      [hhNumber]
    );
    return result.rows[0];
  }

  // ==================== PATIENT PROFILE OPERATIONS ====================

  async createPatientProfile(data) {
    const {
      userId, hhNumber, fullName, dateOfBirth, gender, bloodGroup,
      homeAddress, phoneNumber, emergencyContactName, emergencyContactPhone,
      allergies, chronicConditions
    } = data;

    const result = await query(
      `INSERT INTO patient_profiles 
       (user_id, hh_number, full_name, date_of_birth, gender, blood_group,
        home_address, phone_number, emergency_contact_name, emergency_contact_phone,
        allergies, chronic_conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [userId, hhNumber, fullName, dateOfBirth, gender, bloodGroup,
        homeAddress, phoneNumber, emergencyContactName, emergencyContactPhone,
        allergies, chronicConditions]
    );
    return result.rows[0];
  }

  async getPatientProfile(hhNumber) {
    const result = await query(
      `SELECT pp.*, u.wallet_address, u.email 
       FROM patient_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.hh_number = $1`,
      [hhNumber]
    );
    return result.rows[0];
  }

  // ==================== DOCTOR PROFILE OPERATIONS ====================

  async createDoctorProfile(data) {
    const {
      userId, hhNumber, fullName, specialization, hospital,
      licenseNumber, phoneNumber, yearsOfExperience
    } = data;

    const result = await query(
      `INSERT INTO doctor_profiles 
       (user_id, hh_number, full_name, specialization, hospital,
        license_number, phone_number, years_of_experience)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, hhNumber, fullName, specialization, hospital,
        licenseNumber, phoneNumber, yearsOfExperience]
    );
    return result.rows[0];
  }

  async getDoctorProfile(hhNumber) {
    const result = await query(
      `SELECT dp.*, u.wallet_address, u.email 
       FROM doctor_profiles dp
       JOIN users u ON dp.user_id = u.id
       WHERE dp.hh_number = $1`,
      [hhNumber]
    );
    return result.rows[0];
  }

  // ==================== DIAGNOSTIC PROFILE OPERATIONS ====================

  async createDiagnosticProfile(data) {
    const {
      userId, hhNumber, centerName, location, phoneNumber,
      servicesOffered, accreditation
    } = data;

    const result = await query(
      `INSERT INTO diagnostic_profiles 
       (user_id, hh_number, center_name, location, phone_number,
        services_offered, accreditation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, hhNumber, centerName, location, phoneNumber,
        servicesOffered, accreditation]
    );
    return result.rows[0];
  }

  async getDiagnosticProfile(hhNumber) {
    const result = await query(
      `SELECT dp.*, u.wallet_address, u.email 
       FROM diagnostic_profiles dp
       JOIN users u ON dp.user_id = u.id
       WHERE dp.hh_number = $1`,
      [hhNumber]
    );
    return result.rows[0];
  }

  // ==================== RECORD INDEX OPERATIONS ====================

  async indexRecord(data) {
    const {
      recordId, patientWallet, patientHHNumber, creatorWallet,
      ipfsCid, recordType, metadata, searchableText, blockchainTxHash
    } = data;

    const result = await query(
      `INSERT INTO record_index 
       (record_id, patient_wallet, patient_hh_number, creator_wallet,
        ipfs_cid, record_type, metadata, searchable_text, blockchain_tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [recordId, patientWallet, patientHHNumber, creatorWallet,
        ipfsCid, recordType, metadata, searchableText, blockchainTxHash]
    );
    return result.rows[0];
  }

  async searchRecords(searchTerm, patientWallet = null, limit = 50) {
    let queryText = `
      SELECT * FROM record_index
      WHERE to_tsvector('english', searchable_text) @@ plainto_tsquery('english', $1)
    `;
    const params = [searchTerm];

    if (patientWallet) {
      queryText += ' AND patient_wallet = $2';
      params.push(patientWallet);
    }

    queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(queryText, params);
    return result.rows;
  }

  async getRecordsByPatient(patientWallet, limit = 50) {
    const result = await query(
      `SELECT ri.*, 
              CASE 
                WHEN ri.metadata IS NOT NULL THEN ri.metadata
                ELSE '{}'::jsonb
              END as metadata
       FROM record_index ri
       WHERE ri.patient_wallet = $1 
       ORDER BY ri.created_at DESC 
       LIMIT $2`,
      [patientWallet, limit]
    );

    // Log the query for debugging
    console.log(`🔍 Database query for patient records: patient_wallet = ${patientWallet}, limit = ${limit}`);
    console.log(`📊 Found ${result.rows.length} records in database`);

    return result.rows;
  }

  async getRecordsByPatientHH(patientHHNumber, limit = 50) {
    const result = await query(
      `SELECT ri.*, 
              CASE 
                WHEN ri.metadata IS NOT NULL THEN ri.metadata
                ELSE '{}'::jsonb
              END as metadata
       FROM record_index ri
       WHERE ri.patient_hh_number = $1 
       ORDER BY ri.created_at DESC 
       LIMIT $2`,
      [patientHHNumber, limit]
    );

    // Log the query for debugging
    console.log(`🔍 Database query for patient records by HH: patient_hh_number = ${patientHHNumber}, limit = ${limit}`);
    console.log(`📊 Found ${result.rows.length} records in database`);

    return result.rows;
  }

  // ==================== ACCESS LOG OPERATIONS ====================

  async logAccess(recordId, accessorWallet, accessorRole, action, ipAddress = null, userAgent = null) {
    const result = await query(
      `INSERT INTO access_logs 
       (record_id, accessor_wallet, accessor_role, action, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [recordId, accessorWallet, accessorRole, action, ipAddress, userAgent]
    );
    return result.rows[0];
  }

  async getAccessLogs(recordId, limit = 100) {
    const result = await query(
      `SELECT * FROM access_logs 
       WHERE record_id = $1 
       ORDER BY accessed_at DESC 
       LIMIT $2`,
      [recordId, limit]
    );
    return result.rows;
  }

  async getRecordByCID(cid) {
    const result = await query(
      `SELECT * FROM record_index 
       WHERE ipfs_cid = $1 
       LIMIT 1`,
      [cid]
    );
    return result.rows[0];
  }

  // ==================== DOCTOR-PATIENT ACCESS OPERATIONS ====================

  async grantDoctorAccess(doctorWallet, patientWallet, grantedBy) {
    const result = await query(
      `INSERT INTO doctor_patient_access 
       (doctor_wallet, patient_wallet, granted_by, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (doctor_wallet, patient_wallet) 
       DO UPDATE SET is_active = true, granted_at = CURRENT_TIMESTAMP, revoked_at = NULL
       RETURNING *`,
      [doctorWallet, patientWallet, grantedBy]
    );
    return result.rows[0];
  }

  async revokeDoctorAccess(doctorWallet, patientWallet) {
    const result = await query(
      `UPDATE doctor_patient_access 
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP
       WHERE doctor_wallet = $1 AND patient_wallet = $2
       RETURNING *`,
      [doctorWallet, patientWallet]
    );
    return result.rows[0];
  }

  async getDoctorPatients(doctorWallet) {
    const result = await query(
      `SELECT dpa.*, pp.full_name, pp.hh_number 
       FROM doctor_patient_access dpa
       LEFT JOIN patient_profiles pp ON dpa.patient_wallet = pp.user_id
       WHERE dpa.doctor_wallet = $1 AND dpa.is_active = true
       ORDER BY dpa.granted_at DESC`,
      [doctorWallet]
    );
    return result.rows;
  }

  // ==================== NOTIFICATION OPERATIONS ====================

  async createNotification(userWallet, title, message, type, relatedRecordId = null) {
    const result = await query(
      `INSERT INTO notifications 
       (user_wallet, title, message, type, related_record_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userWallet, title, message, type, relatedRecordId]
    );
    return result.rows[0];
  }

  async getNotifications(userWallet, unreadOnly = false, limit = 50) {
    let queryText = `
      SELECT * FROM notifications 
      WHERE user_wallet = $1
    `;

    if (unreadOnly) {
      queryText += ' AND is_read = false';
    }

    queryText += ' ORDER BY created_at DESC LIMIT $2';

    const result = await query(queryText, [userWallet, limit]);
    return result.rows;
  }

  async markNotificationAsRead(notificationId) {
    const result = await query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1
       RETURNING *`,
      [notificationId]
    );
    return result.rows[0];
  }

  async getPatientsForDoctor(doctorWallet, doctorHHNumber = null) {
    // If HH number is provided, use it for strict filtering (prevents cross-role contamination)
    // Otherwise fall back to wallet-only check for backward compatibility
    const hhNum = doctorHHNumber ? parseInt(doctorHHNumber) : null;
    const result = await query(
      `SELECT DISTINCT ON (u.hh_number)
        u.hh_number as patient_hh_number,
        pp.full_name,
        pp.blood_group,
        pp.gender,
        u.wallet_address,
        u.email,
        dpa.granted_at
       FROM doctor_patient_access dpa
       JOIN users u ON dpa.patient_hh_number = u.hh_number
       LEFT JOIN patient_profiles pp ON u.hh_number = pp.hh_number
       WHERE dpa.is_active = true
         AND u.role = 'patient'
         AND (
           ($2::integer IS NOT NULL AND dpa.doctor_hh_number = $2::integer) OR
           ($2::integer IS NULL AND LOWER(dpa.doctor_wallet) = LOWER($1))
         )
       ORDER BY u.hh_number, dpa.granted_at DESC`,
      [doctorWallet, hhNum]
    );
    return result.rows;
  }

  // ==================== UPDATE OPERATIONS (FOR BLOCKCHAIN SYNC) ====================

  async updatePatientProfile(hhNumber, data) {
    const { fullName, dateOfBirth, gender, bloodGroup, homeAddress } = data;
    const result = await query(
      `UPDATE patient_profiles 
       SET full_name = COALESCE($1, full_name),
           date_of_birth = COALESCE($2, date_of_birth),
           gender = COALESCE($3, gender),
           blood_group = COALESCE($4, blood_group),
           home_address = COALESCE($5, home_address),
           updated_at = CURRENT_TIMESTAMP
       WHERE hh_number = $6
       RETURNING *`,
      [fullName, dateOfBirth, gender, bloodGroup, homeAddress, hhNumber]
    );
    return result.rows[0];
  }

  async updateDoctorProfile(hhNumber, data) {
    const { fullName, specialization, hospital } = data;
    const result = await query(
      `UPDATE doctor_profiles 
       SET full_name = COALESCE($1, full_name),
           specialization = COALESCE($2, specialization),
           hospital = COALESCE($3, hospital),
           updated_at = CURRENT_TIMESTAMP
       WHERE hh_number = $4
       RETURNING *`,
      [fullName, specialization, hospital, hhNumber]
    );
    return result.rows[0];
  }

  async updateDiagnosticProfile(hhNumber, data) {
    const { centerName, location } = data;
    const result = await query(
      `UPDATE diagnostic_profiles 
       SET center_name = COALESCE($1, center_name),
           location = COALESCE($2, location),
           updated_at = CURRENT_TIMESTAMP
       WHERE hh_number = $3
       RETURNING *`,
      [centerName, location, hhNumber]
    );
    return result.rows[0];
  }

  async getRecordsByCreator(creatorType, creatorHHNumber) {
    const creator = await this.getUserByHHNumber(creatorHHNumber);
    if (!creator || creator.role !== creatorType) {
      return [];
    }

    // STRICT FILTERING: Filter by metadata->diagnosticHHNumber to get only records created by this specific diagnostic center
    // This prevents seeing records from other roles using the same wallet
    // Lenient filtering: Match by creator_wallet AND (metadata->diagnosticHHNumber OR record_type = 'diagnostic-report')
    // This allows seeded demo records (which might lack HH metadata) to appear if they match the wallet
    const result = await query(
      `SELECT ri.*, 
              CASE 
                WHEN ri.metadata IS NOT NULL THEN ri.metadata
                ELSE '{}'::jsonb
              END as metadata,
              pp.full_name as patient_name
       FROM record_index ri
       LEFT JOIN patient_profiles pp ON ri.patient_hh_number = pp.hh_number
       WHERE ri.creator_wallet = LOWER($1)
         AND (
           ri.metadata->>'diagnosticHHNumber' = $2::text 
           OR ri.record_type = 'diagnostic-report'
           OR ri.record_type = 'medical-record'
         )
       ORDER BY ri.created_at DESC`,
      [creator.wallet_address, creatorHHNumber.toString()]
    );
    return result.rows;
  }

  async deleteFLModel(modelId) {
    const result = await query(
      `UPDATE fl_models SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE model_id = $1 RETURNING *`,
      [modelId]
    );
    return result.rows[0];
  }
}

module.exports = new DatabaseService();
