import { network } from "hardhat";

async function main() {
  const connection = await network.create();
  
  const networkName = connection.networkName || "sepolia";
  const { ethers } = connection as any; 

  console.log("-----------------------------------------");
  console.log("Starting Deployment on Network:", networkName);
  console.log("-----------------------------------------");

  const [deployer] = await ethers.getSigners();
  const balanceBefore = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balanceBefore)} ETH`);

  console.log("\nDeploying Native ETH Staking Contract...");
  const StakingFactory = await ethers.getContractFactory("Staking");
  
  const staking = await StakingFactory.deploy();
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log(`✅ Staking Contract deployed to: ${stakingAddress}`);

  console.log("\nFunding Staking Contract Reward Pool with native ETH...");
  const fundingAmount = ethers.parseEther("0.05"); 
  
  const fundTx = await staking.fundRewardPool({ value: fundingAmount });
  await fundTx.wait();
  console.log(`✅ Funded reward pool with ${ethers.formatEther(fundingAmount)} Sepolia ETH.`);

  const contractBalance = await ethers.provider.getBalance(stakingAddress);
  console.log(`📊 Total Staking Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);

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
