const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying HealthLedgerFL contract...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy HealthLedgerFL (which inherits from HealthLedger)
  const HealthLedgerFL = await hre.ethers.getContractFactory("HealthLedgerFL");
  
  console.log("\n📝 Deploying HealthLedgerFL...");
  const healthLedgerFL = await HealthLedgerFL.deploy(deployer.address);
  
  await healthLedgerFL.waitForDeployment();
  const contractAddress = await healthLedgerFL.getAddress();

  console.log("\n✅ HealthLedgerFL deployed to:", contractAddress);
  console.log("\n📋 Contract Details:");
  console.log("   - Admin:", deployer.address);
  console.log("   - Network:", hre.network.name);
  console.log("   - Block:", await hre.ethers.provider.getBlockNumber());

  // Verify roles
  const ADMIN_ROLE = await healthLedgerFL.ADMIN_ROLE();
  const FL_PARTICIPANT_ROLE = await healthLedgerFL.FL_PARTICIPANT_ROLE();
  
  console.log("\n🔑 Role Hashes:");
  console.log("   - ADMIN_ROLE:", ADMIN_ROLE);
  console.log("   - FL_PARTICIPANT_ROLE:", FL_PARTICIPANT_ROLE);

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
    roles: {
      ADMIN_ROLE: ADMIN_ROLE,
      FL_PARTICIPANT_ROLE: FL_PARTICIPANT_ROLE
    }
  };

  fs.writeFileSync(
    "./deployment-fl-local.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployment-fl-local.json");
  console.log("\n⚠️  IMPORTANT: Update your .env file with:");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
