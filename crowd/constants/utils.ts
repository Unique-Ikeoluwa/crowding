import { formatEther } from "ethers";

export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

export function formatMobileBalance(weiValue: bigint, decimals: number = 4): string {
  try {
    const rawEther = formatEther(weiValue);
    const floatValue = parseFloat(rawEther);
    
    if (floatValue === 0) return "0";
    
    return floatValue.toFixed(decimals);
  } catch (error) {
    console.error("Formatting error:", error);
    return "0.0";
  }
}
