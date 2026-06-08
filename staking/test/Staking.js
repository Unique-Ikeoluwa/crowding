import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Staking", function () {
  let staking, owner, user1, user2;
  let ONE_ETH, FIVE_ETH;

  before(async function () {
    ONE_ETH = hre.ethers.parseEther("1.0");
    FIVE_ETH = hre.ethers.parseEther("5.0");
  });

  beforeEach(async function () {
    [owner, user1, user2] = await hre.ethers.getSigners();

    const Staking = await hre.ethers.getContractFactory("Staking");
    staking = await Staking.deploy();
    await staking.waitForDeployment();

    await staking.connect(owner).fundRewardPool({ value: hre.ethers.parseEther("10.0") });
  });

  describe("Staking", function () {
    it("Should accept native ETH and record stake", async function () {
      await expect(staking.connect(user1).stake({ value: ONE_ETH }))
        .to.emit(staking, "StakeCreated");
      
      const stake = await staking.userStakes(user1.address, 0);
      expect(stake.amount).to.equal(ONE_ETH);
      expect(await staking.totalStaked()).to.equal(ONE_ETH);
    });

    it("Should fail if staking 0 ETH", async function () {
      await expect(staking.connect(user1).stake({ value: 0 }))
        .to.be.revertedWith("Cannot stake zero ETH");
    });
  });

  describe("Rewards", function () {
    it("Should accumulate rewards correctly (8% tier for 1 ETH)", async function () {
      await staking.connect(user1).stake({ value: ONE_ETH });
      
      await time.increase(365 * 24 * 60 * 60);

      const reward = await staking.calculateReward(user1.address, 0);
      
      const expectedReward = hre.ethers.parseEther("0.08");
      const variance = hre.ethers.parseEther("0.001");
      
      expect(reward).to.be.within(expectedReward - variance, expectedReward + variance);
    });

    it("Should allow claiming rewards without unstaking", async function () {
      await staking.connect(user1).stake({ value: ONE_ETH });
      await time.increase(365 * 24 * 60 * 60);

      const balanceBefore = await hre.ethers.provider.getBalance(user1.address);
      
      const tx = await staking.connect(user1).claimReward(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await hre.ethers.provider.getBalance(user1.address);
      
      expect(balanceAfter).to.be.gt(balanceBefore - gasCost);
      
      const stake = await staking.userStakes(user1.address, 0);
      expect(stake.active).to.be.true;
    });
  });

  describe("Withdrawals & Penalties", function () {
    it("Should apply 10% penalty for withdrawal before 7 days", async function () {
      await staking.connect(user1).stake({ value: ONE_ETH });
      
      const initialBalance = await hre.ethers.provider.getBalance(user1.address);
      
      const tx = await staking.connect(user1).unstake(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await hre.ethers.provider.getBalance(user1.address);

      const netReturned = finalBalance - initialBalance + gasUsed;
      const expectedReturned = hre.ethers.parseEther("0.9");

      expect(netReturned).to.equal(expectedReturned);
      expect(await staking.totalPenaltiesCollected()).to.equal(hre.ethers.parseEther("0.1"));
    });
  });

  describe("Ownership & Controls", function () {
    it("Should only allow owner to pause", async function () {
      await expect(staking.connect(user1).pause())
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);

      await staking.connect(owner).pause();
      expect(await staking.paused()).to.be.true;
    });

    it("Should allow emergency withdrawal when mode is enabled", async function () {
      await staking.connect(user1).stake({ value: ONE_ETH });
      await staking.connect(owner).toggleEmergencyMode();

      await staking.connect(user1).emergencyWithdraw(0);
      const stake = await staking.userStakes(user1.address, 0);
      expect(stake.active).to.be.false;
    });
  });
});
