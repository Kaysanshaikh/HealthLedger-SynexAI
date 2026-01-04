const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const healthLedgerService = require("../services/healthLedgerService");
const db = require("../services/databaseService");

const ROLE_DOCTOR = "doctor";

exports.login = async (req, res) => {
  try {
    const { role, hhNumber, walletAddress, signature, message } = req.body || {};

    console.log("🔐 Login attempt:", { role, hhNumber, walletAddress: walletAddress?.substring(0, 10) + "..." });

    if (!role || !hhNumber || !walletAddress || !signature || !message) {
      return res.status(400).json({ error: "Missing required login fields" });
    }

    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const normalizedRole = role.toLowerCase();
    console.log("✅ Signature verified. Role:", normalizedRole);
    if (normalizedRole === ROLE_DOCTOR) {
      try {
        const isDoctor = await healthLedgerService.hasDoctorRole(walletAddress);
        if (!isDoctor) {
          return res.status(403).json({ error: `Wallet does not have the 'doctor' role.` });
        }
      } catch (roleError) {
        console.error("⚠️ Error checking doctor role on blockchain:", roleError.message);
        console.log("⚠️ Skipping blockchain role check - using database only");
        // Skip blockchain check and rely on database registration
      }
    }

    // Find user by wallet AND role
    let userRow = await db.getUserByWalletAndRole(walletAddress, normalizedRole);

    // Special case: Auto-create/update admin if wallet matches ADMIN_ADDRESS from env
    if (!userRow && normalizedRole === 'admin') {
      const adminAddress = process.env.ADMIN_ADDRESS;
      if (adminAddress && walletAddress.toLowerCase() === adminAddress.toLowerCase()) {
        console.log("🔧 Auto-creating/updating admin account for ADMIN_ADDRESS");
        try {
          // Try to find existing admin by HH number
          const existingAdmin = await db.getUserByHHNumber(999999);
          if (existingAdmin && existingAdmin.role === 'admin') {
            // Update existing admin's wallet address
            console.log("📝 Updating existing admin wallet address");
            await db.query(
              'UPDATE users SET wallet_address = $1 WHERE hh_number = $2 AND role = $3',
              [walletAddress, 999999, 'admin']
            );
            userRow = await db.getUserByWalletAndRole(walletAddress, 'admin');
          } else {
            // Create new admin
            const uniqueEmail = `admin_${walletAddress.substring(2, 10)}@healthledger.local`;
            userRow = await db.createUser(walletAddress, uniqueEmail, 'admin', 999999);
          }
        } catch (createError) {
          console.error("⚠️ Admin creation/update error:", createError.message);
        }
      }
    }

    if (!userRow) {
      return res.status(401).json({
        error: `No ${normalizedRole} account found for this wallet. Please register first.`
      });
    }

    const user = {
      hhNumber: userRow.hh_number,
      walletAddress,
      role: normalizedRole,
    };

    // Generate a secure JWT
    const token = jwt.sign(
      {
        id: userRow.id,
        hhNumber: userRow.hh_number,
        walletAddress: userRow.wallet_address,
        role: userRow.role
      },
      process.env.JWT_SECRET || 'hl_fallback_secret',
      { expiresIn: '24h' }
    );

    console.log("✅ Login successful, returning JWT and user");

    return res.json({ token, user });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Unable to process login" });
  }
};

// The following endpoints are simplified and do not fetch full user profiles.
// This is a temporary measure until a proper user profile solution is implemented.

exports.getPatient = async (req, res) => {
  try {
    const { hhNumber } = req.params;
    console.log("📋 Fetching patient profile for HH Number:", hhNumber);

    // Get user from database
    const user = await db.getUserByHHNumber(parseInt(hhNumber));
    console.log("👤 User found:", user ? `${user.email} (${user.role})` : 'NOT FOUND');

    if (!user) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Get profile from database
    const profile = await db.getPatientProfile(parseInt(hhNumber));
    console.log("📄 Profile found:", profile ? `${profile.full_name}` : 'NOT FOUND');

    // Return database data directly (skip blockchain for now to match working doctor profile)
    const patientDetails = {
      hhNumber: user.hh_number,
      walletAddress: user.wallet_address,
      email: user.email || '',
      name: profile?.full_name || 'Patient',
      dob: profile?.date_of_birth ? Math.floor(new Date(profile.date_of_birth).getTime() / 1000) : 0,
      gender: profile?.gender || 'Not specified',
      bloodGroup: profile?.blood_group || 'Not specified',
      homeAddress: profile?.home_address || 'Not specified',
      // Additional fields from database
      phoneNumber: profile?.phone_number || '',
      emergencyContactName: profile?.emergency_contact_name || '',
      emergencyContactPhone: profile?.emergency_contact_phone || '',
      allergies: profile?.allergies || '',
      chronicConditions: profile?.chronic_conditions || ''
    };

    console.log("✅ Patient profile fetched from database:", patientDetails);
    return res.json({ patient: patientDetails });

  } catch (error) {
    console.error("❌ Failed to load patient profile:", error);
    res.status(500).json({ error: "Failed to load patient profile: " + error.message });
  }
};

exports.getDoctor = async (req, res) => {
  try {
    const { hhNumber } = req.params;
    console.log("👨‍⚕️ Fetching doctor profile for HH Number:", hhNumber);

    // Try blockchain first (source of truth)
    try {
      const blockchainData = await healthLedgerService.getDoctor(hhNumber);
      console.log("✅ Doctor profile fetched from blockchain:", blockchainData);

      // Get additional data from database (email, etc.)
      const user = await db.getUserByHHNumber(parseInt(hhNumber));
      const profile = await db.getDoctorProfile(parseInt(hhNumber));

      // Combine blockchain data (primary) with database data (supplementary)
      const doctorDetails = {
        ...blockchainData,
        email: user?.email || '',
        // Use database as fallback if blockchain data is incomplete
        name: blockchainData.name || profile?.full_name || 'Dr.',
        specialization: blockchainData.specialization || profile?.specialization || '',
        hospital: blockchainData.hospital || profile?.hospital || '',
        licenseNumber: profile?.license_number || '',
        // Additional fields from database
        phoneNumber: profile?.phone_number || '',
        yearsOfExperience: profile?.years_of_experience || 0
      };

      return res.json({ doctor: doctorDetails });
    } catch (blockchainError) {
      console.warn("⚠️ Blockchain unavailable, using database cache:", blockchainError.message);

      // Fallback to database if blockchain is unavailable
      const user = await db.getUserByHHNumber(parseInt(hhNumber));
      if (!user) {
        return res.status(404).json({ error: "Doctor not found" });
      }

      const profile = await db.getDoctorProfile(parseInt(hhNumber));

      const doctorDetails = {
        hhNumber: user.hh_number,
        walletAddress: user.wallet_address,
        email: user.email,
        name: profile?.full_name || 'Dr.',
        specialization: profile?.specialization || '',
        hospital: profile?.hospital || '',
        licenseNumber: profile?.license_number || '',
        // Additional fields from database
        phoneNumber: profile?.phone_number || '',
        yearsOfExperience: profile?.years_of_experience || 0
      };

      console.log("✅ Doctor profile fetched from database cache:", doctorDetails);
      return res.json({ doctor: doctorDetails, cached: true });
    }
  } catch (error) {
    console.error("❌ Get doctor error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getDoctorPatients = async (req, res) => {
  try {
    const { hhNumber } = req.params;
    console.log("📋 Fetching patients for doctor HH Number:", hhNumber);

    // First get the doctor's wallet address from their profile
    const doctorDetails = await healthLedgerService.getDoctor(hhNumber);
    const doctorAddress = doctorDetails.walletAddress;
    console.log("👨‍⚕️ Doctor wallet address:", doctorAddress);

    const patientRecordIds = await healthLedgerService.getDoctorPatients(doctorAddress);
    console.log("✅ Patient record IDs:", patientRecordIds);
    res.json({ patients: patientRecordIds });
  } catch (error) {
    console.error("❌ Failed to load doctor patients:", error);
    res.status(500).json({ error: "Failed to load doctor patients: " + error.message });
  }
};

exports.getDiagnostic = async (req, res) => {
  try {
    const { hhNumber } = req.params;
    console.log("🔬 Fetching diagnostic profile for HH Number:", hhNumber);

    // Try blockchain first (source of truth)
    try {
      const blockchainData = await healthLedgerService.getDiagnostic(hhNumber);
      console.log("✅ Diagnostic profile fetched from blockchain:", blockchainData);

      // Get additional data from database (email, etc.)
      const user = await db.getUserByHHNumber(parseInt(hhNumber));
      const profile = await db.getDiagnosticProfile(parseInt(hhNumber));

      // Combine blockchain data (primary) with database data (supplementary)
      const diagnosticDetails = {
        ...blockchainData,
        email: user?.email || '',
        // Use database as fallback if blockchain data is incomplete
        name: blockchainData.name || profile?.center_name || 'Diagnostic Center',
        location: blockchainData.location || profile?.location || '',
        // Additional fields from database
        phoneNumber: profile?.phone_number || '',
        servicesOffered: profile?.services_offered || '',
        accreditation: profile?.accreditation || ''
      };

      return res.json({ diagnostic: diagnosticDetails });
    } catch (blockchainError) {
      console.warn("⚠️ Blockchain unavailable, using database cache:", blockchainError.message);

      // Fallback to database if blockchain is unavailable
      const user = await db.getUserByHHNumber(parseInt(hhNumber));
      if (!user) {
        return res.status(404).json({ error: "Diagnostic center not found" });
      }

      const profile = await db.getDiagnosticProfile(parseInt(hhNumber));

      const diagnosticDetails = {
        hhNumber: user.hh_number,
        walletAddress: user.wallet_address,
        email: user.email,
        name: profile?.center_name || 'Diagnostic Center',
        location: profile?.location || '',
        // Additional fields from database
        phoneNumber: profile?.phone_number || '',
        servicesOffered: profile?.services_offered || '',
        accreditation: profile?.accreditation || ''
      };

      console.log("✅ Diagnostic profile fetched from database cache:", diagnosticDetails);
      return res.json({ diagnostic: diagnosticDetails, cached: true });
    }
  } catch (error) {
    console.error("❌ Get diagnostic error:", error);
    res.status(500).json({ error: error.message });
  }
};
