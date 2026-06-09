# 🔒 Crowdfunding Platform - Smart Contracts

A decentralized crowdfunding and milestone-based escrow system built with Solidity, Hardhat, and OpenZeppelin. This platform protects backers by locking raised funds in escrow and releasing them to creators only upon positive community consensus (milestone voting).

## 🛠️ Tech Stack & Dependencies
* **Solidity:** `^0.8.24` (Target EVM: Paris)
* **Framework:** Hardhat `^2.28.6`
* **Libraries:** OpenZeppelin Contracts (Ownable, ReentrancyGuard, Pausable)
* **Testing:** Mocha, Chai, `@nomicfoundation/hardhat-toolbox`

## ⚙️ Core Architecture & Functions
* `createCampaign(...)`: Initializes a fundraising round with explicit milestones. Total milestone costs must equal the target funding goal.
* `contribute(...)`: Accepts native ETH contributions. Automatically upgrades campaign status to `Successful` if the goal is met before the deadline.
* `requestMilestonePayout(...)`: Allows creators to request milestone funds once a project phase is complete. This opens a 3-day voting window.
* `voteOnMilestone(...)`: Allows contributors to vote `true` (Approve) or `false` (Reject).
  * **Instant Payout:** Triggered if `approvalsCount > totalContributors / 2`.
  * **Instant Rejection/Reset:** Triggered if explicit negative votes surpass 50% of total contributors.
* `claimRefund(...)`: Allows backer text recovery if a campaign timeline expires without reaching its target funding goal. Fully protected against double-refund vectors.

## 🚀 Local Development & Deployment

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory:
   ```env
   RPC_URL=your_sepolia_rpc_endpoint_here
   PRIVATE_KEY=your_wallet_private_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

3. **Run Unit Tests:**
   Executes the 6-part test coverage suite verifying funding mechanics, edge cases, double-refund protection, and anti-intrusion voting constraints:
   ```bash
   npx hardhat test
   ```

4. **Deploy to Sepolia Testnet:**
   ```bash
   npx hardhat clean && npx hardhat compile
   npx hardhat run scripts/deploy.js --network sepolia
   ```
