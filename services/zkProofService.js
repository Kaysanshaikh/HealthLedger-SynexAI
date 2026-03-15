const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

/**
 * ZK Proof Service for Federated Learning
 * Handles ZK-SNARK proof generation and verification
 * 
 * NOTE: This is a simplified implementation for development.
 * In production, you would use actual circom circuits and trusted setup.
 */

const CIRCUIT_DIR = path.join(__dirname, "..", "circuits");
const PROOF_CACHE = new Map();

/**
 * Generate a ZK proof for model training
 * @param {Object} modelWeights - Model weights
 * @param {Object} trainingMetrics - Training metrics (accuracy, loss, samples)
 * @returns {Promise<Object>} Proof object with data and public signals
 */
async function generateProof(modelWeights, trainingMetrics) {
    try {
        console.log("🔐 Generating ZK proof for model training...");

        // Production-ready data preparation
        // We take a subset of weights for the prototype hashing
        const weightSubset = Array.isArray(modelWeights.output)
            ? modelWeights.output.slice(0, 10).map(w => Math.floor(w * 1000000))
            : Array(10).fill(0);

        while (weightSubset.length < 10) weightSubset.push(0);

        const salt = Math.floor(Math.random() * 1000000);

        // Prepare inputs for the ModelTraining circuit
        const inputs = {
            modelWeightsRaw: weightSubset,
            salt: salt,
            accuracy: Math.floor(trainingMetrics.accuracy * 10000),
            loss: Math.floor(trainingMetrics.loss * 1000000),
            samplesTrained: trainingMetrics.samplesTrained,
            modelWeightsHash: hashModelWeights({ weights: weightSubset, salt })
        };

        // Generate real proof via snarkjs
        const wasmPath = path.join(CIRCUIT_DIR, "ModelTraining_js", "ModelTraining.wasm");
        const zkeyPath = path.join(CIRCUIT_DIR, "ModelTraining_final.zkey");

        if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
            throw new Error("❌ Production ZK circuits missing. Please run 'npm run fl:setup' to build the ZK infrastructure.");
        }
        
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            wasmPath,
            zkeyPath
        );

        const finalProof = {
            proof,
            publicSignals,
            publicInputs: publicSignals, // mapping for verification helper
            proofHash: ethers.id(JSON.stringify(proof)),
            isReal: true
        };
        
        // Cache the proof if necessary
        PROOF_CACHE.set(finalProof.proofHash, { ...finalProof, inputs });
        
        return finalProof;

    } catch (error) {
        console.error("❌ Proof generation failed:", error.message);
        throw new Error(`Proof generation failed: ${error.message}`);
    }
}

/**
 * Generate proof for production using circom circuit
 * @param {string} circuitPath - Path to compiled circuit
 * @param {Object} inputs - Circuit inputs
 * @returns {Promise<Object>} Groth16 proof
 */
async function generateProductionProof(circuitPath, inputs) {
    try {
        const wasmPath = path.join(CIRCUIT_DIR, `${circuitPath}.wasm`);
        const zkeyPath = path.join(CIRCUIT_DIR, `${circuitPath}.zkey`);

        if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
            throw new Error("Circuit files not found. Run: npm run fl:setup");
        }

        // Generate witness
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            wasmPath,
            zkeyPath
        );

        return {
            proof,
            publicSignals,
            proofHash: ethers.id(JSON.stringify(proof))
        };

    } catch (error) {
        console.error("❌ Production proof generation failed:", error.message);
        throw error;
    }
}

// ============================================
// PROOF VERIFICATION
// ============================================

/**
 * Verify a ZK proof locally
 * @param {string} proofHash - Proof hash (retained for signature matching)
 * @param {Array} publicInputs - Public inputs 
 * @param {Object} proofObj - The actual Groth16 proof object required for real validation
 * @returns {Promise<boolean>} Verification result
 */
async function verifyProof(proofHash, publicInputs, proofObj) {
    try {
        console.log("🔍 Cryptographically verifying ZK SNARK:", proofHash.substring(0, 10) + "...");

        const vKeyPath = path.join(CIRCUIT_DIR, "ModelTraining_verification_key.json");
        
        if (!fs.existsSync(vKeyPath)) {
            console.error("❌ Verification key missing. Run 'npm run fl:setup'");
            return false;
        }

        if (!proofObj) {
            console.error("❌ Raw Groth16 proof object omitted. Verification rejected.");
            return false;
        }

        const vKey = JSON.parse(fs.readFileSync(vKeyPath));
        const res = await snarkjs.groth16.verify(vKey, publicInputs, proofObj);

        if (res) {
            console.log("✅ Proof verified securely.");
            return true;
        } else {
            console.error("❌ Cryptographic verification failed! Proof is invalid.");
            return false;
        }

    } catch (error) {
        console.error("❌ Proof verification error:", error.message);
        return false;
    }
}

/**
 * Verify production proof using verification key
 * @param {string} circuitPath - Circuit name
 * @param {Object} proof - Groth16 proof
 * @param {Array} publicSignals - Public signals
 * @returns {Promise<boolean>} Verification result
 */
async function verifyProductionProof(circuitPath, proof, publicSignals) {
    try {
        const vKeyPath = path.join(CIRCUIT_DIR, `${circuitPath}_verification_key.json`);

        if (!fs.existsSync(vKeyPath)) {
            throw new Error("Verification key not found");
        }

        const vKey = JSON.parse(fs.readFileSync(vKeyPath));
        const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);

        return res;

    } catch (error) {
        console.error("❌ Production proof verification failed:", error.message);
        return false;
    }
}

// ============================================
// BYZANTINE ATTACK DETECTION
// ============================================

/**
 * Detect anomalous model updates (potential Byzantine attack)
 * @param {Object} contribution - Model contribution
 * @param {Array} allContributions - All contributions in round
 * @returns {Object} Detection result
 */
function detectByzantineAttack(contribution, allContributions) {
    const results = {
        isMalicious: false,
        reasons: [],
        confidence: 0
    };

    // Check 1: Accuracy too high or too low
    if (contribution.localAccuracy > 0.99) {
        results.reasons.push("Suspiciously high accuracy (>99%)");
        results.confidence += 0.3;
    }

    if (contribution.localAccuracy < 0.4) {
        results.reasons.push("Suspiciously low accuracy (<40%)");
        results.confidence += 0.4;
    }

    // Check 2: Loss anomaly
    if (contribution.localLoss > 10) {
        results.reasons.push("Abnormally high loss");
        results.confidence += 0.3;
    }

    // Check 3: Statistical outlier detection
    if (allContributions.length >= 3) {
        const accuracies = allContributions.map(c => c.localAccuracy);
        const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
        const stdDev = Math.sqrt(
            accuracies.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / accuracies.length
        );

        const zScore = Math.abs((contribution.localAccuracy - mean) / stdDev);

        if (zScore > 3) {
            results.reasons.push(`Statistical outlier (z-score: ${zScore.toFixed(2)})`);
            results.confidence += 0.4;
        }
    }

    results.isMalicious = results.confidence >= 0.5;

    return results;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Hash model weights for proof generation
 * @param {Object} modelWeights - Model weights
 * @returns {string} Hash of weights
 */
function hashModelWeights(modelWeights) {
    // In production, hash actual weight tensors
    // For now, create deterministic hash from structure
    const weightsString = JSON.stringify(modelWeights);
    return ethers.id(weightsString);
}

/**
 * Setup circom circuits (run once during initialization)
 * @returns {Promise<void>}
 */
async function setupCircuits() {
    console.log("🔧 Setting up ZK circuits...");

    // Create circuits directory
    if (!fs.existsSync(CIRCUIT_DIR)) {
        fs.mkdirSync(CIRCUIT_DIR, { recursive: true });
    }

    // In production:
    // 1. Compile circom circuits
    // 2. Generate trusted setup (powers of tau)
    // 3. Generate proving and verification keys

    console.log("📁 Circuits directory created:", CIRCUIT_DIR);
    console.log("⚠️  For production: Run circom compiler and trusted setup");
    console.log("   See: https://docs.circom.io/getting-started/installation/");
}

/**
 * Get proof from cache
 * @param {string} proofHash - Proof hash
 * @returns {Object|null} Cached proof
 */
function getCachedProof(proofHash) {
    return PROOF_CACHE.get(proofHash) || null;
}

/**
 * Clear proof cache
 */
function clearCache() {
    PROOF_CACHE.clear();
    console.log("🗑️  Proof cache cleared");
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Proof generation
    generateProof,
    generateProductionProof,

    // Proof verification
    verifyProof,
    verifyProductionProof,

    // Byzantine detection
    detectByzantineAttack,

    // Setup
    setupCircuits,

    // Utilities
    hashModelWeights,
    getCachedProof,
    clearCache
};
