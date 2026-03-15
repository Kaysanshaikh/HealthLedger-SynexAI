-- Migration: Create diagnostic_metrics table if it doesn't exist
-- Run this on NeonDB if the table is missing

-- Create the diagnostic_metrics table (for storing individual health metric values)
CREATE TABLE IF NOT EXISTS diagnostic_metrics (
    id SERIAL PRIMARY KEY,
    record_id VARCHAR(255) REFERENCES record_index(record_id) ON DELETE CASCADE,
    patient_hh_number BIGINT,
    disease_category VARCHAR(50) CHECK (disease_category IN ('diabetes', 'cvd', 'cancer', 'pneumonia', 'respiratory', 'general')),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast querying by the FL feature extractor
CREATE INDEX IF NOT EXISTS idx_diagnostic_metrics_disease ON diagnostic_metrics(disease_category);
CREATE INDEX IF NOT EXISTS idx_diagnostic_metrics_record ON diagnostic_metrics(record_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_metrics_patient ON diagnostic_metrics(patient_hh_number);

-- If the table already exists but has the old CHECK constraint, update it:
-- ALTER TABLE diagnostic_metrics DROP CONSTRAINT IF EXISTS diagnostic_metrics_disease_category_check;
-- ALTER TABLE diagnostic_metrics ADD CONSTRAINT diagnostic_metrics_disease_category_check 
--   CHECK (disease_category IN ('diabetes', 'cvd', 'cancer', 'pneumonia', 'respiratory', 'general'));
