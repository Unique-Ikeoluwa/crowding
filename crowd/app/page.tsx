"use client";

import { useState } from "react";
import { BrowserProvider } from "ethers";
import WalletConnect from "@/components/WalletConnect";
import CreateCampaign from "@/components/CreateCampaign";
import CampaignList from "@/components/CampaignList";

export default function Home() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const handleWalletConnection = (connectedProvider: BrowserProvider) => {
    setProvider(connectedProvider);
  };

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-6 sm:px-6 md:px-8 text-slate-100 antialiased selection:bg-blue-500/30">
      <div className="mx-auto max-w-7xl w-full">
        {/* Top bar with automatic wrapping for extra small mobile viewports */}
        <WalletConnect onWalletConnected={handleWalletConnection} />

        {/* Fluid stack layout: Single column on small viewports, 3 columns on large screens */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Sidebar block pinned to top during scroll layouts on wide desktop screens */}
          <div className="lg:col-span-1 lg:sticky lg:top-6 w-full">
            <CreateCampaign provider={provider} />
          </div>
          
          {/* Scrolling registry item feeds */}
          <div className="lg:col-span-2 w-full space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mb-2 px-1">
              <span className="animate-pulse inline-block h-2 w-2 rounded-full bg-blue-500"></span>
              Active Fundraising Campaigns
            </h2>
            <CampaignList provider={provider} />
          </div>

        </div>
      </div>
    </main>
  );
}
