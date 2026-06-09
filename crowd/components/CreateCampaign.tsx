"use client";

import { useState } from "react";
import { BrowserProvider, Contract, parseEther } from "ethers";
import { CONTRACT_ADDRESS } from "@/constants/config";
import contractAbi from "@/constants/abi.json";

interface CreateCampaignProps {
  provider: BrowserProvider | null;
}

export default function CreateCampaign({ provider }: CreateCampaignProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneAmount, setMilestoneAmount] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return alert("Please connect your wallet first.");

    try {
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);

      // Simple implementation: Create a campaign with 1 milestone matching the goal total
      const titles = [milestoneTitle || "Phase 1 Execution"];
      const amounts = [parseEther(milestoneAmount || goal)];
      
      const durationSeconds = parseInt(duration) * 24 * 60 * 60;

      const tx = await contract.createCampaign(
        title,
        description,
        parseEther(goal),
        durationSeconds,
        titles,
        amounts
      );
      
      await tx.wait();
      alert("Campaign successfully created!");
    } catch (error: any) {
      console.error(error);
      alert(`Execution Error: ${error.reason || error.message}`);
    }
  };

  return (
    <form onSubmit={handleCreate} className="p-6 bg-gray-800 text-white rounded-lg max-w-md mb-6">
      <h2 className="text-lg font-bold mb-4">Launch a Campaign</h2>
      <input type="text" placeholder="Title" onChange={e => setTitle(e.target.value)} className="w-full p-2 mb-3 bg-gray-700 rounded" required />
      <textarea placeholder="Description" onChange={e => setDescription(e.target.value)} className="w-full p-2 mb-3 bg-gray-700 rounded" required />
      <input type="number" step="any" placeholder="Goal (ETH)" onChange={e => setGoal(e.target.value)} className="w-full p-2 mb-3 bg-gray-700 rounded" required />
      <input type="number" placeholder="Duration (Days)" onChange={e => setDuration(e.target.value)} className="w-full p-2 mb-4 bg-gray-700 rounded" required />
      <button type="submit" className="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-semibold">Publish to Sepolia</button>
    </form>
  );
}
