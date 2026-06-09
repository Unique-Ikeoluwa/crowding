// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CrowdfundingPlatform is Ownable, ReentrancyGuard, Pausable {

    enum CampaignStatus { Funding, Successful, Failed }

    struct Milestone {
        string title;
        uint256 amount;
        bool completed;
        bool approved;
        uint256 votingDeadline;
        uint256 approvalsCount;
        uint256 totalVotesCount;
    }

    struct Campaign {
        address payable creator;
        string title;
        string description;
        uint256 goal;
        uint256 deadline;
        uint256 raisedAmount;
        CampaignStatus status;
        uint256 contributorsCount;
        bool allMilestonesApproved;
    }

    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Milestone[]) public campaignMilestones;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => mapping(address => bool)) public hasClaimedRefund;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasVoted;

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, string title, uint256 goal, uint256 deadline);
    event ContributionReceived(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event MilestoneRequested(uint256 indexed campaignId, uint256 indexed milestoneId, string title, uint256 amount);
    event VoteCast(uint256 indexed campaignId, uint256 indexed milestoneId, address indexed voter, bool approve);
    event MilestoneApproved(uint256 indexed campaignId, uint256 indexed milestoneId);
    event FundsReleased(uint256 indexed campaignId, uint256 indexed milestoneId, address indexed creator, uint256 amount);
    event RefundClaimed(uint256 indexed campaignId, address indexed contributor, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function createCampaign(
        string calldata _title,
        string calldata _description,
        uint256 _goal,
        uint256 _duration,
        string[] calldata _milestoneTitles,
        uint256[] calldata _milestoneAmounts
    ) external whenNotPaused {
        require(_goal > 0, "Goal must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_milestoneTitles.length == _milestoneAmounts.length, "Milestone arrays length mismatch");

        uint256 totalMilestoneCost = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            totalMilestoneCost += _milestoneAmounts[i];
        }
        require(totalMilestoneCost == _goal, "Total milestones must equal funding goal");

        uint256 campaignId = campaignCount++;
        uint256 targetDeadline = block.timestamp + _duration;

        campaigns[campaignId] = Campaign({
            creator: payable(msg.sender),
            title: _title,
            description: _description,
            goal: _goal,
            deadline: targetDeadline,
            raisedAmount: 0,
            status: CampaignStatus.Funding,
            contributorsCount: 0,
            allMilestonesApproved: false
        });

        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            campaignMilestones[campaignId].push(Milestone({
                title: _milestoneTitles[i],
                amount: _milestoneAmounts[i],
                completed: false,
                approved: false,
                votingDeadline: 0,
                approvalsCount: 0,
                totalVotesCount: 0
            }));
        }

        emit CampaignCreated(campaignId, msg.sender, _title, _goal, targetDeadline);
    }

    function contribute(uint256 _campaignId) external payable whenNotPaused nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp <= campaign.deadline, "Campaign funding period has ended");
        require(campaign.status == CampaignStatus.Funding, "Campaign is not accepting funds");
        require(msg.value > 0, "Contribution must be greater than 0");

        if (contributions[_campaignId][msg.sender] == 0) {
            campaign.contributorsCount++;
        }

        contributions[_campaignId][msg.sender] += msg.value;
        campaign.raisedAmount += msg.value;

        emit ContributionReceived(_campaignId, msg.sender, msg.value);

        if (campaign.raisedAmount >= campaign.goal) {
            campaign.status = CampaignStatus.Successful;
        }
    }

    function requestMilestonePayout(uint256 _campaignId, uint256 _milestoneId) external whenNotPaused {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Only campaign creator can request payout");
        
        updateFailedCampaignStatus(_campaignId);
        require(campaign.status == CampaignStatus.Successful, "Campaign was not successful");

        Milestone storage milestone = campaignMilestones[_campaignId][_milestoneId];
        require(!milestone.completed && !milestone.approved, "Milestone already requested or processed");
        require(_milestoneId == 0 || campaignMilestones[_campaignId][_milestoneId - 1].approved, "Previous milestones must be approved first");

        milestone.votingDeadline = block.timestamp + VOTING_PERIOD;
        milestone.completed = true;

        emit MilestoneRequested(_campaignId, _milestoneId, milestone.title, milestone.amount);
    }

    function voteOnMilestone(uint256 _campaignId, uint256 _milestoneId, bool _approve) external whenNotPaused nonReentrant {
        require(contributions[_campaignId][msg.sender] > 0, "Only contributors can vote");
        require(!hasVoted[_campaignId][_milestoneId][msg.sender], "Double voting prevention enforced");

        Milestone storage milestone = campaignMilestones[_campaignId][_milestoneId];
        require(milestone.completed && !milestone.approved, "Milestone not open for voting");
        require(block.timestamp <= milestone.votingDeadline, "Voting window has closed");

        hasVoted[_campaignId][_milestoneId][msg.sender] = true;
        milestone.totalVotesCount++;

        if (_approve) {
            milestone.approvalsCount++;
        }

        emit VoteCast(_campaignId, _milestoneId, msg.sender, _approve);

        Campaign storage campaign = campaigns[_campaignId];
        if (milestone.approvalsCount > (campaign.contributorsCount / 2)) {
            _executeMilestonePayout(_campaignId, _milestoneId);
        } 
        else if ((milestone.totalVotesCount - milestone.approvalsCount) >= (campaign.contributorsCount / 2 + 1)) {
            milestone.completed = false;
            milestone.totalVotesCount = 0;
            milestone.approvalsCount = 0;
        }

    }

    function finalizeMilestoneVoting(uint256 _campaignId, uint256 _milestoneId) external nonReentrant {
        Milestone storage milestone = campaignMilestones[_campaignId][_milestoneId];
        require(milestone.completed && !milestone.approved, "Milestone voting invalid or already resolved");
        require(block.timestamp > milestone.votingDeadline, "Voting period is still running");

        Campaign storage campaign = campaigns[_campaignId];
        if (milestone.approvalsCount > (campaign.contributorsCount / 2)) {
            _executeMilestonePayout(_campaignId, _milestoneId);
        } else {
            milestone.completed = false;
            milestone.totalVotesCount = 0;
            milestone.approvalsCount = 0;
        }
    }

    function claimRefund(uint256 _campaignId) external nonReentrant {
        updateFailedCampaignStatus(_campaignId);
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.Failed, "Refunds only available for failed campaigns");
        
        uint256 refundValue = contributions[_campaignId][msg.sender];
        require(refundValue > 0, "No contribution recorded for this address");
        require(!hasClaimedRefund[_campaignId][msg.sender], "Double refunds prevention enforced");

        hasClaimedRefund[_campaignId][msg.sender] = true;
        contributions[_campaignId][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: refundValue}("");
        require(success, "Refund native dispatch failed");

        emit RefundClaimed(_campaignId, msg.sender, refundValue);
    }

    function _executeMilestonePayout(uint256 _campaignId, uint256 _milestoneId) internal {
        Milestone storage milestone = campaignMilestones[_campaignId][_milestoneId];
        Campaign storage campaign = campaigns[_campaignId];

        milestone.approved = true;
        emit MilestoneApproved(_campaignId, _milestoneId);

        bool allApproved = true;
        uint256 totalLength = campaignMilestones[_campaignId].length;
        for (uint256 i = 0; i < totalLength; i++) {
            if (!campaignMilestones[_campaignId][i].approved) {
                allApproved = false;
                break;
            }
        }
        campaign.allMilestonesApproved = allApproved;

        (bool success, ) = campaign.creator.call{value: milestone.amount}("");
        require(success, "Milestone distribution transfer failed");

        emit FundsReleased(_campaignId, _milestoneId, campaign.creator, milestone.amount);
    }

    function updateFailedCampaignStatus(uint256 _campaignId) public {
        Campaign storage campaign = campaigns[_campaignId];
        if (campaign.status == CampaignStatus.Funding && block.timestamp > campaign.deadline) {
            if (campaign.raisedAmount < campaign.goal) {
                campaign.status = CampaignStatus.Failed;
            } else {
                campaign.status = CampaignStatus.Successful;
            }
        }
    }

    function getMilestones(uint256 _campaignId) external view returns (Milestone[] memory) {
        return campaignMilestones[_campaignId];
    }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}