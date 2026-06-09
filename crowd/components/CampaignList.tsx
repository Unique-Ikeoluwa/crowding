"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Contract, BrowserProvider } from "ethers";
import { CONTRACT_ADDRESS } from "@/constants/config";
import contractAbi from "@/constants/abi.json";
import CampaignCard from "./CampaignCard";

interface CampaignListProps {
  provider: BrowserProvider | null;
}

export default function CampaignList({ provider }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const activeContractRef = useRef<Contract | null>(null);

  const loadCampaigns = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, provider);
      const count = await contract.campaignCount();
      const tempCampaigns = [];

      for (let i = 0; i < Number(count); i++) {
        const campaign = await contract.campaigns(i);
        tempCampaigns.push({
          id: i,
          data: {
            creator: campaign.creator,
            title: campaign.title,
            description: campaign.description,
            goal: campaign.goal,
            deadline: campaign.deadline,
            raisedAmount: campaign.raisedAmount,
            status: Number(campaign.status),
            contributorsCount: campaign.contributorsCount,
            allMilestonesApproved: campaign.allMilestonesApproved
          }
        });
      }
      setCampaigns(tempCampaigns.reverse());
    } catch (err) {
      console.error("Failed to compile campaign list registry mapping arrays:", err);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!provider) return;

    const contractInstance = new Contract(CONTRACT_ADDRESS, contractAbi, provider);
    activeContractRef.current = contractInstance;

    console.log("Initializing On-Chain Smart Contract Event Subscriptions...");

    const handleDataMutations = () => {
      console.log("Detected block mutation event on-chain! Reloading application states...");
      loadCampaigns();
    };

    contractInstance.on("CampaignCreated", handleDataMutations);
    contractInstance.on("ContributionReceived", handleDataMutations);
    contractInstance.on("MilestoneRequested", handleDataMutations);
    contractInstance.on("RefundClaimed", handleDataMutations);

    return () => {
      if (activeContractRef.current) {
        console.log("Detaching event listener subscriptions...");
        activeContractRef.current.off("CampaignCreated", handleDataMutations);
        activeContractRef.current.off("ContributionReceived", handleDataMutations);
        activeContractRef.current.off("MilestoneRequested", handleDataMutations);
        activeContractRef.current.off("RefundClaimed", handleDataMutations);
      }
    };
  }, [provider, loadCampaigns]);

  if (!provider) {
    return (
      <div className="text-center py-12 text-sm text-gray-500 bg-gray-900 rounded-xl border border-gray-800/60 shadow-inner px-4">
        Connect your wallet above to initialize Web3 node streams.
      </div>
    );
  }

  if (loading && campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400 font-medium animate-pulse">
        Querying smart contract state hooks...
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full grid grid-cols-1">
      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500 bg-gray-900 rounded-xl border border-gray-800/60 px-4">
          No active or expired project campaigns found on-chain.
        </div>
      ) : (
        campaigns.map((c) => (
          <CampaignCard 
            key={c.id} 
            id={c.id} 
            campaign={c.data} 
            provider={provider} 
            refreshData={loadCampaigns} 
          />
        ))
      )}
    </div>
  );
}
