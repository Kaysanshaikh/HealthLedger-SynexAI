const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Updating HealthLedgerFL roundTimeout...");

    const contractAddress = process.env.CONTRACT_ADDRESS || "0xd5EBF37E367445Da0f22c9C07e54B31DAd44A90b";

    const [signer] = await hre.ethers.getSigners();
    console.log(`Using signer: ${signer.address}`);

    const HealthLedgerFL = await hre.ethers.getContractFactory("HealthLedgerFL");
    const contract = HealthLedgerFL.attach(contractAddress);

    // 24 hours in seconds
    const newTimeout = 86400;

    console.log(`Updating round timeout to ${newTimeout} seconds...`);
    const tx = await contract.setRoundTimeout(newTimeout);
    await tx.wait();

    const currentTimeout = await contract.roundTimeout();

    console.log(`✅ roundTimeout successfully updated to: ${currentTimeout.toString()}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
