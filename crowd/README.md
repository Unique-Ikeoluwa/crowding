# 🌐 Crowdfunding Platform - Web Interface

A real-time, responsive Next.js web application that connects seamlessly to the deployed `CrowdfundingPlatform` smart contract on the Sepolia Testnet. It provides an interactive dashboard for project discovery, funding, milestone validation, and secure refund withdrawals.

## 🛠️ Tech Stack & Utilities
* **Framework:** Next.js (App Router architecture)
* **Web3 Library:** Ethers.js (v6 syntax)
* **Styling:** Tailwind CSS (Mobile-first layout variables)
* **Language:** TypeScript

## 📁 Modular Component Blueprint
To keep `app/page.tsx` clean and scannable, the layout architecture isolates features into dedicated client components:
* `WalletConnect.tsx`: Leverages `BrowserProvider` to authenticate MetaMask sessions and track wallet changes securely.
* `CreateCampaign.tsx`: A secure form translating user parameters into parsed Wei representations to commit new campaigns on-chain.
* `CampaignList.tsx`: Hosts an internal event listener loop subscribing to active Sepolia node logs (`CampaignCreated`, `ContributionReceived`, etc.) to trigger automatic real-time UI data refreshes.
* `CampaignCard.tsx`: Individual project viewer managing contextual action inputs (Contributions, Refund claims, Approve/Reject voting toggles).
* `utils.ts`: Contains memory-safe math formatters (`formatMobileBalance`) to safely limit trailing decimal extensions on thin mobile viewports.

## 🚀 Local Setup & Configuration

1. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

2. **Link Smart Contract Configurations:**
   * Update your contract's deployed address in `constants/config.ts`:
     ```typescript
     export const CONTRACT_ADDRESS = "0xYourDeployedSepoliaAddressHere";
     ```
   * Paste your compiled Hardhat JSON contract array into `constants/abi.json`.

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) inside your browser with MetaMask toggled onto the Sepolia Testnet.

4. **Production Compilation Build Check:**
   ```bash
   npm run build
   ```
