const express = require("express");
const router = express.Router();
const flService = require("../services/federatedLearningService");
const zkProofService = require("../services/zkProofService");
const mlModelService = require("../services/mlModelService");
const db = require("../services/databaseService");

// ============================================
// FL MODEL MANAGEMENT
// ============================================

// Create new FL model
router.post("/models", async (req, res) => {
    try {
        const { disease, modelType } = req.body;

        if (!disease || !modelType) {
            return res.status(400).json({ error: "Disease and modelType required" });
        }

        // Create model on blockchain
        const modelId = await flService.createFLModel(disease, modelType);

        // Store in database
        await db.query(
            `INSERT INTO fl_models (model_id, disease, model_type, created_by) 
       VALUES ($1, $2, $3, $4)`,
            [modelId, disease, modelType, req.user?.walletAddress || "admin"]
        );

        res.json({
            success: true,
            modelId,
            disease,
            modelType
        });

    } catch (error) {
        console.error("Create model error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get all models
router.get("/models", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM fl_models ORDER BY created_at DESC`
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

// Get model details
router.get("/models/:modelId", async (req, res) => {
    try {
        const { modelId } = req.params;

        // Get from blockchain
        const model = await flService.getModel(modelId);

        // Get from database
        const dbResult = await db.query(
            `SELECT * FROM fl_models WHERE model_id = $1`,
            [modelId]
        );

        res.json({
            success: true,
            model: {
                ...model,
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
router.post("/rounds/start", async (req, res) => {
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

        res.json({
            success: true,
            roundId,
            round
        });

    } catch (error) {
        console.error("Start round error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Submit model update
router.post("/rounds/submit", async (req, res) => {
    try {
        const { roundId, modelWeights, trainingMetrics } = req.body;

        if (!roundId || !modelWeights || !trainingMetrics) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Generate ZK proof
        const proof = await zkProofService.generateProof(modelWeights, trainingMetrics);

        // Upload model to IPFS
        const modelUpdateIPFS = await mlModelService.uploadModelToIPFS(
            { modelWeights, ...trainingMetrics },
            `round-${roundId}`
        );

        // Submit to blockchain
        await flService.submitModelUpdate(
            roundId,
            modelUpdateIPFS,
            proof.proofHash,
            trainingMetrics.accuracy,
            trainingMetrics.loss,
            trainingMetrics.samplesTrained
        );

        // Store in database
        await db.query(
            `INSERT INTO fl_contributions 
       (round_id, participant_address, model_update_ipfs, zk_proof_hash, local_accuracy, local_loss, samples_trained)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                roundId,
                req.user?.walletAddress || "test-participant",
                modelUpdateIPFS,
                proof.proofHash,
                trainingMetrics.accuracy,
                trainingMetrics.loss,
                trainingMetrics.samplesTrained
            ]
        );

        res.json({
            success: true,
            proofHash: proof.proofHash,
            modelUpdateIPFS
        });

    } catch (error) {
        console.error("Submit update error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Aggregate models
router.post("/rounds/aggregate", async (req, res) => {
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
                    samplesTrained: c.samples_trained
                };
            })
        );

        // Perform FedAvg aggregation
        const aggregatedModel = mlModelService.federatedAverage(modelUpdates);

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
       SET status = 'aggregating', aggregated_model_ipfs = $1 
       WHERE round_id = $2`,
            [aggregatedIPFS, roundId]
        );

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

// Get round status
router.get("/rounds/:roundId", async (req, res) => {
    try {
        const { roundId } = req.params;

        // Get from blockchain
        const round = await flService.getRound(parseInt(roundId));

        // Get contributions
        const contributions = await db.query(
            `SELECT * FROM fl_contributions WHERE round_id = $1`,
            [roundId]
        );

        res.json({
            success: true,
            round,
            contributions: contributions.rows
        });

    } catch (error) {
        console.error("Get round error:", error);
        res.status(500).json({ error: error.message });
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

        // Register on blockchain
        await flService.registerFLParticipantByAdmin(walletAddress, institutionName);

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

        // Get from blockchain
        const participant = await flService.getParticipant(address);

        // Get from database
        const dbResult = await db.query(
            `SELECT * FROM fl_participants WHERE wallet_address = $1`,
            [address]
        );

        res.json({
            success: true,
            participant: {
                ...participant,
                ...dbResult.rows[0]
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
        AVG(c.local_loss) as avg_loss
       FROM fl_rounds r
       LEFT JOIN fl_contributions c ON r.round_id = c.round_id
       WHERE r.model_id = $1
       GROUP BY r.round_id, r.round_number, r.status
       ORDER BY r.round_number`,
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

module.exports = router;
