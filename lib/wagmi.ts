import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum-rpc.publicnode.com"),
});

export const GVC_ADDRESS = "0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4" as const;

export const BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs:  [{ name: "owner", type: "address" as const }],
    outputs: [{ name: "",      type: "uint256" as const }],
  },
  {
    name: "tokenOfOwnerByIndex",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs:  [{ name: "owner", type: "address" as const }, { name: "index", type: "uint256" as const }],
    outputs: [{ name: "",      type: "uint256" as const }],
  },
] as const;
