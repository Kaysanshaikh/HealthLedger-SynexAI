const { PythonShell } = require("python-shell");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
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
        console.log(`🏥 [PRODUCTION] Training local ${disease} model via Python Backend...`);

        // Prepare data for Python
        const inputData = {
            disease,
            data: patientData,
            globalModel: globalModel,
            config: {
                max_iter: config.epochs || 1000,
                C: config.C || 1.0,
                ...config
            }
        };

        // Call Python ML backend
        const result = await callPythonML("train_model.py", inputData);

        if (result.error) {
            console.error(`❌ ML Backend Error: ${result.error}`);
            throw new Error(`Production Training Failed: ${result.error}`);
        }

        console.log(`✅ Training complete - Global Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);

        return {
            modelWeights: result.weights,
            accuracy: result.accuracy,
            loss: result.loss,
            samplesTrained: result.metrics?.samples || patientData.length,
            trainingTime: result.trainingTime,
            metrics: result.metrics
        };

    } catch (error) {
        console.error(`❌ CRITICAL: Local training failed for ${disease}:`, error.message);
        // NO FALLBACK in production grade system
        throw error;
    }
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
 * Encrypt data before IPFS upload using AES-256-GCM
 * @param {any} data - Data to encrypt
 * @returns {string} Base64 encoded JSON containing ciphertext, iv, and tag
 */
function encryptData(data) {
    const keyString = process.env.FL_ENCRYPTION_KEY;
    if (!keyString) {
        throw new Error("FL_ENCRYPTION_KEY not set in environment");
    }

    // Convert key from base64 or treat as raw string (ensure 32 bytes)
    let key;
    try {
        key = Buffer.from(keyString, 'base64');
        if (key.length !== 32) throw new Error("Key must be 32 bytes");
    } catch {
        // Fallback for simple string keys (not recommended for production)
        key = crypto.createHash('sha256').update(keyString).digest();
    }

    const iv = crypto.randomBytes(12); // GCM standard IV length
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const isBuffer = Buffer.isBuffer(data);
    const payload = isBuffer ? data.toString('base64') : JSON.stringify(data);

    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag().toString('hex');

    return JSON.stringify({
        iv: iv.toString('hex'),
        content: encrypted,
        tag: tag,
        isBuffer: isBuffer
    });
}

/**
 * Decrypt data after IPFS download
 * @param {string} encryptedData - Stringified JSON containing ciphertext, iv, and tag
 * @returns {any} Decrypted data
 */
function decryptData(encryptedData) {
    const keyString = process.env.FL_ENCRYPTION_KEY;
    if (!keyString) {
        throw new Error("FL_ENCRYPTION_KEY not set in environment");
    }

    // Handle key processing consistently
    let key;
    try {
        key = Buffer.from(keyString, 'base64');
        if (key.length !== 32) throw new Error("Key must be 32 bytes");
    } catch {
        key = crypto.createHash('sha256').update(keyString).digest();
    }

    const { iv, content, tag, isBuffer } = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    if (isBuffer) {
        return Buffer.from(decrypted, 'base64');
    }
    return JSON.parse(decrypted);
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

        const encrypted = encryptData(model.modelWeights);
        const metadata = {
            modelId,
            accuracy: model.accuracy,
            loss: model.loss,
            timestamp: Date.now()
        };

        const result = await pinataService.uploadJSON({
            model: encrypted,
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
        const modelWeights = decryptData(data.model);

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
        try {
            const options = {
                mode: 'text',
                pythonPath: 'python3',
                pythonOptions: ['-u'],
                scriptPath: ML_BACKEND_DIR,
                args: [JSON.stringify(inputData)]
            };

            PythonShell.run(scriptName, options, (err, results) => {
                if (err) {
                    return reject(new Error(`Python ML error: ${err.message || err}`));
                }
                try {
                    // Find the last line that looks like valid JSON
                    const jsonLine = results && results.reverse().find(line => {
                        const trimmed = line.trim();
                        return trimmed.startsWith('{') || trimmed.startsWith('[');
                    });
                    if (!jsonLine) {
                        return reject(new Error(`Python returned no JSON output. Raw: ${(results || []).join('\\n')}`));
                    }
                    resolve(JSON.parse(jsonLine));
                } catch (parseErr) {
                    reject(new Error(`Failed to parse Python output: ${parseErr.message}`));
                }
            });
        } catch (syncErr) {
            reject(new Error(`Failed to start Python process: ${syncErr.message}`));
        }
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
    evaluateModel,

    // Aggregation
    federatedAverage,
    byzantineRobustAggregation,
    calculateModelDistance,

    // Encryption
    encryptData,
    decryptData,

    // IPFS
    uploadModelToIPFS,
    downloadModelFromIPFS,

    // Utilities
    checkPythonBackend
};
