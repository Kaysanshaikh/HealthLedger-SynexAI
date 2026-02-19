const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load contract artifact
const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "HealthLedgerFL.sol",
    "HealthLedgerFL.json"
);

let artifact, provider, wallet, contract;
let blockchainAvailable = false;

// Initialize connection (non-throwing)
function initialize() {
    if (blockchainAvailable && contract) {
        return { provider, wallet, contract };
    }

    if (!fs.existsSync(artifactPath)) {
        console.warn("⚠️ Contract artifact not found. Blockchain features disabled. Run: npx hardhat compile");
        blockchainAvailable = false;
        return null;
    }

    try {
        artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

        const rpcUrl = process.env.POLYGON_AMOY_RPC || process.env.RPC_URL || "http://127.0.0.1:8545";
        provider = new ethers.JsonRpcProvider(rpcUrl);
        wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, artifact.abi, wallet);

        blockchainAvailable = true;
        return { provider, wallet, contract };
    } catch (err) {
        console.warn("⚠️ Blockchain initialization failed:", err.message);
        blockchainAvailable = false;
        return null;
    }
}

/**
 * Check if blockchain is available
 * @returns {boolean}
 */
function isBlockchainAvailable() {
    if (blockchainAvailable) return true;
    // Try to initialize once more
    const result = initialize();
    return result !== null;
}

/**
 * Require blockchain or throw a clear error
 */
function requireBlockchain() {
    const result = initialize();
    if (!result) {
        throw new Error("Blockchain not available. Contract artifact missing or RPC unreachable. Ensure npx hardhat compile has been run and RPC_URL is set.");
    }
    return result;
}

// ============================================
// FL MODEL MANAGEMENT
// ============================================

/**
 * Create a new federated learning model
 * @param {string} disease - Disease type (diabetes, cvd, cancer, pneumonia)
 * @param {string} modelType - Model architecture type
 * @returns {Promise<string>} Model ID
 */
async function createFLModel(disease, modelType) {
    const { contract } = requireBlockchain();
    const tx = await contract.createFLModel(disease, modelType);
    const receipt = await tx.wait();

    // Extract modelId from event
    const event = receipt.logs.find(log => {
        try {
            return contract.interface.parseLog(log).name === "FLModelCreated";
        } catch {
            return false;
        }
    });

    if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed.args.modelId;
    }

    throw new Error("Model creation failed - no event emitted");
}

/**
 * Get model details
 * @param {string} modelId - Model ID
 * @returns {Promise<Object>} Model details
 */
async function getModel(modelId) {
    const { contract } = requireBlockchain();
    const model = await contract.getModel(modelId);

    return {
        modelId: model.modelId,
        disease: model.disease,
        modelType: model.modelType,
        currentRound: Number(model.currentRound),
        globalModelIPFS: model.globalModelIPFS,
        accuracy: Number(model.accuracy) / 10000, // Convert from scaled value
        loss: Number(model.loss) / 1000000,
        totalParticipants: Number(model.totalParticipants),
        createdBy: model.createdBy,
        createdAt: Number(model.createdAt),
        isActive: model.isActive
    };
}

/**
 * Get all models
 * @returns {Promise<Array>} Array of model IDs
 */
async function getAllModels() {
    const { contract } = requireBlockchain();
    return await contract.getAllModels();
}

// ============================================
// FL ROUND MANAGEMENT
// ============================================

/**
 * Initiate a new training round
 * @param {string} modelId - Model ID
 * @returns {Promise<number>} Round ID
 */
async function initiateFLRound(modelId) {
    const { contract } = requireBlockchain();
    const tx = await contract.initiateFLRound(modelId);
    const receipt = await tx.wait();

    // Extract roundId from event
    const event = receipt.logs.find(log => {
        try {
            return contract.interface.parseLog(log).name === "FLRoundInitiated";
        } catch {
            return false;
        }
    });

    if (event) {
        const parsed = contract.interface.parseLog(event);
        return Number(parsed.args.roundId);
    }

    throw new Error("Round initiation failed");
}

/**
 * Get round details
 * @param {number} roundId - Round ID
 * @returns {Promise<Object>} Round details
 */
async function getRound(roundId) {
    const { contract } = requireBlockchain();
    const round = await contract.getRound(roundId);

    const statusMap = ["initiated", "training", "aggregating", "completed", "failed"];

    return {
        roundId: Number(round.roundId),
        modelId: round.modelId,
        roundNumber: Number(round.roundNumber),
        status: statusMap[Number(round.status)],
        minParticipants: Number(round.minParticipants),
        currentParticipants: Number(round.currentParticipants),
        aggregatedModelIPFS: round.aggregatedModelIPFS,
        startTime: Number(round.startTime),
        endTime: Number(round.endTime),
        timeoutAt: Number(round.timeoutAt)
    };
}

// ============================================
// PARTICIPANT MANAGEMENT
// ============================================

/**
 * Register as FL participant
 * @param {string} institutionName - Name of institution
 * @returns {Promise<Object>} Transaction receipt
 */
async function registerFLParticipant(institutionName) {
    const { contract } = requireBlockchain();
    const tx = await contract.registerFLParticipant(institutionName);
    return await tx.wait();
}

/**
 * Register participant by admin
 * @param {string} participantAddress - Participant wallet address
 * @param {string} institutionName - Name of institution
 * @returns {Promise<Object>} Transaction receipt
 */
async function registerFLParticipantByAdmin(participantAddress, institutionName) {
    const { contract } = requireBlockchain();
    const tx = await contract.registerFLParticipantByAdmin(participantAddress, institutionName);
    return await tx.wait();
}

/**
 * Get participant details
 * @param {string} participantAddress - Participant wallet address
 * @returns {Promise<Object>} Participant details
 */
async function getParticipant(participantAddress) {
    const { contract } = requireBlockchain();
    const participant = await contract.getParticipant(participantAddress);

    return {
        walletAddress: participant.walletAddress,
        institutionName: participant.institutionName,
        totalContributions: Number(participant.totalContributions),
        totalRewards: Number(participant.totalRewards),
        reputationScore: Number(participant.reputationScore) / 100,
        isActive: participant.isActive,
        registeredAt: Number(participant.registeredAt)
    };
}

// ============================================
// MODEL CONTRIBUTION
// ============================================

/**
 * Submit model update with ZK proof
 * @param {number} roundId - Round ID
 * @param {string} modelUpdateIPFS - IPFS hash of model update
 * @param {string} zkProofHash - Hash of ZK proof
 * @param {number} localAccuracy - Local accuracy (0-1)
 * @param {number} localLoss - Local loss
 * @param {number} samplesTrained - Number of samples
 * @returns {Promise<Object>} Transaction receipt
 */
async function submitModelUpdate(roundId, modelUpdateIPFS, zkProofHash, localAccuracy, localLoss, samplesTrained) {
    const { contract } = requireBlockchain();

    // Scale accuracy and loss for on-chain storage
    const scaledAccuracy = Math.floor(localAccuracy * 10000);
    const scaledLoss = Math.floor(localLoss * 1000000);

    const tx = await contract.submitModelUpdate(
        roundId,
        modelUpdateIPFS,
        zkProofHash,
        scaledAccuracy,
        scaledLoss,
        samplesTrained
    );

    return await tx.wait();
}

/**
 * Verify ZK proof
 * @param {number} roundId - Round ID
 * @param {string} participantAddress - Participant address
 * @param {string} proofHash - Proof hash
 * @returns {Promise<boolean>} Verification result
 */
async function verifyZKProof(roundId, participantAddress, proofHash) {
    const { contract } = requireBlockchain();
    const tx = await contract.verifyZKProof(roundId, participantAddress, proofHash);
    const receipt = await tx.wait();

    // Extract verification result from event
    const event = receipt.logs.find(log => {
        try {
            return contract.interface.parseLog(log).name === "ZKProofVerified";
        } catch {
            return false;
        }
    });

    if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed.args.result;
    }

    return false;
}

/**
 * Get contribution details
 * @param {number} roundId - Round ID
 * @param {string} participantAddress - Participant address
 * @returns {Promise<Object>} Contribution details
 */
async function getContribution(roundId, participantAddress) {
    const { contract } = requireBlockchain();
    const contribution = await contract.getContribution(roundId, participantAddress);

    return {
        participant: contribution.participant,
        modelUpdateIPFS: contribution.modelUpdateIPFS,
        zkProofHash: contribution.zkProofHash,
        verified: contribution.verified,
        localAccuracy: Number(contribution.localAccuracy) / 10000,
        localLoss: Number(contribution.localLoss) / 1000000,
        samplesTrained: Number(contribution.samplesTrained),
        submittedAt: Number(contribution.submittedAt)
    };
}

// ============================================
// AGGREGATION
// ============================================

/**
 * Aggregate models (FedAvg)
 * @param {number} roundId - Round ID
 * @param {string} aggregatedModelIPFS - IPFS hash of aggregated model
 * @param {number} newAccuracy - New global accuracy (0-1)
 * @param {number} newLoss - New global loss
 * @returns {Promise<Object>} Transaction receipt
 */
async function aggregateModels(roundId, aggregatedModelIPFS, newAccuracy, newLoss) {
    const { contract } = requireBlockchain();

    const scaledAccuracy = Math.floor(newAccuracy * 10000);
    const scaledLoss = Math.floor(newLoss * 1000000);

    const tx = await contract.aggregateModels(roundId, aggregatedModelIPFS, scaledAccuracy, scaledLoss);
    return await tx.wait();
}

/**
 * Set minimum participants for a specific round
 * @param {number} roundId - Round ID
 * @param {number} minParticipants - Minimum participants required
 * @returns {Promise<Object>} Transaction receipt
 */
async function setRoundMinParticipants(roundId, minParticipants) {
    const { contract } = requireBlockchain();
    const tx = await contract.setRoundMinParticipants(roundId, minParticipants);
    return await tx.wait();
}

/**
 * Finalize round
 * @param {number} roundId - Round ID
 * @returns {Promise<Object>} Transaction receipt
 */
async function finalizeRound(roundId) {
    const { contract } = requireBlockchain();
    const tx = await contract.finalizeRound(roundId);
    return await tx.wait();
}

// ============================================
// BYZANTINE DETECTION
// ============================================

/**
 * Report Byzantine attack
 * @param {number} roundId - Round ID
 * @param {string} participantAddress - Malicious participant
 * @param {string} reason - Reason for flagging
 * @returns {Promise<Object>} Transaction receipt
 */
async function reportByzantineAttack(roundId, participantAddress, reason) {
    const { contract } = requireBlockchain();
    const tx = await contract.reportByzantineAttack(roundId, participantAddress, reason);
    return await tx.wait();
}

// ============================================
// REWARDS
// ============================================

/**
 * Distribute reward
 * @param {number} roundId - Round ID
 * @param {string} participantAddress - Participant address
 * @param {number} amount - Reward amount
 * @returns {Promise<Object>} Transaction receipt
 */
async function distributeReward(roundId, participantAddress, amount) {
    const { contract } = requireBlockchain();
    const tx = await contract.distributeReward(roundId, participantAddress, amount);
    return await tx.wait();
}

/**
 * Update minimum participants for a round
 * @param {number} minParticipants - Minimum participants
 * @returns {Promise<Object>} Transaction receipt
 */
async function setMinParticipants(minParticipants) {
    const { contract } = requireBlockchain();
    const tx = await contract.setMinParticipants(minParticipants);
    return await tx.wait();
}

/**
 * Pause (deactivate) an FL model on the blockchain
 * @param {string} modelId - Model ID
 * @returns {Promise<Object>} Transaction receipt
 */
async function pauseModel(modelId) {
    const { contract } = requireBlockchain();
    const tx = await contract.pauseModel(modelId);
    return await tx.wait();
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Model management
    createFLModel,
    getModel,
    getAllModels,

    // Round management
    initiateFLRound,
    getRound,

    // Participant management
    registerFLParticipant,
    registerFLParticipantByAdmin,
    getParticipant,

    // Contributions
    submitModelUpdate,
    verifyZKProof,
    getContribution,

    // Aggregation
    aggregateModels,
    finalizeRound,

    // Security
    reportByzantineAttack,

    // Rewards
    distributeReward,

    // Config
    setMinParticipants,
    pauseModel,

    // Utilities
    isBlockchainAvailable,
    setRoundMinParticipants
};
