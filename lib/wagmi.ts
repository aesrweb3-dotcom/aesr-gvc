import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum-rpc.publicnode.com"),
});

export const GVC_ADDRESS = "0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4" as const;

// delegate.cash v2 registry — read-only, never used for signing
export const DELEGATE_REGISTRY = "0x00000000000076A84feF008CDAbe6409d2FE638B" as const;

export const DELEGATE_ABI = [
  {
    name: "getIncomingDelegations",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "to", type: "address" as const }],
    outputs: [
      {
        name: "",
        type: "tuple[]" as const,
        components: [
          { name: "type_",      type: "uint8"   as const },
          { name: "to",         type: "address" as const },
          { name: "from",       type: "address" as const },
          { name: "rights",     type: "bytes32" as const },
          { name: "contract_",  type: "address" as const },
          { name: "tokenId",    type: "uint256" as const },
          { name: "amount",     type: "uint256" as const },
        ],
      },
    ],
  },
] as const;

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
