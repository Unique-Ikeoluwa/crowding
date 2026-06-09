const { ethers, network } = require("hardhat");

async function main() {
  const networkName = network.name;

  console.log("-----------------------------------------");
  console.log("Starting Deployment on Network:", networkName);
  console.log("-----------------------------------------");

  const [deployer] = await ethers.getSigners();
  const balanceBefore = await ethers.provider.getBalance(deployer.address);
  
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balanceBefore)} ETH`);

  console.log("\nDeploying Crowdfunding & Milestone Escrow Platform...");
  
  const CrowdfundingFactory = await ethers.getContractFactory("CrowdfundingPlatform");
  const crowdfunding = await CrowdfundingFactory.deploy();
  
  await crowdfunding.waitForDeployment();
  const crowdfundingAddress = await crowdfunding.getAddress();
  
  console.log(`✅ CrowdfundingPlatform successfully deployed to: ${crowdfundingAddress}`);

  console.log("\n-----------------------------------------");
  console.log("Deployment Process Complete!");
  console.log("-----------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
