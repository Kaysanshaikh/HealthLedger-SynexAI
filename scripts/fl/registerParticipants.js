/**
 * Register Initial FL Participants on Production
 * Run after contract deployment
 */

require("dotenv").config();
const flService = require("../services/federatedLearningService");

// Production participant addresses (update with your actual addresses)
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

async function registerParticipants() {
    console.log("🏥 Registering FL Participants on Production...\n");

    try {
        for (const participant of PARTICIPANTS) {
            console.log(`📝 Registering: ${participant.name}`);
            console.log(`   Address: ${participant.address}`);

            await flService.registerFLParticipantByAdmin(
                participant.address,
                participant.name
            );

            console.log(`✅ Registered successfully\n`);
        }

        console.log("🎉 All participants registered!");

    } catch (error) {
        console.error("❌ Registration failed:", error.message);
        throw error;
    }
}

if (require.main === module) {
    registerParticipants()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { registerParticipants };
