const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ADMIN_ADDRESS || deployer.address;

  console.log('Deployer:', deployer.address);
  console.log('Admin:', admin);
  const net = await ethers.provider.getNetwork();
  console.log('Network:', net.name, Number(net.chainId));

  const Factory = await ethers.getContractFactory('HealthLedgerFL');
  const contract = await Factory.deploy(admin);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('HealthLedgerFL deployed at:', address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
