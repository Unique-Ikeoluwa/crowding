export const STAKING_CONTRACT_ADDRESS = "0x8a264eD54E13aDE1DE08266eeF197F319659737c";

export const SEPOLIA_CHAIN_ID = "0xaa36a7";

export const STAKING_ABI = [
  "function stake() external payable",
  "function claimReward(uint256 index) external",
  "function unstake(uint256 index) external",
  "function calculateReward(address user, uint256 index) public view returns (uint256)",
  "function getUserStakes(address user) external view returns (tuple(uint256 amount, uint256 timestamp, uint256 lastClaimedAt, bool active)[])",
  "function totalStaked() external view returns (uint256)",
  "event StakeCreated(address indexed user, uint256 index, uint256 amount, uint256 apr)",
  "event RewardClaimed(address indexed user, uint256 index, uint256 reward)",
  "event StakeWithdrawn(address indexed user, uint256 index, uint256 principal, uint256 reward)"
];
