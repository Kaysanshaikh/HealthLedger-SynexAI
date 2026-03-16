-- Migration to add advanced evaluation metrics to FL tables
-- This enables the "Model Evaluation" dashboard with real data

-- Add columns to fl_contributions
ALTER TABLE fl_contributions 
ADD COLUMN IF NOT EXISTS local_precision DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS local_recall DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS local_f1 DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS local_auc DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS local_cm JSONB;

-- Add columns to fl_rounds
ALTER TABLE fl_rounds
ADD COLUMN IF NOT EXISTS avg_precision DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS avg_recall DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS avg_f1 DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS avg_auc DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS confusion_matrix JSONB;

-- Add columns to fl_models for the latest global state
ALTER TABLE fl_models
ADD COLUMN IF NOT EXISTS precision DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS recall DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS f1_score DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS auc DECIMAL(5,4);

-- Update the view to include new metrics
DROP VIEW IF EXISTS v_model_performance;
CREATE VIEW v_model_performance AS
SELECT 
    m.model_id,
    m.disease,
    m.current_round,
    m.accuracy,
    m.loss,
    m.precision,
    m.recall,
    m.f1_score,
    m.auc,
    m.total_participants,
    r.status as current_round_status,
    COUNT(DISTINCT c.participant_address) as active_participants
FROM fl_models m
LEFT JOIN fl_rounds r ON m.model_id = r.model_id AND r.round_number = m.current_round
LEFT JOIN fl_contributions c ON r.round_id = c.round_id
GROUP BY m.model_id, m.disease, m.current_round, m.accuracy, m.loss, m.precision, m.recall, m.f1_score, m.auc, m.total_participants, r.status;
