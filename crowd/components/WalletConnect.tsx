"use client";

import { useState, useEffect } from "react";
import { BrowserProvider } from "ethers";

interface WalletConnectProps {
  onWalletConnected: (provider: BrowserProvider, account: string) => void;
}

export default function WalletConnect({ onWalletConnected }: WalletConnectProps) {
  const [account, setAccount] = useState<string | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is required to use this application.");
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      onWalletConnected(provider, accounts[0]);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  return (
    <div className="flex justify-between items-center p-4 bg-gray-900 text-white rounded-lg mb-6">
      <h1 className="text-xl font-bold">Crowdfund Escrow Platform</h1>
      {account ? (
        <span className="bg-green-600 px-4 py-2 rounded text-sm font-mono">
          Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}
        </span>
      ) : (
        <button
          onClick={connectWallet}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}
