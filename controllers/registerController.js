const healthLedgerService = require("../services/healthLedgerService");
const db = require("../services/databaseService");
const validation = require("../utils/validation");

exports.registerPatient = async (req, res) => {
  try {
    const { name, dob, gender, bloodGroup, homeAddress, email, hhNumber, walletAddress, phoneNumber } = req.body;

    // Validate all fields
    const validationResult = validation.validatePatientRegistration(req.body);
    if (!validationResult.isValid) {
      return res.status(400).json({
        error: "Validation failed",
        errors: validationResult.errors
      });
    }

    console.log(`🔍 Checking if HH Number ${hhNumber} is available...`);

    // Check if HH number is already used in DATABASE (HH numbers must be unique)
    const existingHHNumber = await db.getUserByHHNumber(parseInt(hhNumber));
    if (existingHHNumber) {
      console.log(`⚠️ HH Number ${hhNumber} already exists in database as ${existingHHNumber.role}`);
      return res.status(400).json({
        error: `This HH Number is already registered as a ${existingHHNumber.role}. Please use a unique 6-digit HH Number.`,
        field: "hhNumber"
      });
    }

    console.log(`✅ HH Number ${hhNumber} is available in database`);

    // Check if wallet is already registered for this SPECIFIC role
    const existingUserWithRole = await db.getUserByWalletAndRole(walletAddress, 'patient');
    if (existingUserWithRole) {
      console.log(`⚠️ Wallet ${walletAddress} already registered as patient`);
      return res.status(400).json({
        error: "This wallet is already registered as a patient. Please login instead.",
        isRegistered: true,
        redirectTo: "/login"
      });
    }

    // Note: Same wallet can be used for different roles (e.g., patient + doctor)

    console.log("📝 Registering patient:", { name, hhNumber, walletAddress });

    // 1. Register on blockchain (source of truth)
    const tx = await healthLedgerService.registerPatient(name, dob, gender, bloodGroup, homeAddress, email, hhNumber, walletAddress);
    const receipt = await tx.wait();

    console.log("✅ Blockchain registration successful");

    // 2. Sync to database (cache for fast queries)
    // Create user in database
    const user = await db.createUser(walletAddress, email, 'patient', hhNumber);

    // Create patient profile in database
    const profile = await db.createPatientProfile({
      userId: user.id,
      hhNumber: hhNumber,
      fullName: name,
      dateOfBirth: dob,
      gender: gender,
      bloodGroup: bloodGroup,
      homeAddress: homeAddress,
      phoneNumber: phoneNumber || null,
      emergencyContactName: req.body.emergencyContactName || null,
      emergencyContactPhone: req.body.emergencyContactPhone || null,
      allergies: req.body.allergies || null,
      chronicConditions: req.body.chronicConditions || null
    });

    console.log("✅ Database profile created");

    // 4. Create welcome notification
    await db.createNotification(
      walletAddress,
      'Welcome to HealthLedger',
      'Your patient account has been successfully created',
      'registration',
      null
    );

    res.status(201).json({
      message: "Patient registered successfully",
      user: {
        id: user.id,
        wallet: user.wallet_address,
        email: user.email,
        role: user.role
      },
      profile: {
        name: profile.full_name,
        hhNumber: profile.hh_number,
        bloodGroup: profile.blood_group
      },
      txHash: tx.hash
    });
  } catch (error) {
    console.error("❌ Register patient error:", error);

    // Check if it's a "record already exists" error from blockchain
    if (error.message && error.message.includes('already exists')) {
      return res.status(400).json({
        error: "This HH Number is already registered on the blockchain. If you don't see it in the system, the database may be out of sync. Please contact support or try logging in.",
        hint: "Run: npm run sync:blockchain patient " + hhNumber,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Get user-friendly error message
    const userMessage = validation.getUserFriendlyError(error);

    res.status(500).json({
      error: userMessage,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.registerDoctor = async (req, res) => {
  try {
    const { name, specialization, hospital, email, hhNumber, walletAddress, phoneNumber, licenseNumber, yearsOfExperience } = req.body;

    // Validate all fields
    const validationResult = validation.validateDoctorRegistration(req.body);
    if (!validationResult.isValid) {
      return res.status(400).json({
        error: "Validation failed",
        errors: validationResult.errors
      });
    }

    console.log(`🔍 Checking if HH Number ${hhNumber} is available...`);

    // Check if HH number is already used in DATABASE (HH numbers must be unique)
    const existingHHNumber = await db.getUserByHHNumber(parseInt(hhNumber));
    if (existingHHNumber) {
      console.log(`⚠️ HH Number ${hhNumber} already exists in database as ${existingHHNumber.role}`);
      return res.status(400).json({
        error: `This HH Number is already registered as a ${existingHHNumber.role}. Please use a unique 6-digit HH Number.`,
        field: "hhNumber"
      });
    }

    console.log(`✅ HH Number ${hhNumber} is available in database`);

    // Check if wallet is already registered for this SPECIFIC role
    const existingUserWithRole = await db.getUserByWalletAndRole(walletAddress, 'doctor');
    if (existingUserWithRole) {
      console.log(`⚠️ Wallet ${walletAddress} already registered as doctor`);
      return res.status(400).json({
        error: "This wallet is already registered as a doctor. Please login instead.",
        isRegistered: true,
        redirectTo: "/login"
      });
    }

    // Note: Same wallet can be used for different roles (e.g., patient + doctor)

    console.log("📝 Registering doctor:", { name, hhNumber, walletAddress });

    // 1. Register on blockchain
    const tx = await healthLedgerService.registerDoctor(name, specialization, hospital, email, hhNumber, walletAddress);
    await tx.wait();

    console.log("✅ Blockchain registration successful");

    // 2. Create user in database
    const user = await db.createUser(walletAddress, email, 'doctor', hhNumber);

    // 3. Create doctor profile in database
    const profile = await db.createDoctorProfile({
      userId: user.id,
      hhNumber: hhNumber,
      fullName: name,
      specialization: specialization,
      hospital: hospital,
      licenseNumber: licenseNumber || null,
      phoneNumber: phoneNumber || null,
      yearsOfExperience: yearsOfExperience || null
    });

    console.log("✅ Database profile created");

    // 4. Create welcome notification
    await db.createNotification(
      walletAddress,
      'Welcome to HealthLedger',
      'Your doctor account has been successfully created',
      'registration',
      null
    );

    res.status(201).json({
      message: "Doctor registered successfully",
      user: {
        id: user.id,
        wallet: user.wallet_address,
        email: user.email,
        role: user.role
      },
      profile: {
        name: profile.full_name,
        hhNumber: profile.hh_number,
        specialization: profile.specialization,
        hospital: profile.hospital
      },
      txHash: tx.hash
    });
  } catch (error) {
    console.error("❌ Register doctor error:", error);

    // Check if it's a "record already exists" error from blockchain
    if (error.message && error.message.includes('already exists')) {
      return res.status(400).json({
        error: "This HH Number is already registered on the blockchain. If you don't see it in the system, the database may be out of sync. Please contact support or try logging in.",
        hint: "Run: npm run sync:blockchain doctor " + hhNumber,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Get user-friendly error message
    const userMessage = validation.getUserFriendlyError(error);

    res.status(500).json({
      error: userMessage,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.registerDiagnostic = async (req, res) => {
  try {
    const { name, location, email, hhNumber, walletAddress, phoneNumber, servicesOffered, accreditation } = req.body;

    // Validate all fields
    const validationResult = validation.validateDiagnosticRegistration(req.body);
    if (!validationResult.isValid) {
      return res.status(400).json({
        error: "Validation failed",
        errors: validationResult.errors
      });
    }

    console.log(`🔍 Checking if HH Number ${hhNumber} is available...`);

    // Check if HH number is already used in DATABASE (HH numbers must be unique)
    const existingHHNumber = await db.getUserByHHNumber(parseInt(hhNumber));
    if (existingHHNumber) {
      console.log(`⚠️ HH Number ${hhNumber} already exists in database as ${existingHHNumber.role}`);
      return res.status(400).json({
        error: `This HH Number is already registered as a ${existingHHNumber.role}. Please use a unique 6-digit HH Number.`,
        field: "hhNumber"
      });
    }

    console.log(`✅ HH Number ${hhNumber} is available in database`);

    // Check if wallet is already registered for this SPECIFIC role
    const existingUserWithRole = await db.getUserByWalletAndRole(walletAddress, 'diagnostic');
    if (existingUserWithRole) {
      console.log(`⚠️ Wallet ${walletAddress} already registered as diagnostic center`);
      return res.status(400).json({
        error: "This wallet is already registered as a diagnostic center. Please login instead.",
        isRegistered: true,
        redirectTo: "/login"
      });
    }

    console.log("📝 Registering diagnostic center:", { name, hhNumber, walletAddress });

    // 1. Register on blockchain
    const tx = await healthLedgerService.registerDiagnostic(name, location, email, hhNumber, walletAddress);
    await tx.wait();

    console.log("✅ Blockchain registration successful");

    // 2. Create user in database
    const user = await db.createUser(walletAddress, email, 'diagnostic', hhNumber);

    // 3. Create diagnostic profile in database
    const profile = await db.createDiagnosticProfile({
      userId: user.id,
      hhNumber: hhNumber,
      centerName: name,
      location: location,
      phoneNumber: phoneNumber || null,
      servicesOffered: servicesOffered || null,
      accreditation: accreditation || null
    });

    console.log("✅ Database profile created");

    // 4. Create welcome notification
    await db.createNotification(
      walletAddress,
      'Welcome to HealthLedger',
      'Your diagnostic center account has been successfully created',
      'registration',
      null
    );

    res.status(201).json({
      message: "Diagnostic center registered successfully",
      user: {
        id: user.id,
        wallet: user.wallet_address,
        email: user.email,
        role: user.role
      },
      profile: {
        name: profile.center_name,
        hhNumber: profile.hh_number,
        location: profile.location
      },
      txHash: tx.hash
    });
  } catch (error) {
    console.error("❌ Register diagnostic error:", error);

    // Check if it's a "record already exists" error from blockchain
    if (error.message && error.message.includes('already exists')) {
      return res.status(400).json({
        error: "This HH Number is already registered on the blockchain. If you don't see it in the system, the database may be out of sync.",
        hint: "Run: npm run sync:blockchain diagnostic " + hhNumber,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Get user-friendly error message
    const userMessage = validation.getUserFriendlyError(error);

    res.status(500).json({
      error: userMessage,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
