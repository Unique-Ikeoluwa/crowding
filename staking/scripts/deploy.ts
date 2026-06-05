import { network } from "hardhat";

async function main() {
  const connection = await network.create();
  
  const networkName = connection.networkName || "sepolia";
  const { ethers } = connection as any; 

  console.log("-----------------------------------------");
  console.log("Starting Deployment on Network:", networkName);
  console.log("-----------------------------------------");

  console.log("Deploying Mock Reward Token (MockERC20)...");
  const RewardTokenFactory = await ethers.getContractFactory("MockERC20");
  const rewardToken = await RewardTokenFactory.deploy("Reward Token", "RWD");
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log(`✅ Reward Token deployed to: ${rewardTokenAddress}`);

  console.log("\nDeploying Decentralized Staking Contract...");
  const StakingFactory = await ethers.getContractFactory("DecentralizedStaking");
  const staking = await StakingFactory.deploy(rewardTokenAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log(`✅ Staking Contract deployed to: ${stakingAddress}`);

  console.log("\nFunding Staking Contract with rewards...");
  const fundingAmount = ethers.parseEther("100000"); 
  const mintTx = await rewardToken.mint(stakingAddress, fundingAmount);
  await mintTx.wait();
  console.log(`✅ Minted ${ethers.formatEther(fundingAmount)} RWD tokens.`);

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
