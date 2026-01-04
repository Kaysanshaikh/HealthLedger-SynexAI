const { PythonShell } = require("python-shell");
const path = require("path");
const fs = require("fs");
const pinataService = require("./pinataService");

/**
 * ML Model Service for Federated Learning
 * Handles model training, evaluation, and FedAvg aggregation
 * 
 * Uses Python bridge for ML operations (scikit-learn, PyTorch)
 */

const ML_BACKEND_DIR = path.join(__dirname, "..", "ml-backend");
const MODEL_CACHE = new Map();

// ============================================
// LOCAL MODEL TRAINING
// ============================================

/**
 * Train a local model on hospital's data
 * @param {string} disease - Disease type (diabetes, cvd, cancer, pneumonia)
 * @param {Array} patientData - Local patient data
 * @param {Object} globalModel - Current global model (optional)
 * @param {Object} config - Training configuration
 * @returns {Promise<Object>} Trained model and metrics
 */
async function trainLocalModel(disease, patientData, globalModel = null, config = {}) {
    try {
        console.log(`🏥 Training local ${disease} model...`);
        console.log(`   Samples: ${patientData.length}`);

        // Default config
        const trainingConfig = {
            epochs: config.epochs || 10,
            batchSize: config.batchSize || 32,
            learningRate: config.learningRate || 0.001,
            ...config
        };

        // Prepare data for Python
        const inputData = {
            disease,
            data: patientData,
            globalModel: globalModel,
            config: trainingConfig
        };

        // Call Python ML backend
        const result = await callPythonML("train_model.py", inputData);

        console.log(`✅ Training complete - Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);

        return {
            modelWeights: result.weights,
            accuracy: result.accuracy,
            loss: result.loss,
            samplesTrained: patientData.length,
            trainingTime: result.trainingTime,
            metrics: result.metrics
        };

    } catch (error) {
        console.error("❌ Local training failed:", error.message);
        throw error;
    }
}

/**
 * Simplified training for testing (without Python)
 * @param {string} disease - Disease type
 * @param {Array} patientData - Patient data
 * @returns {Object} Mock training result
 */
function trainLocalModelSimplified(disease, patientData) {
    console.log(`🏥 Training simplified ${disease} model...`);

    // Mock training result
    const mockWeights = {
        layer1: Array(100).fill(0).map(() => Math.random() - 0.5),
        layer2: Array(50).fill(0).map(() => Math.random() - 0.5),
        output: Array(10).fill(0).map(() => Math.random() - 0.5)
    };

    const accuracy = 0.85 + Math.random() * 0.1; // 85-95%
    const loss = 0.1 + Math.random() * 0.15;     // 0.1-0.25

    return {
        modelWeights: mockWeights,
        accuracy,
        loss,
        samplesTrained: patientData.length,
        trainingTime: Math.floor(Math.random() * 60) + 30, // 30-90 seconds
        metrics: {
            precision: accuracy + 0.02,
            recall: accuracy - 0.01,
            f1Score: accuracy
        }
    };
}

// ============================================
// MODEL EVALUATION
// ============================================

/**
 * Evaluate model on test data
 * @param {Object} model - Model to evaluate
 * @param {Array} testData - Test dataset
 * @returns {Promise<Object>} Evaluation metrics
 */
async function evaluateModel(model, testData) {
    try {
        console.log("📊 Evaluating model...");

        const inputData = {
            model,
            testData
        };

        const result = await callPythonML("evaluate_model.py", inputData);

        return {
            accuracy: result.accuracy,
            precision: result.precision,
            recall: result.recall,
            f1Score: result.f1Score,
            confusionMatrix: result.confusionMatrix
        };

    } catch (error) {
        console.error("❌ Evaluation failed:", error.message);
        throw error;
    }
}

// ============================================
// FEDERATED AVERAGING (FedAvg)
// ============================================

/**
 * Aggregate model updates using FedAvg algorithm
 * @param {Array} modelUpdates - Array of model updates from participants
 * @returns {Object} Aggregated global model
 */
function federatedAverage(modelUpdates) {
    console.log(`🔄 Aggregating ${modelUpdates.length} model updates using FedAvg...`);

    if (modelUpdates.length === 0) {
        throw new Error("No model updates to aggregate");
    }

    // Calculate total samples for weighted averaging
    const totalSamples = modelUpdates.reduce((sum, update) => sum + update.samplesTrained, 0);

    // Initialize aggregated model with zeros
    const firstModel = modelUpdates[0].modelWeights;
    const aggregatedModel = JSON.parse(JSON.stringify(firstModel));

    // Zero out all weights
    Object.keys(aggregatedModel).forEach(layer => {
        aggregatedModel[layer] = aggregatedModel[layer].map(() => 0);
    });

    // Weighted average of all models
    modelUpdates.forEach(update => {
        const weight = update.samplesTrained / totalSamples;

        Object.keys(update.modelWeights).forEach(layer => {
            update.modelWeights[layer].forEach((value, index) => {
                aggregatedModel[layer][index] += value * weight;
            });
        });
    });

    // Calculate aggregated metrics
    const avgAccuracy = modelUpdates.reduce((sum, u) => sum + u.accuracy, 0) / modelUpdates.length;
    const avgLoss = modelUpdates.reduce((sum, u) => sum + u.loss, 0) / modelUpdates.length;

    console.log(`✅ Aggregation complete - Avg Accuracy: ${(avgAccuracy * 100).toFixed(2)}%`);

    return {
        modelWeights: aggregatedModel,
        accuracy: avgAccuracy,
        loss: avgLoss,
        participantCount: modelUpdates.length,
        totalSamples
    };
}

/**
 * Byzantine-robust aggregation (Krum algorithm)
 * @param {Array} modelUpdates - Model updates
 * @param {number} f - Number of Byzantine participants to tolerate
 * @returns {Object} Robust aggregated model
 */
function byzantineRobustAggregation(modelUpdates, f = 1) {
    console.log(`🛡️  Byzantine-robust aggregation (Krum, f=${f})...`);

    if (modelUpdates.length < 2 * f + 3) {
        console.warn("⚠️  Not enough participants for Byzantine robustness, using FedAvg");
        return federatedAverage(modelUpdates);
    }

    // Calculate pairwise distances between models
    const distances = [];

    for (let i = 0; i < modelUpdates.length; i++) {
        const scores = [];

        for (let j = 0; j < modelUpdates.length; j++) {
            if (i !== j) {
                const dist = calculateModelDistance(
                    modelUpdates[i].modelWeights,
                    modelUpdates[j].modelWeights
                );
                scores.push(dist);
            }
        }

        // Sum of n-f-2 smallest distances
        scores.sort((a, b) => a - b);
        const krumScore = scores.slice(0, modelUpdates.length - f - 2).reduce((a, b) => a + b, 0);

        distances.push({ index: i, score: krumScore });
    }

    // Select model with smallest Krum score
    distances.sort((a, b) => a.score - b.score);
    const selectedModels = distances.slice(0, modelUpdates.length - f).map(d => modelUpdates[d.index]);

    console.log(`✅ Selected ${selectedModels.length} honest models`);

    return federatedAverage(selectedModels);
}

/**
 * Calculate Euclidean distance between two models
 * @param {Object} model1 - First model
 * @param {Object} model2 - Second model
 * @returns {number} Distance
 */
function calculateModelDistance(model1, model2) {
    let sumSquaredDiff = 0;
    let count = 0;

    Object.keys(model1).forEach(layer => {
        model1[layer].forEach((value, index) => {
            const diff = value - model2[layer][index];
            sumSquaredDiff += diff * diff;
            count++;
        });
    });

    return Math.sqrt(sumSquaredDiff / count);
}

// ============================================
// MODEL ENCRYPTION & STORAGE
// ============================================

/**
 * Encrypt model weights before IPFS upload
 * @param {Object} modelWeights - Model weights
 * @param {string} key - Encryption key (optional)
 * @returns {Buffer} Encrypted model
 */
function encryptModelWeights(modelWeights, key = null) {
    // Simplified: In production, use AES-256 encryption
    const modelString = JSON.stringify(modelWeights);
    const buffer = Buffer.from(modelString, 'utf8');

    // TODO: Implement actual encryption
    return buffer;
}

/**
 * Decrypt model weights after IPFS download
 * @param {Buffer} encryptedModel - Encrypted model
 * @param {string} key - Decryption key (optional)
 * @returns {Object} Decrypted model weights
 */
function decryptModelWeights(encryptedModel, key = null) {
    // Simplified: In production, use AES-256 decryption
    const modelString = encryptedModel.toString('utf8');
    return JSON.parse(modelString);
}

/**
 * Upload model to IPFS
 * @param {Object} model - Model to upload
 * @param {string} modelId - Model ID
 * @returns {Promise<string>} IPFS CID
 */
async function uploadModelToIPFS(model, modelId) {
    try {
        console.log("📤 Uploading model to IPFS...");

        const encrypted = encryptModelWeights(model.modelWeights);
        const metadata = {
            modelId,
            accuracy: model.accuracy,
            loss: model.loss,
            timestamp: Date.now()
        };

        const result = await pinataService.uploadJSON({
            model: encrypted.toString('base64'),
            metadata
        });

        console.log("✅ Model uploaded to IPFS:", result.cid);
        return result.cid;

    } catch (error) {
        console.error("❌ IPFS upload failed:", error.message);
        throw error;
    }
}

/**
 * Download model from IPFS
 * @param {string} cid - IPFS CID
 * @returns {Promise<Object>} Downloaded model
 */
async function downloadModelFromIPFS(cid) {
    try {
        console.log("📥 Downloading model from IPFS...");

        const data = await pinataService.retrieveJSON(cid);
        const encrypted = Buffer.from(data.model, 'base64');
        const modelWeights = decryptModelWeights(encrypted);

        return {
            modelWeights,
            metadata: data.metadata
        };

    } catch (error) {
        console.error("❌ IPFS download failed:", error.message);
        throw error;
    }
}

// ============================================
// PYTHON BRIDGE
// ============================================

/**
 * Call Python ML backend
 * @param {string} scriptName - Python script name
 * @param {Object} inputData - Input data for script
 * @returns {Promise<Object>} Result from Python
 */
async function callPythonML(scriptName, inputData) {
    return new Promise((resolve, reject) => {
        const options = {
            mode: 'json',
            pythonPath: 'python',
            pythonOptions: ['-u'],
            scriptPath: ML_BACKEND_DIR,
            args: [JSON.stringify(inputData)]
        };

        PythonShell.run(scriptName, options, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results[0]);
            }
        });
    });
}

/**
 * Check if Python ML backend is available
 * @returns {Promise<boolean>} Availability status
 */
async function checkPythonBackend() {
    try {
        const result = await callPythonML("check_setup.py", {});
        return result.available;
    } catch (error) {
        console.warn("⚠️  Python ML backend not available, using simplified mode");
        return false;
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Training
    trainLocalModel,
    trainLocalModelSimplified,
    evaluateModel,

    // Aggregation
    federatedAverage,
    byzantineRobustAggregation,
    calculateModelDistance,

    // Encryption
    encryptModelWeights,
    decryptModelWeights,

    // IPFS
    uploadModelToIPFS,
    downloadModelFromIPFS,

    // Utilities
    checkPythonBackend
};
