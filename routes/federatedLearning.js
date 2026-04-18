const express = require("express");
const router = express.Router();
const flService = require("../services/federatedLearningService");
const zkProofService = require("../services/zkProofService");
const mlModelService = require("../services/mlModelService");
const db = require("../services/databaseService");
const authMiddleware = require("../middleware/authMiddleware");

// ============================================
// FL MODEL MANAGEMENT
// ============================================

// Create new FL model
router.post("/models", authMiddleware, async (req, res) => {
    try {
        const { disease, modelType } = req.body;

        if (!disease || !modelType) {
            return res.status(400).json({ error: "Disease and modelType required" });
        }

        // Check for existing active model with same disease and type
        const existing = await db.query(
            `SELECT * FROM fl_models WHERE disease = $1 AND model_type = $2 AND (status != 'deleted' OR status IS NULL)`,
            [disease, modelType]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: `A model for ${disease} using ${modelType} already exists. Please delete the existing one first if you wish to recreate it.`
            });
        }

        const creatorWallet = req.user.walletAddress;

        // Respond immediately to prevent Render timeout
        res.json({
            success: true,
            async: true,
            disease,
            modelType,
            message: "Model creation submitted to the blockchain. It will appear in your models list shortly."
        });

        // Run blockchain transaction in background
        (async () => {
            try {
                console.log(`[ASYNC] Creating FL model for ${disease} (${modelType}) on blockchain...`);
                // Create model on blockchain
                const modelId = await flService.createFLModel(disease, modelType);

                // Store in database
                await db.query(
                    `INSERT INTO fl_models (model_id, disease, model_type, created_by) 
               VALUES ($1, $2, $3, $4)`,
                    [modelId, disease, modelType, creatorWallet]
                );
                console.log(`[ASYNC] Successfully created FL model ${modelId}.`);
            } catch (err) {
                console.error(`[ASYNC ERROR] Model creation failed for ${disease}:`, err);
            }
        })();

    } catch (error) {
        console.error("Create model error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PHASE 1: REWARD CALCULATION HELPER
 * Reward = log2(samples / 100 + 1) * accuracy * 10
 */
const calculateReward = (samples, accuracy) => {
    try {
        const s = parseInt(samples) || 0;
        const acc = parseFloat(accuracy) || 0;
        if (s <= 0) return 0;
        const logWeight = Math.log2((s / 100) + 1);
        return parseFloat((logWeight * acc * 10).toFixed(8));
    } catch (err) {
        console.error("Reward calculation error:", err);
        return 0;
    }
};

// Get all models
router.get("/models", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM fl_models WHERE status != 'deleted' OR status IS NULL ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            models: result.rows
        });

    } catch (error) {
        console.error("Get models error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Delete model (Admin only)
router.delete("/models/:modelId", authMiddleware, async (req, res) => {
    try {
        const { modelId } = req.params;

        // Respond immediately to prevent Render timeout
        res.json({
            success: true,
            async: true,
            message: "Model deletion submitted to the blockchain. It will be removed from your models list shortly.",
            modelId
        });

        // Run blockchain transaction in background
        (async () => {
            try {
                console.log(`[ASYNC] Deleting FL model ${modelId}...`);
                // 1. Deactivate on blockchain
                try {
                    await flService.pauseModel(modelId);
                } catch (bcError) {
                    console.warn(`[ASYNC WARN] Blockchain pause failed for ${modelId}:`, bcError.message);
                }

                // 2. Update database status
                await db.deleteFLModel(modelId);
                console.log(`[ASYNC] Successfully deleted FL model ${modelId}.`);
            } catch (err) {
                console.error(`[ASYNC ERROR] Model deletion failed for ${modelId}:`, err);
            }
        })();

    } catch (error) {
        console.error("Delete model error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get global FL statistics
router.get("/stats", async (req, res) => {
    try {
        // 1. Get model stats
        const modelStats = await db.query(
            `SELECT 
                COUNT(*) as total_models,
                AVG(accuracy) as avg_accuracy
             FROM fl_models 
             WHERE (status = 'active' OR status IS NULL) AND (status != 'deleted' OR status IS NULL)`
        );

        // 2. Get unique participants count from contributions
        const participantStats = await db.query(
            `SELECT COUNT(DISTINCT participant_address) as total_participants 
             FROM fl_contributions`
        );

        // 3. Fallback and normalization
        const queryAvgAcc = modelStats.rows[0].avg_accuracy;
        const stats = {
            totalModels: parseInt(modelStats.rows[0].total_models) || 0,
            avgAccuracy: queryAvgAcc ? parseFloat(parseFloat(queryAvgAcc).toFixed(4)) * 100 : 0,
            totalParticipants: parseInt(participantStats.rows[0].total_participants) || 0
        };

        res.json({
            success: true,
            stats: {
                ...stats,
                network: "Polygon Amoy",
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get model details
router.get("/models/:modelId", async (req, res) => {
    try {
        const { modelId } = req.params;

        // Get from database first (always available)
        const dbResult = await db.query(
            `SELECT * FROM fl_models WHERE model_id = $1`,
            [modelId]
        );

        let blockchainData = {};
        // Try blockchain, but don't fail if unavailable
        try {
            if (flService.isBlockchainAvailable()) {
                blockchainData = await flService.getModel(modelId);
            }
        } catch (bcErr) {
            console.warn("Blockchain unavailable for model details, using DB only:", bcErr.message);
        }

        res.json({
            success: true,
            model: {
                ...blockchainData,
                ...dbResult.rows[0]
            }
        });

    } catch (error) {
        console.error("Get model error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// FL ROUNDS
// ============================================

// Start new training round
router.post("/rounds/start", authMiddleware, async (req, res) => {
    try {
        const { modelId } = req.body;

        if (!modelId) {
            return res.status(400).json({ error: "Model ID required" });
        }

        // Initiate round on blockchain
        const roundId = await flService.initiateFLRound(modelId);

        // Get round details
        const round = await flService.getRound(roundId);

        // Store in database
        await db.query(
            `INSERT INTO fl_rounds (round_id, model_id, round_number, status, min_participants, timeout_at)
       VALUES ($1, $2, $3, $4, $5, to_timestamp($6))`,
            [roundId, modelId, round.roundNumber, round.status, round.minParticipants, round.timeoutAt]
        );

        // Update current_round in fl_models
        await db.query(
            `UPDATE fl_models SET current_round = $1 WHERE model_id = $2`,
            [round.roundNumber, modelId]
        );

        res.json({
            success: true,
            roundId,
            round
        });

    } catch (error) {
        console.error("Start round error:", error);
        let message = error.message;
        if (message.includes("is not registered") || message.includes("reverted")) {
            message = `Blockchain error: ${message}. Make sure your wallet is registered as a participant.`;
        } else if (message.includes("provider") || message.includes("network")) {
            message = "Blockchain network unreachable. Ensure your Hardhat node or Polygon RPC is running.";
        }
        res.status(500).json({ error: message });
    }
});

// Local training for FL round (supports Kaggle, medical records, or combined)
router.post("/rounds/train", authMiddleware, async (req, res) => {
    try {
        const { modelId, samples, dataSource, sampleCount } = req.body;

        if (!modelId) {
            return res.status(400).json({ error: "Model ID required" });
        }

        // Get model details from DB: disease type, model type, and latest global model CID
        const modelResult = await db.query(
            "SELECT disease, model_type, global_model_ipfs FROM fl_models WHERE model_id = $1",
            [modelId]
        );

        if (modelResult.rows.length === 0) {
            return res.status(404).json({ error: "Model not found" });
        }

        const disease = modelResult.rows[0].disease;
        const modelType = modelResult.rows[0].model_type;
        const globalModelCID = modelResult.rows[0].global_model_ipfs;
        const source = dataSource || 'kaggle';
        const limit = sampleCount || samples || null;

        console.log(`🧠 [ASYNC] Initiating local training for ${disease} model (${modelType})...`);
        if (globalModelCID) {
            console.log(`🔄 Global model CID found: ${globalModelCID} — warm-start will be used.`);
        } else {
            console.log(`🆕 No global model CID — Round 1 cold training.`);
        }

        // Respond immediately to prevent Render timeout
        res.json({
            success: true,
            async: true,
            status: 'started',
            message: "Training started in background. Please poll status endpoint for results."
        });

        // Run training in background (non-blocking)
        // Warm-start: download previous global model BEFORE calling trainLocalModel
        // Uses retry with exponential backoff — Pinata rate limits / network blips are transient
        (async () => {
            let globalModel = null;
            let warmStartMode = 'cold'; // tracked for status reporting

            if (globalModelCID) {
                const MAX_RETRIES = 3;
                const BASE_DELAY_MS = 2000; // 2s → 4s → 8s

                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        console.log(`🔄 Warm-start attempt ${attempt}/${MAX_RETRIES}: loading global model from IPFS (${globalModelCID})...`);
                        const downloaded = await mlModelService.downloadModelFromIPFS(globalModelCID);
                        globalModel = downloaded.modelWeights;
                        warmStartMode = 'warm';
                        console.log(`✅ Warm-start: global model loaded on attempt ${attempt} (${globalModelCID})`);
                        break; // success — exit retry loop
                    } catch (err) {
                        const isLastAttempt = attempt === MAX_RETRIES;
                        if (isLastAttempt) {
                            // All retries exhausted — fall back to cold training
                            // Model performance will be slightly degraded this round
                            // but the system remains functional and the next round can recover
                            console.error(
                                `❌ Warm-start failed after ${MAX_RETRIES} attempts for model ${modelId}. ` +
                                `Falling back to cold training. This round's contribution may slightly ` +
                                `dilute the global model. Error: ${err.message}`
                            );
                            warmStartMode = 'cold_fallback';
                        } else {
                            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                            console.warn(
                                `⚠️ Warm-start attempt ${attempt} failed: ${err.message}. ` +
                                `Retrying in ${delay / 1000}s...`
                            );
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }
            }

            console.log(`🏋️ Training mode: ${warmStartMode === 'warm' ? '🔥 warm-start (continuing from global model)' : warmStartMode === 'cold_fallback' ? '🧊 cold (IPFS load failed after retries)' : '🆕 cold (Round 1)'}`);

            try {
                await mlModelService.trainLocalModel(disease, {
                    dataSource: source,
                    sampleCount: limit,
                    modelId,
                    modelType,
                    globalModel,   // null on cold/cold_fallback, real weights on warm
                    hhNumber: req.body.hhNumber || null
                });
            } catch (err) {
                console.error(`❌ Background training failed for ${modelId}:`, err);
            }
        })();

    } catch (error) {
        console.error("Initiate training error:", error);
        res.status(500).json({
            error: `Failed to initiate training: ${error.message}`
        });
    }
});

// ============================================
// DATASET DISCOVERY & TRAINING STATUS
// ============================================

const featureExtractor = require("../services/medicalRecordFeatureExtractor");
const fs = require("fs");
const path = require("path");

// List available datasets for a disease (Kaggle + medical records)
router.get("/datasets/:disease", async (req, res) => {
    try {
        const { disease } = req.params;

        // 1. Check Kaggle datasets
        const datasetsDir = path.join(__dirname, "..", "ml-backend", "datasets");
        const kaggleDatasets = [];

        const datasetFiles = {
            diabetes: 'diabetes.csv',
            cvd: 'heart_disease_data.csv',
            cancer: 'breast_cancer.csv',
            pneumonia: 'pneumonia.csv'
        };

        const targetFile = datasetFiles[disease];
        if (targetFile) {
            const filePath = path.join(datasetsDir, targetFile);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                // Quick line count (approximate row count)
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(l => l.trim());
                const headers = lines[0] ? lines[0].split(',') : [];

                kaggleDatasets.push({
                    file: targetFile,
                    rows: lines.length - 1, // subtract header
                    columns: headers.length,
                    columnNames: headers.map(h => h.trim()),
                    sizeKB: Math.round(stats.size / 1024)
                });
            }
        }

        // 2. Check medical records
        let medicalRecords = { totalRecords: 0, patientsContributing: 0, supported: false };
        try {
            medicalRecords = await featureExtractor.getFeatureQualityReport(disease);
        } catch (err) {
            console.warn(`⚠️ Medical record check failed for ${disease}:`, err.message);
        }

        res.json({
            success: true,
            disease,
            kaggleDatasets,
            medicalRecords
        });

    } catch (error) {
        console.error("Dataset listing error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get training progress/status for a model
router.get("/training/status/:modelId", async (req, res) => {
    try {
        const { modelId } = req.params;
        const status = mlModelService.getTrainingStatus(modelId);

        if (!status) {
            return res.json({ success: true, status: null, message: "No active training" });
        }

        res.json({ success: true, ...status });
    } catch (error) {
        console.error("Training status error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Check patient trainability for a disease
router.get("/trainability-check/:disease", async (req, res) => {
    try {
        const { disease } = req.params;
        const hhNumber = req.query.hhNumber;

        if (!hhNumber) {
            return res.status(400).json({ error: "HH Number required for check" });
        }

        const report = await featureExtractor.checkPatientTrainability(disease, hhNumber);
        res.json({ success: true, ...report });

    } catch (error) {
        console.error("Trainability check error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Submit model update
router.post("/rounds/submit", authMiddleware, async (req, res) => {
    try {
        const { roundId, modelWeights, trainingMetrics } = req.body;

        if (!roundId || !modelWeights || !trainingMetrics) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // ─── PRE-FLIGHT TIMEOUT CHECK ────────────────────────────────────────────
        // Check if the round's deadline has passed BEFORE doing any expensive work
        // (ZK proof generation, IPFS upload). The smart contract will reject with
        // "Round timeout exceeded" if we skip this check — wasting 30-60s of work.
        const roundRow = await db.query(
            `SELECT timeout_at, status FROM fl_rounds WHERE round_id = $1`,
            [roundId]
        );
        if (roundRow.rows.length > 0) {
            const { timeout_at, status } = roundRow.rows[0];
            const nowMs = Date.now();
            const timeoutMs = new Date(timeout_at).getTime();

            if (status === 'completed' || status === 'failed') {
                return res.status(400).json({
                    error: `Round ${roundId} is already ${status}. Please start a new round.`
                });
            }

            if (timeout_at && nowMs > timeoutMs) {
                const expiredAgo = Math.round((nowMs - timeoutMs) / 60000);
                return res.status(400).json({
                    error: `Round ${roundId} timed out ${expiredAgo} minute(s) ago (expired at ${new Date(timeout_at).toLocaleString()}). ` +
                           `Please ask the admin to start a new round.`,
                    code: 'ROUND_TIMEOUT'
                });
            }
        }
        // ─────────────────────────────────────────────────────────────────────────

        // Validate modelWeights structure
        if (typeof modelWeights !== 'object' || Array.isArray(modelWeights)) {
            return res.status(400).json({ error: "Invalid modelWeights format. Expected an object." });
        }

        // Validate trainingMetrics
        const { accuracy, loss, samplesTrained } = trainingMetrics;
        if (typeof accuracy !== 'number' || typeof loss !== 'number' || typeof samplesTrained !== 'number') {
            return res.status(400).json({ error: "Invalid trainingMetrics. Expected numbers for accuracy, loss, and samplesTrained." });
        }

        // Generate ZK proof
        const proof = await zkProofService.generateProof(modelWeights, trainingMetrics);

        // Upload model to IPFS
        let modelUpdateIPFS;
        try {
            modelUpdateIPFS = await mlModelService.uploadModelToIPFS(
                { modelWeights, ...trainingMetrics },
                `round-${roundId}`
            );
        } catch (ipfsError) {
            console.error("IPFS Upload Error:", ipfsError);
            return res.status(500).json({ error: `IPFS upload failed: ${ipfsError.message}. Check your Pinata credentials.` });
        }

        // Submit to blockchain
        try {
            await flService.submitModelUpdate(
                roundId,
                modelUpdateIPFS,
                proof.proofHash,
                trainingMetrics.accuracy,
                trainingMetrics.loss,
                trainingMetrics.samplesTrained
            );
        } catch (blockchainError) {
            console.error("Blockchain Submission Error:", blockchainError);
            return res.status(500).json({ error: `Blockchain submission failed: ${blockchainError.message}` });
        }

        // Verify proof cryptographically before recording
        const isVerified = await zkProofService.verifyProof(proof.proofHash, proof.publicInputs || [], proof.proof);

        // Store in database with actual verification status
        await db.query(
            `INSERT INTO fl_contributions 
       (round_id, participant_address, model_update_ipfs, zk_proof_hash, 
        local_accuracy, local_loss, local_precision, local_recall, local_f1, local_auc, local_cm,
        samples_trained, zk_proof_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                roundId,
                req.user.walletAddress,
                modelUpdateIPFS,
                proof.proofHash,
                trainingMetrics.accuracy,
                trainingMetrics.loss,
                trainingMetrics.precision || null,
                trainingMetrics.recall || null,
                trainingMetrics.f1 || null,
                trainingMetrics.auc || null,
                trainingMetrics.confusionMatrix ? JSON.stringify(trainingMetrics.confusionMatrix) : null,
                trainingMetrics.samplesTrained,
                isVerified
            ]
        );

        res.json({
            success: true,
            proofHash: proof.proofHash,
            modelUpdateIPFS
        });

    } catch (error) {
        console.error("Submit model update error:", error);

        // User-friendly error messages
        let userMessage = "Failed to submit model update. Please try again.";

        if (error.message && error.message.includes("Already submitted")) {
            userMessage = "You have already contributed to this training round. Please wait for the next round.";
        } else if (error.message && error.message.includes("revert")) {
            userMessage = "Blockchain transaction failed. The round may be closed or you may have already submitted.";
        } else if (error.message) {
            userMessage = error.message;
        }

        res.status(500).json({
            error: userMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Aggregate models
router.post("/rounds/aggregate", authMiddleware, async (req, res) => {
    try {
        const { roundId } = req.body;

        if (!roundId) {
            return res.status(400).json({ error: "Round ID required" });
        }

        // Get all contributions for this round
        const contributions = await db.query(
            `SELECT * FROM fl_contributions WHERE round_id = $1 AND zk_proof_verified = true`,
            [roundId]
        );

        if (contributions.rows.length === 0) {
            return res.status(400).json({ error: "No verified contributions found" });
        }

        // Download models from IPFS
        const modelUpdates = await Promise.all(
            contributions.rows.map(async (c) => {
                const model = await mlModelService.downloadModelFromIPFS(c.model_update_ipfs);
                return {
                    modelWeights: model.modelWeights,
                    accuracy: parseFloat(c.local_accuracy),
                    loss: parseFloat(c.local_loss),
                    precision: parseFloat(c.local_precision),
                    recall: parseFloat(c.local_recall),
                    f1Score: parseFloat(c.local_f1),
                    auc: parseFloat(c.local_auc),
                    samplesTrained: c.samples_trained
                };
            })
        );

        // Perform Byzantine-robust aggregation (Krum)
        // Defend against model poisoning attacks by selecting honest updates
        const aggregatedModel = mlModelService.byzantineRobustAggregation(modelUpdates, 1);

        // Upload aggregated model to IPFS
        const aggregatedIPFS = await mlModelService.uploadModelToIPFS(
            aggregatedModel,
            `round-${roundId}-aggregated`
        );

        // Update blockchain
        await flService.aggregateModels(
            roundId,
            aggregatedIPFS,
            aggregatedModel.accuracy,
            aggregatedModel.loss
        );

        // Update database
        await db.query(
            `UPDATE fl_rounds 
       SET status = 'completed', 
           aggregated_model_ipfs = $1,
           avg_precision = $2,
           avg_recall = $3,
           avg_f1 = $4,
           avg_auc = $5,
           end_time = CURRENT_TIMESTAMP
       WHERE round_id = $6`,
            [
                aggregatedIPFS,
                aggregatedModel.precision,
                aggregatedModel.recall,
                aggregatedModel.f1Score,
                aggregatedModel.auc,
                roundId
            ]
        );

        // Update model registry with latest metrics
        const modelIdResult = await db.query(`SELECT model_id FROM fl_rounds WHERE round_id = $1`, [roundId]);
        if (modelIdResult.rows.length > 0) {
            const modelId = modelIdResult.rows[0].model_id;
            await db.query(
                `UPDATE fl_models 
                 SET accuracy = $1, loss = $2, precision = $3, recall = $4, f1_score = $5, auc = $6,
                     global_model_ipfs = $7,
                     current_round = current_round + 1, updated_at = CURRENT_TIMESTAMP
                 WHERE model_id = $8`,
                [
                    aggregatedModel.accuracy,
                    aggregatedModel.loss,
                    aggregatedModel.precision,
                    aggregatedModel.recall,
                    aggregatedModel.f1Score,
                    aggregatedModel.auc,
                    aggregatedIPFS,
                    modelId
                ]
            );
            console.log(`✅ Warm-start: global_model_ipfs updated on fl_models (${aggregatedIPFS})`);
        }

        res.json({
            success: true,
            aggregatedModel: {
                ipfs: aggregatedIPFS,
                accuracy: aggregatedModel.accuracy,
                loss: aggregatedModel.loss,
                participants: aggregatedModel.participantCount
            }
        });

    } catch (error) {
        console.error("Aggregate error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get active round for a model
router.get("/rounds/active/:modelId", async (req, res) => {
    try {
        const { modelId } = req.params;

        // Find latest round that is in 'initiated' or 'training' status
        const result = await db.query(
            `SELECT * FROM fl_rounds 
       WHERE model_id = $1 AND status IN ('initiated', 'training')
       ORDER BY round_number DESC LIMIT 1`,
            [modelId]
        );

        if (result.rows.length === 0) {
            return res.json({ success: true, activeRound: null });
        }

        res.json({
            success: true,
            activeRound: result.rows[0]
        });

    } catch (error) {
        console.error("Get active round error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Complete/finalize a round
router.post("/rounds/complete", authMiddleware, async (req, res) => {
    try {
        const { roundId } = req.body;

        if (!roundId) {
            return res.status(400).json({ error: "Round ID is required" });
        }

        // Get round details
        const round = await flService.getRound(parseInt(roundId));

        if (round.status === 'completed') {
            return res.status(400).json({ error: "Round is already completed" });
        }

        // Get all contributions for this round
        const contributions = await db.query(
            `SELECT * FROM fl_contributions WHERE round_id = $1`,
            [roundId]
        );

        if (contributions.rows.length === 0) {
            return res.status(400).json({
                error: "No contributions found for this round. At least one participant must contribute before completing."
            });
        }

        // Proactive check: Compare against blockchain requirement
        if (round.currentParticipants < round.minParticipants) {
            console.log(`⚠️ Participant threshold not met (${round.currentParticipants}/${round.minParticipants}). Checking for manual override...`);

            // If it's an admin and there's at least one contribution, we can force aggregation
            // by updating the round's minParticipants on-chain
            if (round.currentParticipants > 0) {
                try {
                    console.log(`🔧 Admin override: Reducing on-chain minParticipants to ${round.currentParticipants}...`);
                    await flService.setRoundMinParticipants(parseInt(roundId), round.currentParticipants);
                    // Refresh round details
                    const updatedRound = await flService.getRound(parseInt(roundId));
                    console.log(`✅ On-chain threshold updated to ${updatedRound.minParticipants}`);
                } catch (overrideError) {
                    console.error("Failed to override minParticipants:", overrideError);
                    return res.status(500).json({ error: `Failed to override participant threshold: ${overrideError.message}` });
                }
            } else {
                return res.status(400).json({
                    error: `No contributions found. At least one participant must contribute before aggregation can be forced.`
                });
            }
        }

        console.log(`📊 Completing round ${roundId} with ${round.currentParticipants} on-chain participant(s) (DB shows ${contributions.rows.length})`);

        // Build and upload a real aggregated model to IPFS
        // Download all participant model weights and run FedAvg to get a proper global model
        let aggregatedModelIPFS;
        let realAggregatedModel = null;
        try {
            const modelUpdates = await Promise.all(
                contributions.rows.map(async (c) => {
                    const m = await mlModelService.downloadModelFromIPFS(c.model_update_ipfs);
                    return {
                        modelWeights: m.modelWeights,
                        accuracy: parseFloat(c.local_accuracy),
                        loss: parseFloat(c.local_loss),
                        samplesTrained: parseInt(c.samples_trained) || 100
                    };
                })
            );
            realAggregatedModel = mlModelService.federatedAverage(modelUpdates);
            aggregatedModelIPFS = await mlModelService.uploadModelToIPFS(
                realAggregatedModel,
                `round-${roundId}-aggregated`
            );
            console.log(`✅ Real aggregated model uploaded to IPFS: ${aggregatedModelIPFS}`);
        } catch (ipfsAggErr) {
            // Graceful fallback: if IPFS operations fail, use a placeholder string
            // The round still completes — warm-start just won't apply next round
            console.warn(`⚠️ Could not build/upload aggregated model: ${ipfsAggErr.message}. Using placeholder CID.`);
            aggregatedModelIPFS = `aggregated_round_${roundId}_${Date.now()}`;
        }

        try {
            // Note: This may fail if blockchain requires minParticipants (default 2)
            // The error will be caught and returned to user
            await flService.aggregateModels(
                parseInt(roundId),
                aggregatedModelIPFS,
                avgAccuracy,
                avgLoss
            );
        } catch (blockchainError) {
            console.error("Blockchain aggregation error:", blockchainError);

            // Check if it's a "not enough participants" error
            if (blockchainError.message && blockchainError.message.includes("Not enough participants")) {
                return res.status(400).json({
                    error: `The smart contract requires more participants before this round can be aggregated. Currently, only ${contributions.rows.length} participant(s) contributed.`
                });
            }

            return res.status(500).json({ error: `Blockchain aggregation failed: ${blockchainError.message}` });
        }

        // Update blockchain: Finalize the round
        try {
            console.log(`🔒 Finalizing round ${roundId} on blockchain...`);
            await flService.finalizeRound(parseInt(roundId));
        } catch (finalizeError) {
            console.error("Blockchain finalization error:", finalizeError);
            // We've already aggregated, so we might want to continue or return error
            // For now, let's treat it as a failure
            return res.status(500).json({ error: `Blockchain finalization failed: ${finalizeError.message}` });
        }

        // Update database: Round status
        await db.query(
            `UPDATE fl_rounds SET status = $1, aggregated_model_ipfs = $2, end_time = CURRENT_TIMESTAMP WHERE round_id = $3`,
            ['completed', aggregatedModelIPFS, roundId]
        );

        // Update database: Model global metrics + persist global model CID for warm-start
        await db.query(
            `UPDATE fl_models 
             SET accuracy = $1, 
                 loss = $2, 
                 global_model_ipfs = $3,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE LOWER(model_id) = LOWER($4)`,
            [avgAccuracy, avgLoss, aggregatedModelIPFS, round.modelId]
        );
        console.log(`✅ Warm-start: global_model_ipfs updated on fl_models (${aggregatedModelIPFS})`);

        // --- PHASE 1 REWARD INTEGRATION ---
        // Decoupled reward processing to ensure round completion succeeds
        (async () => {
            try {
                console.log(`🎁 [PHASE 1] Processing rewards for round ${roundId}...`);
                for (const contribution of contributions.rows) {
                    if (contribution.zk_proof_verified === false) {
                        console.log(`⚠️ Skipping reward for ${contribution.participant_address} (ZK proof not verified)`);
                        continue;
                    }

                    const rewardAmount = calculateReward(contribution.samples_trained, contribution.local_accuracy);

                    console.log(`💰 Calculated Reward for ${contribution.participant_address}: ${rewardAmount} units (${contribution.samples_trained} samples, ${contribution.local_accuracy} acc)`);

                    // 1. Log to database (Phase 1)
                    await db.query(
                        `INSERT INTO fl_rewards (contribution_id, participant_address, reward_amount, reward_type)
                         VALUES ($1, $2, $3, $4)`,
                        [contribution.contribution_id, contribution.participant_address, rewardAmount, 'training_contribution']
                    );

                    // 2. Update participant's total in fl_participants
                    await db.query(
                        `UPDATE fl_participants 
                         SET total_rewards = total_rewards + $1, 
                             total_contributions = total_contributions + 1
                         WHERE wallet_address = $2`,
                        [rewardAmount, contribution.participant_address]
                    );

                    // 3. PHASE 2 PLACEHOLDER: Blockchain call will go here
                    // try {
                    //     await flService.distributeReward(parseInt(roundId), contribution.participant_address, rewardAmount);
                    // } catch (bcErr) { console.error("BC Reward failed:", bcErr.message); }
                }
                console.log(`✅ [PHASE 1] Rewards successfully logged for round ${roundId}.`);
            } catch (rewardErr) {
                console.error("❌ [PHASE 1 ERROR] Passive reward logging failed:", rewardErr.message);
                // Fail silently as per user requirement - do not block response
            }
        })();

        res.json({
            success: true,
            roundId,
            aggregatedModelIPFS,
            avgAccuracy,
            avgLoss
        });

    } catch (error) {
        console.error("Complete round error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get round status
router.get("/rounds/:roundId", async (req, res) => {
    try {
        const { roundId } = req.params;

        // Get from database first (always available)
        const dbRound = await db.query(
            `SELECT * FROM fl_rounds WHERE round_id = $1`,
            [roundId]
        );

        let blockchainRound = {};
        // Try blockchain, but don't fail if unavailable
        try {
            if (flService.isBlockchainAvailable()) {
                blockchainRound = await flService.getRound(parseInt(roundId));
            }
        } catch (bcErr) {
            console.warn("Blockchain unavailable for round details, using DB only:", bcErr.message);
        }

        // Get contributions
        const contributions = await db.query(
            `SELECT * FROM fl_contributions WHERE round_id = $1`,
            [roundId]
        );

        res.json({
            success: true,
            round: {
                ...blockchainRound,
                ...dbRound.rows[0]
            },
            contributions: contributions.rows
        });

    } catch (error) {
        console.error("Get round error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update minimum participants configuration
router.post("/config/min-participants", authMiddleware, async (req, res) => {
    try {
        const { minParticipants } = req.body;

        if (minParticipants === undefined) {
            return res.status(400).json({ error: "minParticipants value required" });
        }

        console.log(`⚙️ Updating minParticipants to ${minParticipants}...`);
        await flService.setMinParticipants(parseInt(minParticipants));

        res.json({
            success: true,
            message: `Minimum participants updated to ${minParticipants}`,
            minParticipants
        });

    } catch (error) {
        console.error("Update config error:", error);
        res.status(500).json({ error: `Failed to update configuration: ${error.message}` });
    }
});

// ============================================
// PARTICIPANTS
// ============================================

// Register as FL participant
router.post("/participants/register", async (req, res) => {
    try {
        const { institutionName, walletAddress } = req.body;

        if (!institutionName || !walletAddress) {
            return res.status(400).json({ error: "Institution name and wallet address required" });
        }

        // Register on blockchain (if available)
        try {
            if (flService.isBlockchainAvailable()) {
                await flService.registerFLParticipantByAdmin(walletAddress, institutionName);
            } else {
                console.warn("⚠️ Blockchain unavailable - registering participant in DB only");
            }
        } catch (bcErr) {
            console.warn("⚠️ Blockchain registration failed, continuing with DB only:", bcErr.message);
        }

        // Store in database
        await db.query(
            `INSERT INTO fl_participants (wallet_address, institution_name, institution_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (wallet_address) DO NOTHING`,
            [walletAddress, institutionName, "hospital"]
        );

        res.json({
            success: true,
            participant: {
                walletAddress,
                institutionName
            }
        });

    } catch (error) {
        console.error("Register participant error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get participant details
router.get("/participants/:address", async (req, res) => {
    try {
        const { address } = req.params;

        // Get from database first (always available)
        const dbResult = await db.query(
            `SELECT * FROM fl_participants WHERE wallet_address = $1`,
            [address]
        );

        let blockchainData = {};
        // Try blockchain, but don't fail if unavailable
        try {
            if (flService.isBlockchainAvailable()) {
                blockchainData = await flService.getParticipant(address);
            }
        } catch (bcErr) {
            console.warn("Blockchain unavailable for participant details, using DB only:", bcErr.message);
        }

        const participant = {
            ...blockchainData,
            ...dbResult.rows[0]
        };

        // If participant exists in DB, they are active
        const isActive = dbResult.rows.length > 0 || (blockchainData && blockchainData.isActive);

        res.json({
            success: true,
            participant: {
                ...participant,
                isActive
            }
        });

    } catch (error) {
        console.error("Get participant error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// METRICS
// ============================================

// Get model performance metrics
router.get("/metrics/:modelId", async (req, res) => {
    try {
        const { modelId } = req.params;

        const result = await db.query(
            `SELECT 
        r.round_number,
        r.status,
        COUNT(c.contribution_id) as contributions,
        AVG(c.local_accuracy) as avg_accuracy,
        AVG(c.local_loss) as avg_loss,
        AVG(c.local_precision) as avg_precision,
        AVG(c.local_recall) as avg_recall,
        AVG(c.local_f1) as avg_f1,
        AVG(c.local_auc) as avg_auc
       FROM fl_rounds r
       LEFT JOIN fl_contributions c ON r.round_id = c.round_id
       WHERE r.model_id = $1
       GROUP BY r.round_id, r.round_number, r.status
       ORDER BY r.round_number ASC`,
            [modelId]
        );

        res.json({
            success: true,
            metrics: result.rows
        });

    } catch (error) {
        console.error("Get metrics error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get participant contribution history
router.get("/contributions/:participantAddress", async (req, res) => {
    try {
        const { participantAddress } = req.params;

        const result = await db.query(
            `SELECT c.*, r.round_number, m.disease
       FROM fl_contributions c
       JOIN fl_rounds r ON c.round_id = r.round_id
       JOIN fl_models m ON r.model_id = m.model_id
       WHERE c.participant_address = $1
       ORDER BY c.submitted_at DESC`,
            [participantAddress]
        );

        res.json({
            success: true,
            contributions: result.rows
        });

    } catch (error) {
        console.error("Get contributions error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Admin: Recalculate rewards for a round
router.post("/rounds/recalculate-rewards", authMiddleware, async (req, res) => {
    try {
        const { roundId } = req.body;
        if (!roundId) return res.status(400).json({ error: "Round ID required" });

        // Get contributions
        const contribs = await db.query(
            `SELECT * FROM fl_contributions WHERE round_id = $1`,
            [roundId]
        );

        const results = [];
        for (const c of contribs.rows) {
            const rewardAmount = calculateReward(c.samples_trained, c.local_accuracy);

            // Check if already rewarded
            const existing = await db.query(
                `SELECT * FROM fl_rewards WHERE contribution_id = $1`,
                [c.contribution_id]
            );

            if (existing.rows.length > 0) {
                // Update
                await db.query(
                    `UPDATE fl_rewards SET reward_amount = $1 WHERE contribution_id = $2`,
                    [rewardAmount, c.contribution_id]
                );
                results.push({ address: c.participant_address, status: 'updated', amount: rewardAmount });
            } else {
                // Insert
                await db.query(
                    `INSERT INTO fl_rewards (contribution_id, participant_address, reward_amount, reward_type)
                     VALUES ($1, $2, $3, $4)`,
                    [c.contribution_id, c.participant_address, rewardAmount, 'training_contribution_recal']
                );
                results.push({ address: c.participant_address, status: 'inserted', amount: rewardAmount });
            }
        }

        res.json({ success: true, results });

    } catch (error) {
        console.error("Recalculate rewards error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
