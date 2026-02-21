/**
 * Validation Utilities for HealthLedger
 */

// Validate Ethereum wallet address
exports.isValidWalletAddress = (address) => {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Validate email
exports.isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate HH Number (should be positive integer)
exports.isValidHHNumber = (hhNumber) => {
  const num = parseInt(hhNumber);
  return !isNaN(num) && num > 0 && num <= 9999999999; // Max 10 digits
};

// Validate phone number
exports.isValidPhoneNumber = (phone) => {
  if (!phone) return true; // Optional field
  const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

// Validate date of birth
exports.isValidDOB = (dob) => {
  if (!dob) return false;
  const date = new Date(dob);
  const now = new Date();
  const minDate = new Date('1900-01-01');

  return date instanceof Date &&
    !isNaN(date) &&
    date < now &&
    date > minDate;
};

// Validate blood group
exports.isValidBloodGroup = (bloodGroup) => {
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return validGroups.includes(bloodGroup);
};

// Validate gender
exports.isValidGender = (gender) => {
  const validGenders = ['Male', 'Female', 'Other'];
  return validGenders.includes(gender);
};

// Sanitize string input
exports.sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, ''); // Remove potential HTML tags
};

// Validate patient registration data
exports.validatePatientRegistration = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!exports.isValidEmail(data.email)) {
    errors.push('Invalid email address');
  }

  if (!exports.isValidWalletAddress(data.walletAddress)) {
    errors.push('Invalid wallet address format');
  }

  if (!exports.isValidHHNumber(data.hhNumber)) {
    errors.push('Invalid HH Number (must be a positive number)');
  }

  if (!exports.isValidDOB(data.dob)) {
    errors.push('Invalid date of birth');
  }

  if (!exports.isValidBloodGroup(data.bloodGroup)) {
    errors.push('Invalid blood group');
  }

  if (!exports.isValidGender(data.gender)) {
    errors.push('Invalid gender');
  }

  if (!data.homeAddress || data.homeAddress.trim().length < 10) {
    errors.push('Home address must be at least 10 characters long');
  }

  if (data.phoneNumber && !exports.isValidPhoneNumber(data.phoneNumber)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate doctor registration data
exports.validateDoctorRegistration = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!exports.isValidEmail(data.email)) {
    errors.push('Invalid email address');
  }

  if (!exports.isValidWalletAddress(data.walletAddress)) {
    errors.push('Invalid wallet address format');
  }

  if (!exports.isValidHHNumber(data.hhNumber)) {
    errors.push('Invalid HH Number');
  }

  if (!data.specialization || data.specialization.trim().length < 2) {
    errors.push('Specialization is required');
  }

  if (!data.hospital || data.hospital.trim().length < 2) {
    errors.push('Hospital name is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate diagnostic center registration data
exports.validateDiagnosticRegistration = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Center name must be at least 2 characters long');
  }

  if (!exports.isValidEmail(data.email)) {
    errors.push('Invalid email address');
  }

  if (!exports.isValidWalletAddress(data.walletAddress)) {
    errors.push('Invalid wallet address format');
  }

  if (!exports.isValidHHNumber(data.hhNumber)) {
    errors.push('Invalid HH Number');
  }

  if (!data.location || data.location.trim().length < 5) {
    errors.push('Location is required (at least 5 characters)');
  }

  if (!data.servicesOffered || data.servicesOffered.trim().length < 2) {
    errors.push('Services offered is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get user-friendly error message
exports.getUserFriendlyError = (error) => {
  const errorMessage = error.message || error.toString();

  // Blockchain errors
  if (errorMessage.includes('already registered')) {
    return 'This HH Number is already registered. Please use a different number or login if this is your account.';
  }

  if (errorMessage.includes('Can only register yourself')) {
    return 'You can only register yourself or be an admin.';
  }

  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient funds in your wallet. Please add some MATIC tokens for gas fees.';
  }

  if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
    return 'Transaction was cancelled. Please try again when ready.';
  }

  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (errorMessage.includes('nonce')) {
    return 'Transaction error. Please refresh the page and try again.';
  }

  // Database errors
  if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
    return 'This record already exists in the system.';
  }

  if (errorMessage.includes('connection')) {
    return 'Database connection error. Please try again later.';
  }

  // Default error
  return 'An error occurred. Please try again or contact support if the problem persists.';
};

module.exports = exports;
