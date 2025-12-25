-- HealthLedger Integrated Database Schema (Base + Federated Learning)
-- Run this to create a fresh local database for complete development

-- Drop existing database if it exists (for clean start)
-- NOTE: If running on Neon via initNeonDB.js, DROP DATABASE will be skipped by the script
-- DROP DATABASE IF EXISTS healthledger_fl_local;
-- CREATE DATABASE healthledger_fl_local;
-- \c healthledger_fl_local;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BASE HEALTHLEDGER TABLES (from schema.sql)
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  email VARCHAR(255) UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'patient', 'diagnostic')),
  hh_number BIGINT UNIQUE,
  password_hash VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(wallet_address, role)
);

-- Patient profiles
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

-- Doctor profiles
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

-- Record index
CREATE TABLE IF NOT EXISTS record_index (
  id SERIAL PRIMARY KEY,
  record_id VARCHAR(255) UNIQUE NOT NULL,
  patient_wallet VARCHAR(42) NOT NULL,
  patient_hh_number BIGINT,
  creator_wallet VARCHAR(42) NOT NULL,
  ipfs_cid VARCHAR(255) NOT NULL,
  record_type VARCHAR(50), 
  metadata JSONB, 
  searchable_text TEXT, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  blockchain_tx_hash VARCHAR(66),
  CONSTRAINT fk_patient FOREIGN KEY (patient_hh_number) REFERENCES patient_profiles(hh_number) ON DELETE SET NULL
);

-- Access logs
CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  record_id VARCHAR(255) NOT NULL,
  accessor_wallet VARCHAR(42) NOT NULL,
  accessor_role VARCHAR(20),
  action VARCHAR(50) NOT NULL, 
  ip_address VARCHAR(45),
  user_agent TEXT,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctor-Patient relationships
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

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_wallet VARCHAR(42) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50), 
  is_read BOOLEAN DEFAULT false,
  related_record_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FEDERATED LEARNING TABLES
-- ============================================

-- FL Models registry
CREATE TABLE IF NOT EXISTS fl_models (
    model_id VARCHAR(66) PRIMARY KEY,
    disease VARCHAR(50) NOT NULL CHECK (disease IN ('diabetes', 'cvd', 'cancer', 'pneumonia')),
    model_type VARCHAR(50) NOT NULL, 
    current_round INTEGER DEFAULT 0,
    global_model_ipfs VARCHAR(100),
    accuracy DECIMAL(5,4),
    loss DECIMAL(10,6),
    total_participants INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_by VARCHAR(42) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FL Participants
CREATE TABLE IF NOT EXISTS fl_participants (
    participant_id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    institution_type VARCHAR(20) CHECK (institution_type IN ('hospital', 'diagnostic_center')),
    total_contributions INTEGER DEFAULT 0,
    total_rewards DECIMAL(18,8) DEFAULT 0,
    reputation_score DECIMAL(5,2) DEFAULT 100.00,
    is_active BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FL Rounds tracking
CREATE TABLE IF NOT EXISTS fl_rounds (
    round_id SERIAL PRIMARY KEY,
    model_id VARCHAR(66) REFERENCES fl_models(model_id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'initiated' CHECK (status IN ('initiated', 'training', 'aggregating', 'completed', 'failed')),
    min_participants INTEGER DEFAULT 2,
    current_participants INTEGER DEFAULT 0,
    aggregated_model_ipfs VARCHAR(100),
    aggregation_method VARCHAR(50) DEFAULT 'fedavg',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    timeout_at TIMESTAMP,
    UNIQUE(model_id, round_number)
);

-- Model contributions
CREATE TABLE IF NOT EXISTS fl_contributions (
    contribution_id SERIAL PRIMARY KEY,
    round_id INTEGER REFERENCES fl_rounds(round_id) ON DELETE CASCADE,
    participant_address VARCHAR(42) NOT NULL,
    model_update_ipfs VARCHAR(100) NOT NULL,
    zk_proof_hash VARCHAR(66),
    zk_proof_verified BOOLEAN DEFAULT FALSE,
    local_accuracy DECIMAL(5,4),
    local_loss DECIMAL(10,6),
    samples_trained INTEGER,
    training_time INTEGER, 
    gas_used BIGINT,
    blockchain_tx_hash VARCHAR(66),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP
);

-- Training metrics
CREATE TABLE IF NOT EXISTS fl_metrics (
    metric_id SERIAL PRIMARY KEY,
    round_id INTEGER REFERENCES fl_rounds(round_id) ON DELETE CASCADE,
    participant_address VARCHAR(42),
    metric_type VARCHAR(50) NOT NULL, 
    metric_value DECIMAL(10,6) NOT NULL,
    dataset_split VARCHAR(20), 
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Byzantine attack detection logs
CREATE TABLE IF NOT EXISTS fl_security_logs (
    log_id SERIAL PRIMARY KEY,
    round_id INTEGER REFERENCES fl_rounds(round_id) ON DELETE CASCADE,
    participant_address VARCHAR(42) NOT NULL,
    attack_type VARCHAR(50), 
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_taken TEXT,
    resolved BOOLEAN DEFAULT FALSE
);

-- ZK Proof verification cache
CREATE TABLE IF NOT EXISTS zk_proof_cache (
    proof_id SERIAL PRIMARY KEY,
    proof_hash VARCHAR(66) UNIQUE NOT NULL,
    public_inputs JSONB,
    verification_result BOOLEAN NOT NULL,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gas_cost BIGINT
);

-- Rewards and incentives
CREATE TABLE IF NOT EXISTS fl_rewards (
    reward_id SERIAL PRIMARY KEY,
    contribution_id INTEGER REFERENCES fl_contributions(contribution_id) ON DELETE CASCADE,
    participant_address VARCHAR(42) NOT NULL,
    reward_amount DECIMAL(18,8) NOT NULL,
    reward_type VARCHAR(50), 
    blockchain_tx_hash VARCHAR(66),
    distributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_hh_number ON users(hh_number);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_hh ON patient_profiles(hh_number);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_hh ON doctor_profiles(hh_number);
CREATE INDEX IF NOT EXISTS idx_diagnostic_profiles_hh ON diagnostic_profiles(hh_number);
CREATE INDEX IF NOT EXISTS idx_fl_models_disease ON fl_models(disease);
CREATE INDEX IF NOT EXISTS idx_fl_rounds_model_id ON fl_rounds(model_id);
CREATE INDEX IF NOT EXISTS idx_record_searchable_text ON record_index USING gin(to_tsvector('english', searchable_text));

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW v_model_performance AS
SELECT 
    m.model_id,
    m.disease,
    m.current_round,
    m.accuracy,
    m.loss,
    m.total_participants,
    r.status as current_round_status,
    COUNT(DISTINCT c.participant_address) as active_participants
FROM fl_models m
LEFT JOIN fl_rounds r ON m.model_id = r.model_id AND r.round_number = m.current_round
LEFT JOIN fl_contributions c ON r.round_id = c.round_id
GROUP BY m.model_id, m.disease, m.current_round, m.accuracy, m.loss, m.total_participants, r.status;

CREATE OR REPLACE VIEW v_participant_leaderboard AS
SELECT 
    p.participant_id,
    p.wallet_address,
    p.institution_name,
    p.total_contributions,
    p.total_rewards,
    p.reputation_score,
    COUNT(DISTINCT c.round_id) as rounds_participated,
    AVG(c.local_accuracy) as avg_accuracy
FROM fl_participants p
LEFT JOIN fl_contributions c ON p.wallet_address = c.participant_address
GROUP BY p.participant_id, p.wallet_address, p.institution_name, p.total_contributions, p.total_rewards, p.reputation_score
ORDER BY p.reputation_score DESC, p.total_contributions DESC;

-- ============================================
-- SAMPLE DATA
-- ============================================

INSERT INTO users (wallet_address, email, role, hh_number) VALUES
('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'admin@healthledger.local', 'admin', 999999)
ON CONFLICT DO NOTHING;

INSERT INTO fl_participants (wallet_address, institution_name, institution_type) VALUES
('0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 'City General Hospital', 'hospital'),
('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 'Metro Diagnostic Center', 'diagnostic_center'),
('0x90F79bf6EB2c4f870365E785982E1f101E93b906', 'Regional Medical Center', 'hospital')
ON CONFLICT DO NOTHING;
