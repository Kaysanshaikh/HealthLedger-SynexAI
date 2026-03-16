-- HealthLedger Database Schema
-- This schema complements the blockchain smart contract with off-chain data

-- Users table: Store user authentication and profile data
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'patient', 'diagnostic')),
  hh_number BIGINT UNIQUE,
  password_hash VARCHAR(255), -- For optional email/password login
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient profiles: Extended patient information
CREATE TABLE IF NOT EXISTS patient_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  hh_number BIGINT UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20),
  blood_group VARCHAR(10),
  home_address TEXT,
  phone_number VARCHAR(20),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  allergies TEXT,
  chronic_conditions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctor profiles: Extended doctor information
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  hh_number BIGINT UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  specialization VARCHAR(255) NOT NULL,
  hospital VARCHAR(255),
  license_number VARCHAR(100),
  phone_number VARCHAR(20),
  years_of_experience INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Diagnostic center profiles
CREATE TABLE IF NOT EXISTS diagnostic_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  hh_number BIGINT UNIQUE NOT NULL,
  center_name VARCHAR(255) NOT NULL,
  location TEXT NOT NULL,
  phone_number VARCHAR(20),
  services_offered TEXT,
  accreditation VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record index: Fast search and metadata for blockchain records
CREATE TABLE IF NOT EXISTS record_index (
  id SERIAL PRIMARY KEY,
  record_id VARCHAR(255) UNIQUE NOT NULL,
  patient_wallet VARCHAR(42) NOT NULL,
  patient_hh_number BIGINT,
  creator_wallet VARCHAR(42) NOT NULL,
  ipfs_cid VARCHAR(255) NOT NULL,
  record_type VARCHAR(50), -- e.g., 'diagnostic', 'prescription', 'consultation'
  metadata JSONB, -- Flexible JSON storage for additional data
  searchable_text TEXT, -- Full-text search field
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  blockchain_tx_hash VARCHAR(66), -- Transaction hash from blockchain
  CONSTRAINT fk_patient FOREIGN KEY (patient_hh_number) REFERENCES patient_profiles(hh_number) ON DELETE SET NULL
);

-- Access logs: Track who accessed which records (audit trail)
CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  record_id VARCHAR(255) NOT NULL,
  accessor_wallet VARCHAR(42) NOT NULL,
  accessor_role VARCHAR(20),
  action VARCHAR(50) NOT NULL, -- 'view', 'grant', 'revoke', 'update'
  ip_address VARCHAR(45),
  user_agent TEXT,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctor-Patient relationships: Track access grants
CREATE TABLE IF NOT EXISTS doctor_patient_access (
  id SERIAL PRIMARY KEY,
  doctor_wallet VARCHAR(42) NOT NULL,
  patient_wallet VARCHAR(42) NOT NULL,
  doctor_hh_number VARCHAR(10) NOT NULL,
  patient_hh_number VARCHAR(10) NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by VARCHAR(42) NOT NULL,
  revoked_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(doctor_hh_number, patient_hh_number)
);

-- Notifications: System notifications for users
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_wallet VARCHAR(42) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50), -- 'access_granted', 'record_created', 'access_revoked'
  is_read BOOLEAN DEFAULT false,
  related_record_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_hh_number ON users(hh_number);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_hh ON patient_profiles(hh_number);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_hh ON doctor_profiles(hh_number);
CREATE INDEX IF NOT EXISTS idx_diagnostic_profiles_hh ON diagnostic_profiles(hh_number);
CREATE INDEX IF NOT EXISTS idx_record_index_record_id ON record_index(record_id);
CREATE INDEX IF NOT EXISTS idx_record_index_patient ON record_index(patient_wallet);
CREATE INDEX IF NOT EXISTS idx_record_index_creator ON record_index(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_record_index_created_at ON record_index(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_record_id ON access_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessor ON access_logs(accessor_wallet);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON access_logs(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_doctor ON doctor_patient_access(doctor_wallet);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_patient ON doctor_patient_access(patient_wallet);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_doctor_hh ON doctor_patient_access(doctor_hh_number);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_patient_hh ON doctor_patient_access(patient_hh_number);
CREATE INDEX IF NOT EXISTS idx_notifications_wallet ON notifications(user_wallet);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Full-text search index for record_index
CREATE INDEX IF NOT EXISTS idx_record_searchable_text ON record_index USING gin(to_tsvector('english', searchable_text));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_profiles_updated_at BEFORE UPDATE ON patient_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_profiles_updated_at BEFORE UPDATE ON doctor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagnostic_profiles_updated_at BEFORE UPDATE ON diagnostic_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Federated Learning Rewards
CREATE TABLE IF NOT EXISTS fl_rewards (
    reward_id SERIAL PRIMARY KEY,
    contribution_id INTEGER, -- Link to contribution (optional cascade if linked to rounds)
    participant_address VARCHAR(42) NOT NULL,
    reward_amount DECIMAL(18,8) NOT NULL,
    reward_type VARCHAR(50), 
    blockchain_tx_hash VARCHAR(66),
    distributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
