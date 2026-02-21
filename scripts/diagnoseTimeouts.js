const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const results = [];
    results.push(`Checking HealthLedgerFL contract at: ${contractAddress}`);

    // Get the contract instance
    const HealthLedgerFL = await ethers.getContractFactory("HealthLedgerFL");
    const contract = HealthLedgerFL.attach(contractAddress);

    const globalTimeout = await contract.roundTimeout();
    results.push(`[GLOBAL] roundTimeout variable: ${globalTimeout} seconds`);

    // To find the failing round, let's just check the last 5 rounds
    const currentRoundCounter = await contract.roundCounter();
    results.push(`Total Rounds Initiated: ${currentRoundCounter}`);

    const start = currentRoundCounter > 5n ? currentRoundCounter - 5n : 1n;

    for (let i = start; i <= currentRoundCounter; i++) {
        const roundDetails = await contract.getRound(i);
        const now = Math.floor(Date.now() / 1000);
        const timeoutAt = Number(roundDetails.timeoutAt);

        results.push(`\n--- Round ID: ${i} ---`);
        results.push(`Status: ${roundDetails.status}`);
        results.push(`Model ID: ${roundDetails.modelId}`);
        results.push(`Timeout At: ${new Date(timeoutAt * 1000).toLocaleString()}`);
        results.push(`Current Time: ${new Date(now * 1000).toLocaleString()}`);

        if (now > timeoutAt) {
            results.push(`❌ STATUS: TIMEOUT EXCEEDED by ${now - timeoutAt} seconds`);
        } else {
            results.push(`✅ STATUS: ACTIVE (expires in ${timeoutAt - now} seconds)`);
        }
    }

    fs.writeFileSync("timeout_results.json", JSON.stringify(results, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
