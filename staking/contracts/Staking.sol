// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Staking is Ownable, ReentrancyGuard, Pausable {

    struct Stake {
        uint256 amount;        

        uint256 timestamp;      
        uint256 lastClaimedAt;   
        bool active;             
    }

    IERC20 public immutable rewardToken; 

    uint256 public constant LOCK_PERIOD = 7 days;
    uint256 public constant PENALTY_PCT = 10;
    uint256 public constant SECONDS_IN_YEAR = 365 days;

    uint256 public totalStaked;
    uint256 public totalRewardsPaid;
    uint256 public totalPenaltiesCollected;

    bool public emergencyMode;


    mapping(address => Stake[]) public userStakes;

    event StakeCreated(address indexed user, uint256 index, uint256 amount, uint256 apr);
    event RewardClaimed(address indexed user, uint256 index, uint256 reward);
    event StakeWithdrawn(address indexed user, uint256 index, uint256 principal, uint256 reward);
    event PenaltyApplied(address indexed user, uint256 amount);
    event EmergencyModeToggled(bool enabled);

    constructor(address _rewardToken) Ownable(msg.sender) {
        rewardToken = IERC20(_rewardToken);
    }

    function stake() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Cannot stake zero ETH");

        uint256 apr = getTieredAPR(msg.value);
        
        userStakes[msg.sender].push(Stake({
            amount: msg.value,
            timestamp: block.timestamp,
            lastClaimedAt: block.timestamp,
            active: true
        }));

        totalStaked += msg.value;

        emit StakeCreated(msg.sender, userStakes[msg.sender].length - 1, msg.value, apr);
    }

    function claimReward(uint256 index) external whenNotPaused nonReentrant {
        _claimReward(msg.sender, index);
    }

    function unstake(uint256 index) external whenNotPaused nonReentrant {
        Stake storage userStake = userStakes[msg.sender][index];
        require(userStake.active, "Stake is not active or already withdrawn");
        require(!emergencyMode, "Use emergencyWithdraw during emergency mode");

        uint256 reward = calculateReward(msg.sender, index);
        uint256 principal = userStake.amount;


        userStake.active = false;
        totalStaked -= principal;

        if (block.timestamp < userStake.timestamp + LOCK_PERIOD) {
            uint256 penalty = (principal * PENALTY_PCT) / 100;
            principal -= penalty;
            totalPenaltiesCollected += penalty;
            emit PenaltyApplied(msg.sender, penalty);
        }
        if (reward > 0) {
            totalRewardsPaid += reward;
            require(rewardToken.transfer(msg.sender, reward), "Reward transfer failed");
        }

        (bool success, ) = payable(msg.sender).call{value: principal}("");

        require(success, "ETH transfer failed");

        emit StakeWithdrawn(msg.sender, index, principal, reward);
    }

    function emergencyWithdraw(uint256 index) external nonReentrant {
        require(emergencyMode, "Emergency mode is not active");
        Stake storage userStake = userStakes[msg.sender][index];
        require(userStake.active, "Stake not active");

        uint256 principal = userStake.amount;
        userStake.active = false;
        totalStaked -= principal;

        (bool success, ) = payable(msg.sender).call{value: principal}("");
        require(success, "ETH transfer failed");


        emit StakeWithdrawn(msg.sender, index, principal, 0);
    }

    function calculateReward(address user, uint256 index) public view returns (uint256) {
        Stake storage userStake = userStakes[user][index];
        if (!userStake.active) return 0;

        uint256 apr = getTieredAPR(userStake.amount);
        uint256 duration = block.timestamp - userStake.lastClaimedAt;
        
        return (userStake.amount * apr * duration) / (100 * SECONDS_IN_YEAR);
    }

    function getTieredAPR(uint256 amount) public pure returns (uint256) {
        if (amount < 1 ether) return 5;         
        if (amount < 5 ether) return 8;          
        return 12;                        
    }

    function getUserStakes(address user) external view returns (Stake[] memory) {
        return userStakes[user];
    }

    function _claimReward(address user, uint256 index) internal {

        Stake storage userStake = userStakes[user][index];
        require(userStake.active, "Stake not active");

        uint256 reward = calculateReward(user, index);
        require(reward > 0, "No rewards to claim");

        userStake.lastClaimedAt = block.timestamp;
        totalRewardsPaid += reward;

        require(rewardToken.transfer(user, reward), "Reward transfer failed");
        emit RewardClaimed(user, index, reward);
    }

    function pause() external onlyOwner {
        _pause();
    }
    function unpause() external onlyOwner {
        _unpause();
    }
    function toggleEmergencyMode() external onlyOwner {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }
    function withdrawFees(uint256 amount) external onlyOwner {
        payable(owner()).transfer(amount);
    }
    receive() external payable {}
}


