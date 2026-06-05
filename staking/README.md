# Time-Based ERC-20 Staking Protocol

A secure, decentralized Solidity staking system built using Hardhat. Users lock their ecosystem tokens (`C4Token`) for a minimum holding period to mint yield-bearing reward assets (`C4Rewards`) calculated dynamically over time.

## 🛠 Project Architecture

```
├── contracts/
│   ├── C4Token.sol       # Primary ERC-20 Token (18 Decimals)
│   ├── C4Rewards.sol     # Mintable Yield Asset (Controlled by Staking Engine)
│   └── Staking.sol       # Core Staking, Lockup, and Time-Tracking Engine
├── scripts/
│   └── deploy.js         # Unified Sepolia deployment & authorization script
└── test/
    └── Staking.js        # ES Module-compatible Hardhat network test suite
```

---

## Setup & Installation

### 1. Installation
Clone the repository and install the project dependencies:
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory to store your deployment credentials safely:
```env
PRIVATE_KEY="your_wallet_private_key"
RPC_URL="https://alchemy.com"
ETHERSCAN_API_KEY="your_etherscan_api_key"
```

---

## Running the Test

The test harness uses direct JSON-RPC hardhat state mutation network primitives (`evm_increaseTime` and `evm_mine`) to bypass ES Module dependency graph mismatches. 

To execute the test cases:
```bash
npx hardhat test
```

### Coverage Assertions Managed:
*  Verification of basic token staking authorization gates.
*  Proof-of-concept showing zero rewards generated at block zero.
*  1-month exact timeline tracking confirming a 1% payout.
*  Reversion assurance blocking attempts to unstake at month 2.
*  Seamless auto-claiming execution upon maturity milestone exit (Month 3).

---

## 🌐 Deployment & Verification on Sepolia Testnet

### 1. Deploying Contracts
Execute the unified deployment environment workflow configuration:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 2. Verifying on Block Explorers
Once deployed successfully, verify your codebases on Etherscan using the explicit initialization parameters matching your deploy variables:

```bash
# 1. Verify C4Token (Requires Initial Supply Parameter)
# Example passes 1,000,000 tokens scaled to 18 decimals:
npx hardhat verify --network sepolia <YOUR_DEPLOYED_C4_TOKEN_ADDRESS> "1000000000000000000000000"

# 2. Verify C4Rewards (0 Constructor Parameters)
npx hardhat verify --network sepolia <YOUR_DEPLOYED_C4_REWARDS_ADDRESS>

# 3. Verify Staking Engine (Requires Staking Token and Rewards Token Addresses)
npx hardhat verify --network sepolia <YOUR_DEPLOYED_STAKING_ADDRESS> "<YOUR_DEPLOYED_C4_TOKEN_ADDRESS>" "<YOUR_DEPLOYED_C4_REWARDS_ADDRESS>"
```

---

## Security & Optimization Considerations

* **Reentrancy Guard**: All state-changing endpoints (`stake`, `unstake`, `claimReward`) are bounded by a native `nonReentrant` modifier to negate vector looping risks.
* **Math Safety**: Built on Solidity `^0.8.24`, eliminating legacy overflow/underflow attacks natively via compiler-level checking.
* **Gas Conservation**: The contract eliminates gas-guzzling array tracking loops by using a point-in-time calculation architecture (`calculateReward`) that evaluates metrics programmatically via single-storage timestamp comparisons.
