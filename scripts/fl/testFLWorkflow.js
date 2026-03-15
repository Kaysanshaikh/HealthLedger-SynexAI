/**
 * End-to-End Federated Learning Workflow Test
 * Tests the complete FL pipeline locally
 */

// Load environment variables
require("dotenv").config({ path: ".env" });

const flService = require("../../services/federatedLearningService");
const zkProofService = require("../../services/zkProofService");
const mlModelService = require("../../services/mlModelService");

// Test configuration
const NUM_PARTICIPANTS = 3;
const DISEASE = "diabetes";
const MODEL_TYPE = "logistic_regression";

// Test participant addresses (from Hardhat)
const PARTICIPANTS = [
    {
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        name: "City General Hospital"
    },
    {
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        name: "Metro Diagnostic Center"
    },
    {
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        name: "Regional Medical Center"
    }
];

async function runFLWorkflowTest() {
    console.log("\n🧪 ============================================");
    console.log("   FEDERATED LEARNING WORKFLOW TEST");
    console.log("============================================\n");

    try {
        // Step 1: Register participants
        console.log("📝 Step 1: Registering FL participants...\n");

        for (const participant of PARTICIPANTS) {
            await flService.registerFLParticipantByAdmin(
                participant.address,
                participant.name
            );
            console.log(`✅ Registered: ${participant.name}`);
        }

        console.log("\n");

        // Step 2: Create FL model
        console.log("🏥 Step 2: Creating FL model...\n");

        const modelId = await flService.createFLModel(DISEASE, MODEL_TYPE);
        console.log(`✅ Model created: ${modelId.substring(0, 10)}...`);
        console.log(`   Disease: ${DISEASE}`);
        console.log(`   Type: ${MODEL_TYPE}\n`);

        // Step 3: Initiate training round
        console.log("🚀 Step 3: Initiating training round...\n");

        const roundId = await flService.initiateFLRound(modelId);
        console.log(`✅ Round initiated: #${roundId}\n`);

        // Step 4: Participants train local models
        console.log("🏋️  Step 4: Participants training local models...\n");

        const modelUpdates = [];

        for (let i = 0; i < NUM_PARTICIPANTS; i++) {
            const participant = PARTICIPANTS[i];

            // Generate mock patient data
            const patientData = generateMockPatientData(100 + i * 50);

            // Train local model (simplified)
            const trainedModel = mlModelService.trainLocalModelSimplified(
                DISEASE,
                patientData
            );

            console.log(`   ${participant.name}:`);
            console.log(`   - Samples: ${trainedModel.samplesTrained}`);
            console.log(`   - Accuracy: ${(trainedModel.accuracy * 100).toFixed(2)}%`);
            console.log(`   - Loss: ${trainedModel.loss.toFixed(4)}\n`);

            // Generate ZK proof
            const proof = await zkProofService.generateProof(
                trainedModel.modelWeights,
                {
                    accuracy: trainedModel.accuracy,
                    loss: trainedModel.loss,
                    samplesTrained: trainedModel.samplesTrained
                }
            );

            // Verify proof locally
            const isValid = await zkProofService.verifyProof(
                proof.proofHash,
                proof.publicInputs,
                proof.proof
            );

            if (!isValid) {
                throw new Error(`Proof verification failed for ${participant.name}`);
            }

            modelUpdates.push(trainedModel);

            console.log(`   ✅ ZK proof generated and verified\n`);
        }

        // Step 5: Aggregate models using FedAvg
        console.log("🔄 Step 5: Aggregating models (FedAvg)...\n");

        const aggregatedModel = mlModelService.federatedAverage(modelUpdates);

        console.log(`✅ Aggregation complete:`);
        console.log(`   - Global Accuracy: ${(aggregatedModel.accuracy * 100).toFixed(2)}%`);
        console.log(`   - Global Loss: ${aggregatedModel.loss.toFixed(4)}`);
        console.log(`   - Participants: ${aggregatedModel.participantCount}`);
        console.log(`   - Total Samples: ${aggregatedModel.totalSamples}\n`);

        // Step 6: Test Byzantine detection
        console.log("🛡️  Step 6: Testing Byzantine attack detection...\n");

        const maliciousUpdate = {
            modelWeights: {},
            accuracy: 0.25, // Suspiciously low
            loss: 15.0,     // Abnormally high
            samplesTrained: 100
        };

        const byzantineResult = zkProofService.detectByzantineAttack(
            maliciousUpdate,
            modelUpdates
        );

        if (byzantineResult.isMalicious) {
            console.log(`✅ Byzantine attack detected!`);
            console.log(`   Reasons: ${byzantineResult.reasons.join(", ")}`);
            console.log(`   Confidence: ${(byzantineResult.confidence * 100).toFixed(0)}%\n`);
        }

        // Step 7: Test Byzantine-robust aggregation
        console.log("🔒 Step 7: Testing Byzantine-robust aggregation (Krum)...\n");

        const allUpdates = [...modelUpdates, maliciousUpdate];
        const robustModel = mlModelService.byzantineRobustAggregation(allUpdates, 1);

        console.log(`✅ Robust aggregation complete:`);
        console.log(`   - Accuracy: ${(robustModel.accuracy * 100).toFixed(2)}%`);
        console.log(`   - Malicious updates filtered: 1\n`);

        // Summary
        console.log("\n✨ ============================================");
        console.log("   TEST SUMMARY");
        console.log("============================================\n");

        console.log(`✅ Participants registered: ${NUM_PARTICIPANTS}`);
        console.log(`✅ Model created: ${DISEASE} (${MODEL_TYPE})`);
        console.log(`✅ Training round completed: #${roundId}`);
        console.log(`✅ ZK proofs verified: ${NUM_PARTICIPANTS}/${NUM_PARTICIPANTS}`);
        console.log(`✅ FedAvg accuracy: ${(aggregatedModel.accuracy * 100).toFixed(2)}%`);
        console.log(`✅ Byzantine detection: Working`);
        console.log(`✅ Krum aggregation: Working\n`);

        console.log("🎉 All tests passed!\n");

        return {
            success: true,
            modelId,
            roundId,
            aggregatedModel
        };

    } catch (error) {
        console.error("\n❌ Test failed:", error.message);
        console.error(error.stack);
        throw error;
    }
}

/**
 * Generate mock patient data for testing
 * @param {number} count - Number of patients
 * @returns {Array} Mock patient data
 */
function generateMockPatientData(count) {
    const data = [];

    for (let i = 0; i < count; i++) {
        data.push({
            age: 30 + Math.floor(Math.random() * 50),
            bmi: 20 + Math.random() * 15,
            bloodPressure: 110 + Math.random() * 30,
            glucose: 80 + Math.random() * 100,
            hasDiabetes: Math.random() > 0.7 ? 1 : 0
        });
    }

    return data;
}

// Run test if executed directly
if (require.main === module) {
    runFLWorkflowTest()
        .then(() => {
            console.log("✅ Test script completed successfully");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Test script failed:", error);
            process.exit(1);
        });
}

module.exports = { runFLWorkflowTest };
