export const STAKING_CONTRACT_ADDRESS = "0xd847A04947c81a0a3DA7522566Eb16c5cB462504";
export const REWARD_TOKEN_ADDRESS = "0x7732164619073e930F2d18203F9c7f224D575C89";

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
