/**
 * Medical Record Feature Extractor
 * Privacy-preserving service that converts structured diagnostic metrics
 * into anonymized feature vectors for federated learning.
 * 
 * NO PII (names, HH numbers, addresses) touches the ML pipeline.
 * Only numeric health values are extracted.
 */

const { query } = require("../config/database");

// Feature columns expected by each disease model (must match kaggle_loader.py column order)
const DISEASE_FEATURE_MAPS = {
    diabetes: {
        columns: ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'],
        metricMapping: {
            'Pregnancies': 'Pregnancies',
            'Glucose': 'Glucose',
            'Blood Pressure': 'BloodPressure',
            'Blood Pressure Systolic': 'BloodPressure', // Alias from lifestyle preset
            'Skin Thickness': 'SkinThickness',
            'Insulin': 'Insulin',
            'BMI': 'BMI',
            'Diabetes Pedigree Function': 'DiabetesPedigreeFunction',
            'HbA1c': null, // Extra metric, not in base Kaggle set but valuable
            'Age': 'Age'
        }
    },
    cvd: {
        columns: ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak'],
        metricMapping: {
            'Age': 'age',
            'Sex': 'sex',
            'Chest Pain Type': 'cp',
            'Resting Blood Pressure': 'trestbps',
            'Cholesterol': 'chol',
            'Fasting Blood Sugar': 'fbs',
            'Resting ECG': 'restecg',
            'Max Heart Rate': 'thalach',
            'Exercise Angina': 'exang',
            'ST Depression': 'oldpeak'
        }
    },
    cancer: {
        columns: ['radius_mean', 'texture_mean', 'perimeter_mean', 'area_mean', 'smoothness_mean', 'compactness_mean', 'concavity_mean', 'symmetry_mean', 'fractal_dimension_mean'],
        metricMapping: {
            'Radius Mean': 'radius_mean',
            'Texture Mean': 'texture_mean',
            'Perimeter Mean': 'perimeter_mean',
            'Area Mean': 'area_mean',
            'Smoothness Mean': 'smoothness_mean',
            'Compactness Mean': 'compactness_mean',
            'Concavity Mean': 'concavity_mean',
            'Symmetry Mean': 'symmetry_mean',
            'Fractal Dimension Mean': 'fractal_dimension_mean'
        }
    },
    pneumonia: {
        columns: ['FEV1', 'FVC', 'SpO2', 'respiratory_rate', 'temperature', 'age'],
        metricMapping: {
            'FEV1': 'FEV1',
            'FVC': 'FVC',
            'SpO2': 'SpO2',
            'Respiratory Rate': 'respiratory_rate',
            'Temperature': 'temperature',
            'Age': 'age'
        }
    }
};

/**
 * Extract anonymized features for a disease from diagnostic_metrics table
 * @param {string} disease - Disease type (diabetes, cvd, cancer)
 * @returns {Object} { features: number[][], featureNames: string[], recordCount: number, patientCount: number }
 */
async function extractFeaturesForDisease(disease) {
    const featureMap = DISEASE_FEATURE_MAPS[disease];
    if (!featureMap) {
        throw new Error(`No feature map defined for disease: ${disease}`);
    }

    // Map disease to its category in the diagnostic_metrics table
    const diseaseToCategory = {
        'diabetes': 'diabetes',
        'cvd': 'cvd',
        'cancer': 'cancer',
        'pneumonia': 'pneumonia'
    };
    const category = diseaseToCategory[disease];
    if (!category) {
        throw new Error(`No disease category mapping for: ${disease}`);
    }

    // Fetch all metrics for this disease category, grouped by record
    const result = await query(
        `SELECT record_id, metric_name, metric_value 
         FROM diagnostic_metrics 
         WHERE disease_category = $1
         ORDER BY record_id, metric_name`,
        [category]
    );

    if (result.rows.length === 0) {
        return { features: [], featureNames: featureMap.columns, recordCount: 0, patientCount: 0 };
    }

    // Group metrics by record_id
    const recordMetrics = {};
    for (const row of result.rows) {
        if (!recordMetrics[row.record_id]) {
            recordMetrics[row.record_id] = {};
        }
        recordMetrics[row.record_id][row.metric_name] = parseFloat(row.metric_value);
    }

    // Convert to feature vectors (only include records with sufficient features)
    const features = [];
    const minFeatureRatio = 0.5; // Need at least 50% of features filled
    const requiredFeatures = Math.ceil(featureMap.columns.length * minFeatureRatio);

    for (const [recordId, metrics] of Object.entries(recordMetrics)) {
        const featureVector = [];
        let filledCount = 0;

        for (const column of featureMap.columns) {
            // Find which metric name maps to this column
            let value = null;
            for (const [metricName, colName] of Object.entries(featureMap.metricMapping)) {
                if (colName === column && metrics[metricName] !== undefined) {
                    value = metrics[metricName];
                    break;
                }
            }

            if (value !== null) {
                featureVector.push(value);
                filledCount++;
            } else {
                featureVector.push(0); // Default missing values to 0 (will be normalized in Python)
            }
        }

        if (filledCount >= requiredFeatures) {
            features.push(featureVector);
        }
    }

    // Get unique patient count (anonymized - just the count)
    const patientResult = await query(
        `SELECT COUNT(DISTINCT patient_hh_number) as count 
         FROM diagnostic_metrics 
         WHERE disease_category = $1`,
        [category]
    );

    return {
        features,
        featureNames: featureMap.columns,
        recordCount: features.length,
        patientCount: parseInt(patientResult.rows[0]?.count || 0)
    };
}

/**
 * Get available record count and quality stats for a disease
 * @param {string} disease - Disease type
 * @returns {Object} { totalRecords, patientsContributing, avgFeaturesPerRecord, featureCompleteness }
 */
async function getFeatureQualityReport(disease) {
    const featureMap = DISEASE_FEATURE_MAPS[disease];
    if (!featureMap) {
        return { totalRecords: 0, patientsContributing: 0, avgFeaturesPerRecord: 0, featureCompleteness: 0, supported: false };
    }

    const diseaseToCategory = { 'diabetes': 'diabetes', 'cvd': 'cvd', 'cancer': 'cancer', 'pneumonia': 'pneumonia' };
    const category = diseaseToCategory[disease];
    if (!category) {
        return { totalRecords: 0, patientsContributing: 0, avgFeaturesPerRecord: 0, featureCompleteness: 0, supported: false };
    }

    const statsResult = await query(
        `SELECT 
            COUNT(DISTINCT record_id) as total_records,
            COUNT(DISTINCT patient_hh_number) as patients,
            COUNT(*) as total_metrics
         FROM diagnostic_metrics 
         WHERE disease_category = $1`,
        [category]
    );

    const stats = statsResult.rows[0];
    const totalRecords = parseInt(stats.total_records || 0);
    const avgFeatures = totalRecords > 0 ? parseInt(stats.total_metrics) / totalRecords : 0;
    const completeness = totalRecords > 0 ? Math.min(100, (avgFeatures / featureMap.columns.length) * 100) : 0;

    return {
        totalRecords,
        patientsContributing: parseInt(stats.patients || 0),
        avgFeaturesPerRecord: Math.round(avgFeatures * 10) / 10,
        featureCompleteness: Math.round(completeness),
        expectedFeatures: featureMap.columns.length,
        featureNames: featureMap.columns,
        supported: true
    };
}

/**
 * Extract anonymized features for a specific patient
 * @param {string} disease - Disease type
 * @param {string|number} hhNumber - Patient HH Number
 * @returns {Object} { features: number[][], featureNames: string[], recordCount: number }
 */
async function extractFeaturesForPatient(disease, hhNumber) {
    const featureMap = DISEASE_FEATURE_MAPS[disease];
    if (!featureMap) {
        throw new Error(`No feature map defined for disease: ${disease}`);
    }

    const diseaseToCategory = { 'diabetes': 'diabetes', 'cvd': 'cvd', 'cancer': 'cancer', 'pneumonia': 'pneumonia' };
    const category = diseaseToCategory[disease];

    const result = await query(
        `SELECT record_id, metric_name, metric_value 
         FROM diagnostic_metrics 
         WHERE disease_category = $1 AND patient_hh_number = $2
         ORDER BY record_id, metric_name`,
        [category, hhNumber.toString()]
    );

    if (result.rows.length === 0) {
        return { features: [], featureNames: featureMap.columns, recordCount: 0 };
    }

    const recordMetrics = {};
    for (const row of result.rows) {
        if (!recordMetrics[row.record_id]) {
            recordMetrics[row.record_id] = {};
        }
        recordMetrics[row.record_id][row.metric_name] = parseFloat(row.metric_value);
    }

    const features = [];
    const minFeatureRatio = 0.5;
    const requiredFeatures = Math.ceil(featureMap.columns.length * minFeatureRatio);

    for (const [recordId, metrics] of Object.entries(recordMetrics)) {
        const featureVector = [];
        let filledCount = 0;

        for (const column of featureMap.columns) {
            let value = null;
            for (const [metricName, colName] of Object.entries(featureMap.metricMapping)) {
                if (colName === column && metrics[metricName] !== undefined) {
                    value = metrics[metricName];
                    break;
                }
            }

            if (value !== null) {
                featureVector.push(value);
                filledCount++;
            } else {
                featureVector.push(0);
            }
        }

        if (filledCount >= requiredFeatures) {
            features.push(featureVector);
        }
    }

    return {
        features,
        featureNames: featureMap.columns,
        recordCount: features.length
    };
}

/**
 * Check if a patient is eligible to train for a disease
 * @param {string} disease - Disease type
 * @param {string|number} hhNumber - Patient HH Number
 * @returns {Promise<Object>} Trainability report
 */
async function checkPatientTrainability(disease, hhNumber) {
    const featureMap = DISEASE_FEATURE_MAPS[disease];
    if (!featureMap) {
        return { isTrainable: false, reason: "Disease not supported", code: "NOT_SUPPORTED" };
    }

    const patientData = await extractFeaturesForPatient(disease, hhNumber);

    if (patientData.recordCount === 0) {
        return {
            isTrainable: false,
            reason: "You don't have enough diagnostic records with numeric health metrics for this disease category.",
            code: "NO_DATA",
            missingFeatures: featureMap.columns
        };
    }

    const metricResult = await query(
        `SELECT DISTINCT metric_name FROM diagnostic_metrics 
         WHERE disease_category = $1 AND patient_hh_number = $2`,
        [disease, hhNumber.toString()]
    );

    const existingMetrics = metricResult.rows.map(r => r.metric_name);
    const missingMetrics = [];

    for (const [label, col] of Object.entries(featureMap.metricMapping)) {
        if (col && !existingMetrics.includes(label)) {
            missingMetrics.push(label);
        }
    }

    if (patientData.recordCount > 0) {
        return {
            isTrainable: true,
            reason: "Your medical records are compatible with this AI model.",
            recordCount: patientData.recordCount,
            missingSomeMetrics: missingMetrics
        };
    }

    return {
        isTrainable: false,
        reason: "Your records are too incomplete to be used for training. Missing critical metrics.",
        code: "INCOMPLETE_DATA",
        missingMetrics
    };
}

module.exports = {
    extractFeaturesForDisease,
    extractFeaturesForPatient,
    checkPatientTrainability,
    getFeatureQualityReport,
    DISEASE_FEATURE_MAPS
};
