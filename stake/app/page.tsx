'use client';

import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { STAKING_CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID, STAKING_ABI } from "@/config/contracts"

interface Stake {
  amount: bigint;
  timestamp: bigint;
  lastClaimedAt: bigint;
  active: boolean;
  rewardEarned?: string;
}

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [userStakes, setUserStakes] = useState<Stake[]>([]);
  const [totalStaked, setTotalStaked] = useState('0');
  
  const [txStatus, setTxStatus] = useState<'idle' | 'waiting-signature' | 'pending' | 'confirmed'>('idle');
  const [txError, setTxError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed!");
      return;
    }
    try {
      setTxError(null);
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== BigInt(11155111)) {
        setIsWrongNetwork(true);
        await requestNetworkSwitch();
        return;
      }

      
      setIsWrongNetwork(false);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (err: any) {
      handleErrors(err);
    }
  };

  const requestNetworkSwitch = async () => {
  if (!window.ethereum) {
    setTxError("MetaMask is not installed.");
    return;
  }

  const cleanChainId = "0xaa36a7"; 

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: cleanChainId }],
    });
    setIsWrongNetwork(false);
    setTxError(null);
  } catch (switchError: any) {
    if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
      try {
        console.log("Sepolia not found in MetaMask. Attempting to add network...");
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: cleanChainId,
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://ancilia.com', 'https://blastapi.io'],
              blockExplorerUrls: ['https://etherscan.io'],
            },
          ],
        });
        setIsWrongNetwork(false);
        setTxError(null);
      } catch (addError: any) {
        setTxError("Failed to automatically add Sepolia network to MetaMask.");
      }
    } else if (switchError.code === 4001) {
      setTxError("User rejected the network switch request.");
    } else {
      setTxError("Please switch your MetaMask network to Sepolia manually.");
    }
  }
};


  const fetchDashboardData = async () => {
    if (!account || isWrongNetwork || !window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, provider);

      const globalStaked = await contract.totalStaked();
      setTotalStaked(formatEther(globalStaked));

      const stakesRaw = await contract.getUserStakes(account);
      const formattedStakes: Stake[] = await Promise.all(
        stakesRaw.map(async (s: any, idx: number) => {
          let claimable = "0";
          if (s.active) {
            const rewardRaw = await contract.calculateReward(account, idx);
            claimable = formatEther(rewardRaw);
          }
          return {
            amount: s.amount,
            timestamp: s.timestamp,
            lastClaimedAt: s.lastClaimedAt,
            active: s.active,
            rewardEarned: claimable,
          };
        })
      );
      setUserStakes(formattedStakes);
    } catch (err) {
      console.error("Error collecting dashboard metrics:", err);
    }
  };

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeAmount || !window.ethereum) return;

    try {
      setTxError(null);
      setTxStatus('waiting-signature');
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer);

      const tx = await contract.stake({ value: parseEther(stakeAmount) });
      setTxStatus('pending');
      
      await tx.wait();
      setTxStatus('confirmed');
      setHistory(prev => [`Staked ${stakeAmount} ETH successfully`, ...prev]);
      setStakeAmount('');
      fetchDashboardData();
    } catch (err: any) {
      handleErrors(err);
    }
  };

  const handleClaim = async (index: number) => {
    if (!window.ethereum) return;
    try {
      setTxError(null);
      setTxStatus('waiting-signature');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer);

      const tx = await contract.claimReward(index);
      setTxStatus('pending');
      await tx.wait();
      
      setTxStatus('confirmed');
      setHistory(prev => [`Claimed rewards for Position #${index}`, ...prev]);
      fetchDashboardData();
    } catch (err: any) {
      handleErrors(err);
    }
  };

  const handleUnstake = async (index: number) => {
    if (!window.ethereum) return;
    try {
      setTxError(null);
      setTxStatus('waiting-signature');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer);

      const tx = await contract.unstake(index);
      setTxStatus('pending');
      await tx.wait();
      
      setTxStatus('confirmed');
      setHistory(prev => [`Unstaked Position #${index} completely`, ...prev]);
      fetchDashboardData();
    } catch (err: any) {
      handleErrors(err);
    }
  };

  const handleErrors = (err: any) => {
    setTxStatus('idle');
    if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
      setTxError("Transaction rejected by user in MetaMask.");
    } else if (err.message?.includes("insufficient funds")) {
      setTxError("Insufficient balance in your wallet to cover gas and stake.");
    } else if (err.data?.message || err.message) {
      setTxError(err.data?.message || err.message);
    } else {
      setTxError("An unexpected runtime exception occurred.");
    }
  };

  useEffect(() => {
    if (account) fetchDashboardData();
  }, [account, isWrongNetwork]);

    return (
    <main className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <header className="max-w-6xl mx-auto flex-col md:flex-row flex justify-between items-start md:items-center border-b border-slate-800 pb-6 mb-8">
        <h1 className="text-2xl font-bold tracking-tight pb-2 sm:pb-0 text-blue-400">Decentralized Staking</h1>
        {!account ? (
          <button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 md:px-6 md:py-2.5 rounded-lg text-sm font-semibold transition">
            Connect wallet
          </button>
        ) : (
          <div className="text-right">
            <p className="text-xs text-slate-400">Connected Account</p>
            <p className="text-sm font-mono text-green-400">{account.slice(0,6)}...{account.slice(-4)}</p>
          </div>
        )}
      </header>

      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Network and Validation Alerts */}
        {isWrongNetwork && (
          <div className="md:col-span-3 bg-red-950 border border-red-800 text-red-200 p-4 rounded-xl flex justify-between items-center">
            <span>⚠️ Network Mismatch detected. Contract operates exclusively on the Sepolia network.</span>
            <button onClick={requestNetworkSwitch} className="bg-red-800 hover:bg-red-700 px-4 py-1.5 rounded-lg text-xs font-bold transition">
              Switch to Sepolia
            </button>
          </div>
        )}

        {/* Transaction Pipeline Banner */}
        {txStatus !== 'idle' && (
          <div className={`md:col-span-3 p-4 rounded-xl border font-medium text-sm flex items-center gap-3 ${
            txStatus === 'waiting-signature' ? 'bg-amber-950 border-amber-800 text-amber-200 animate-pulse' :
            txStatus === 'pending' ? 'bg-blue-950 border-blue-800 text-blue-200 animate-pulse' :
            'bg-green-950 border-green-800 text-green-200'
          }`}>
            <span>
              {txStatus === 'waiting-signature' && "⏳ Waiting for signature: Please sign the payload inside MetaMask."}
              {txStatus === 'pending' && "⚙️ Transaction Pending: Awaiting inclusion in the next Sepolia block."}
              {txStatus === 'confirmed' && "🎉 Transaction Confirmed: Ledger state variable storage updated successfully!"}
            </span>
          </div>
        )}

        {txError && (
          <div className="md:col-span-3 bg-red-900/40 border border-red-800 text-red-200 p-4 rounded-xl text-sm font-mono">
            Error Stack: {txError}
          </div>
        )}

        {/* Total Platform Metrics Card */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl flex flex-col justify-between">
          <p className="text-slate-400 text-sm font-medium">Total Pool Liquidity Staked</p>
          <p className="text-4xl font-extrabold text-white my-2">{totalStaked} <span className="text-xl text-blue-400">ETH</span></p>
        </div>

        {/* Interaction Form Card */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl md:col-span-2">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Stake Native Sepolia ETH</h2>
          <form onSubmit={handleStake} className="flex flex-col md:flex-row gap-4">
            <input
              type="number"
              step="0.01"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="e.g. 1.5 ETH"
              disabled={!account || isWrongNetwork || txStatus === 'pending'}
              className="bg-slate-900 border border-slate-700 rounded-xl p-3 grow focus:outline-none focus:border-blue-500 disabled:opacity-50 text-white font-medium"
            />
            <button
              type="submit"
              disabled={!account || isWrongNetwork || txStatus === 'pending' || !stakeAmount} 
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 md:px-8 mx-auto px-4 py-1 md:py-2 rounded-xl font-semibold md:font-bold transition text-sm whitespace-nowrap"
            > 
              Deposit ETH
            </button>
          </form>
        </div>
      </section>

      {/* User Portfolio Positions Table & History Logs */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl md:col-span-2">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Your Active Staking Positions</h2>
          
          {userStakes.filter(s => s.active).length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No active stake allocation found for this public key.</p>
          ) : (
            <div className="space-y-4">
              {userStakes.map((stake, idx) => stake.active && (
                <div key={idx} className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Position #{idx}</p>
                    <p className="text-lg font-bold text-white">{formatEther(stake.amount)} ETH</p>
                    <p className="text-xs text-green-400 font-medium">Claimable Rewards: {stake.rewardEarned} RWD</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleClaim(idx)} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition">
                      Claim
                    </button>
                    <button onClick={() => handleUnstake(idx)} className="bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 px-4 py-2 rounded-lg text-xs font-bold transition">
                      Withdraw Position
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaction History Pipeline */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Local Action Log</h2>
          {history.length === 0 ? (
            <p className="text-slate-500 text-sm">No transactions logged in this session runtime.</p>
          ) : (
            <ul className="space-y-2 font-mono text-xs">
              {history.map((log, i) => (
                <li key={i} className="bg-slate-900 p-2 rounded-lg border border-slate-700 text-slate-300">
                  <span className="text-green-500 mr-1.5">✓</span> {log}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
