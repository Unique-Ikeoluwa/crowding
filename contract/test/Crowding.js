const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("CrowdfundingPlatform", function () {
  let crowdfunding;
  let owner, creator, backer1, backer2;
  let GOAL, DURATION;

  async function increaseTime(seconds) {
    await network.provider.send("evm_increaseTime", [seconds]);
    await network.provider.send("evm_mine");
  }

  before(async function () {
    const networkName = network.name; 
    [owner, creator, backer1, backer2] = await ethers.getSigners();
  });

  beforeEach(async function () {
    GOAL = ethers.parseEther("2.0");
    DURATION = 7 * 24 * 60 * 60;
    const Crowdfunding = await ethers.getContractFactory("CrowdfundingPlatform");
    crowdfunding = await Crowdfunding.deploy();
    await crowdfunding.waitForDeployment();
  });

  describe("Campaign Creation", function () {
    it("Should create a campaign with milestone segments successfully", async function () {
      const titles = ["Milestone 1", "Milestone 2"];
      const amounts = [ethers.parseEther("1.0"), ethers.parseEther("1.0")];
      await expect(
        crowdfunding.connect(creator).createCampaign("Build App", "Web3 App", GOAL, DURATION, titles, amounts)
      ).to.emit(crowdfunding, "CampaignCreated");
      const campaign = await crowdfunding.campaigns(0);
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.goal).to.equal(GOAL);
    });

    it("Should fail if total milestones do not equal the funding goal", async function () {
      const titles = ["Milestone 1"];
      const invalidAmounts = [ethers.parseEther("1.0")];
      await expect(
        crowdfunding.connect(creator).createCampaign("Build App", "Web3 App", GOAL, DURATION, titles, invalidAmounts)
      ).to.be.revertedWith("Total milestones must equal funding goal");
    });
  });

  describe("Funding Mechanics", function () {
    it("Should accept contributions and update total raised funds", async function () {
      const titles = ["Milestone 1"];
      const amounts = [GOAL];
      await crowdfunding.connect(creator).createCampaign("Build App", "Web3 App", GOAL, DURATION, titles, amounts);
      const depositAmount = ethers.parseEther("1.0");
      await expect(crowdfunding.connect(backer1).contribute(0, { value: depositAmount }))
        .to.emit(crowdfunding, "ContributionReceived")
        .withArgs(0, backer1.address, depositAmount);
      const campaign = await crowdfunding.campaigns(0);
      expect(campaign.raisedAmount).to.equal(depositAmount);
    });
  });

  describe("Milestone Escrow & Voting", function () {
    beforeEach(async function () {
      const titles = ["Milestone 1", "Milestone 2"];
      const amounts = [ethers.parseEther("1.0"), ethers.parseEther("1.0")];
      await crowdfunding.connect(creator).createCampaign("Build App", "Web3 App", GOAL, DURATION, titles, amounts);
      await crowdfunding.connect(backer1).contribute(0, { value: ethers.parseEther("1.0") });
      await crowdfunding.connect(backer2).contribute(0, { value: ethers.parseEther("1.0") });
    });

    it("Should allow the creator to request a milestone payout", async function () {
      await expect(crowdfunding.connect(creator).requestMilestonePayout(0, 0))
        .to.emit(crowdfunding, "MilestoneRequested");
    });

    it("Should release escrow funds to creator upon majority votes", async function () {
      await crowdfunding.connect(creator).requestMilestonePayout(0, 0);
      await crowdfunding.connect(backer1).voteOnMilestone(0, 0, true);
      await expect(crowdfunding.connect(backer2).voteOnMilestone(0, 0, true))
        .to.emit(crowdfunding, "FundsReleased");
    });

    it("Should prevent unauthorized milestone release or double voting", async function () {
      await crowdfunding.connect(creator).requestMilestonePayout(0, 0);
      await crowdfunding.connect(backer1).voteOnMilestone(0, 0, true);      
      await expect(
        crowdfunding.connect(backer1).voteOnMilestone(0, 0, true)
      ).to.be.revertedWith("Double voting prevention enforced");
    });

    it("Should handle milestone rejection or non-contributor intervention securely", async function () {
      await crowdfunding.connect(creator).requestMilestonePayout(0, 0);
      await expect(
        crowdfunding.connect(owner).voteOnMilestone(0, 0, true)
      ).to.be.revertedWith("Only contributors can vote");
    });
  });

  describe("Refund Systems", function () {
    it("Should allow backers to claim refunds if campaign expires unreached", async function () {
      const titles = ["Milestone 1"];
      const amounts = [GOAL];
      await crowdfunding.connect(creator).createCampaign("Build App", "Web3 App", GOAL, DURATION, titles, amounts);
      await crowdfunding.connect(backer1).contribute(0, { value: ethers.parseEther("0.5") });
      await increaseTime(DURATION + 1);
      await expect(crowdfunding.connect(backer1).claimRefund(0))
        .to.emit(crowdfunding, "RefundClaimed");
    });

    it("Should strictly enforce double refund prevention", async function () {
      const titles = ["Milestone 1"];
      const amounts = [GOAL];
      await crowdfunding.connect(creator).createCampaign("Build App", "Web3 App", GOAL, DURATION, titles, amounts);
      await crowdfunding.connect(backer1).contribute(0, { value: ethers.parseEther("0.5") });
      
      await increaseTime(DURATION + 1);
      await expect(crowdfunding.connect(backer1).claimRefund(0)).to.emit(crowdfunding, "RefundClaimed");
      await expect(
        crowdfunding.connect(backer1).claimRefund(0)
      ).to.be.revertedWith("No contribution recorded for this address"); 
    });
  });
});
