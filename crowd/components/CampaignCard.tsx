"use client";

import { useState, useEffect } from "react";
import { Contract, formatEther, parseEther, BrowserProvider } from "ethers";
import { CONTRACT_ADDRESS } from "@/constants/config";
import contractAbi from "@/constants/abi.json";
import { shortenAddress, formatMobileBalance } from "@/constants/utils";

interface Milestone {
  title: string;
  amount: bigint;
  completed: boolean;
  approved: boolean;
  votingDeadline: bigint;
  approvalsCount: bigint;
  totalVotesCount: bigint;
}

interface CampaignProps {
  id: number;
  campaign: {
    creator: string;
    title: string;
    description: string;
    goal: bigint;
    deadline: bigint;
    raisedAmount: bigint;
    status: number;
    contributorsCount: bigint;
    allMilestonesApproved: boolean;
  };
  provider: BrowserProvider | null;
  refreshData: () => void;
}

export default function CampaignCard({ id, campaign, provider, refreshData }: CampaignProps) {
  const [contributionAmount, setContributionAmount] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);

  const statuses = ["Funding", "Successful", "Failed"];

  useEffect(() => {
    if (provider) fetchMilestones();
  }, [provider]);

  const fetchMilestones = async () => {
    try {
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, provider);
      const data = await contract.getMilestones(id);
      setMilestones(data);
    } catch (err) {
      console.error("Error fetching milestones:", err);
    }
  };

  const handleContribute = async () => {
    if (!provider || !contributionAmount) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
      const tx = await contract.contribute(id, { value: parseEther(contributionAmount) });
      await tx.wait();
      alert("Contribution successful!");
      setContributionAmount("");
      refreshData();
    } catch (err: any) {
      alert(`Transaction failed: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (milestoneId: number, approve: boolean) => {
    if (!provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
      const tx = await contract.voteOnMilestone(id, milestoneId, approve);
      await tx.wait();
      alert("Vote recorded successfully!");
      fetchMilestones();
    } catch (err: any) {
      alert(`Voting failed: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRefund = async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
      const tx = await contract.claimRefund(id);
      await tx.wait();
      alert("Refund claimed successfully!");
      refreshData();
    } catch (err: any) {
      alert(`Refund failed: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = Number(campaign.deadline) < Math.floor(Date.now() / 1000);

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
            <h3 className="text-lg sm:text-xl font-bold text-white wrap-break-word max-w-full">
                {campaign.title}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                campaign.status === 0 ? "bg-blue-600" : campaign.status === 1 ? "bg-green-600" : "bg-red-600"
                }`}>
                {statuses[campaign.status]}
            </span>
        </div>
        <p className="text-gray-400 text-xs sm:text-sm mb-4 wrap-break-word">
            {campaign.description}
        </p>      
        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm mb-4 bg-gray-900 p-3 rounded-lg font-mono">
            <div>
                <span className="text-gray-500 block sm:inline">Goal:</span>{" "}
                <span className="text-white font-semibold">{formatMobileBalance(campaign.goal, 3)} ETH</span>
            </div>
            <div>
                <span className="text-gray-500 block sm:inline">Raised:</span>{" "}
                <span className="text-white font-semibold">{formatMobileBalance(campaign.raisedAmount, 3)} ETH</span>
            </div>
            <div>
                <span className="text-gray-500 block sm:inline">Backers:</span>{" "}
                <span className="text-white font-semibold">{campaign.contributorsCount.toString()}</span>
            </div>
            <div className="truncate">
                <span className="text-gray-500 block sm:inline">Creator:</span>{" "}
                <span className="text-white text-xs" title={campaign.creator}>
                    {shortenAddress(campaign.creator)}
                </span>
            </div>
        </div>

        {campaign.status === 0 && !isExpired && (
            <div className="flex gap-2 mb-6">
                <input 
                    type="number" 
                    step="any" 
                    placeholder="Amount in ETH" 
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none"
                />
                <button 
                    onClick={handleContribute}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50 transition"
                >
                    Contribute
                </button>
            </div>
        )}

        {(campaign.status === 2 || (campaign.status === 0 && isExpired && campaign.raisedAmount < campaign.goal)) && (
            <div className="mb-6 bg-red-950/40 p-3 rounded border border-red-900/50">
                <p className="text-red-400 text-xs mb-2">This funding round was unsuccessful. You can claim back your tokens if you contributed.</p>
                <button 
                    onClick={handleClaimRefund}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium disabled:opacity-50 transition"
                >
                    Claim Campaign Refund
                </button>
            </div>
        )}

        {milestones.length > 0 && (
            <div className="mt-4 border-t border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Project Execution Milestones</h4>
                <div className="space-y-3">
                    {milestones.map((m, index) => {
                        const votingOpen = m.completed && !m.approved && Number(m.votingDeadline) > Math.floor(Date.now() / 1000);
                        return (
                            <div key={index} className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-white font-medium text-sm">{m.title}</span>
                                    <span className="text-gray-400 font-mono text-xs">{formatEther(m.amount)} ETH</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span>Status: {m.approved ? "✅ Released" : m.completed ? "⏳ In Voting" : "🔒 Locked"}</span>
                                    {m.completed && !m.approved && (
                                    <span>Votes: {m.approvalsCount.toString()} Yes / {m.totalVotesCount.toString()} Total</span>
                                    )}
                                </div>
                                
                                {votingOpen && (
                                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-800">
                                        <button 
                                            onClick={() => handleVote(index, true)} 
                                            disabled={loading}
                                            className="flex-1 bg-green-700/80 hover:bg-green-700 text-white text-xs py-1 rounded disabled:opacity-50 transition"
                                        >
                                            Vote Approve (Yes)
                                        </button>
                                        <button 
                                            onClick={() => handleVote(index, false)} 
                                            disabled={loading}
                                            className="flex-1 bg-red-700/80 hover:bg-red-700 text-white text-xs py-1 rounded disabled:opacity-50 transition"
                                        >
                                            Vote Reject (No)
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
    </div>
  );
}
