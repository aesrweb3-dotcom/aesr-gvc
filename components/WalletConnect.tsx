"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { publicClient, GVC_ADDRESS, BALANCE_ABI, DELEGATE_REGISTRY, DELEGATE_ABI } from "@/lib/wagmi";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface Props {
  onSelectToken: (id: number) => void;
}

export function WalletConnect({ onSelectToken }: Props) {
  const [address,        setAddress]        = useState<string | null>(null);
  // Each entry carries the token id and whether it came from a delegated vault
  const [tokens,         setTokens]         = useState<{ id: number; delegated: boolean; vault?: string }[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [connecting,     setConnecting]     = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [showCollection, setShowCollection] = useState(false);

  // Keep in sync with account changes (MetaMask accountsChanged event)
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    // Use the providers array to find MetaMask if multiple wallets present
    const provider = eth.providers?.find((p: any) => p.isMetaMask) ?? eth;

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
        setTokens([]);
        setShowCollection(false);
      } else {
        setAddress(accounts[0]);
      }
    };
    provider.on("accountsChanged", onAccountsChanged);

    provider.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts.length > 0) setAddress(accounts[0]);
    }).catch(() => {});

    return () => provider.removeListener("accountsChanged", onAccountsChanged);
  }, []);

  // Fetch GVC token IDs for a single address. Returns [] on failure (caller handles errors).
  const fetchTokensForAddress = useCallback(async (addr: string): Promise<number[]> => {
    const balance = await publicClient.readContract({
      address: GVC_ADDRESS,
      abi: BALANCE_ABI,
      functionName: "balanceOf",
      args: [addr as `0x${string}`],
    });
    const count = Number(balance);
    if (count === 0) return [];
    const ids = await Promise.all(
      Array.from({ length: Math.min(count, 200) }, (_, i) =>
        publicClient.readContract({
          address: GVC_ADDRESS,
          abi: BALANCE_ABI,
          functionName: "tokenOfOwnerByIndex",
          args: [addr as `0x${string}`, BigInt(i)],
        })
      )
    );
    return ids.map(Number);
  }, []);

  const fetchTokens = useCallback(async (addr: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Tokens owned directly by the connected wallet
      const ownIds = await fetchTokensForAddress(addr).catch(() => [] as number[]);

      // 2. Check delegate.cash v2 for any vault wallets that delegated to this hot wallet.
      //    This is a pure read — no signing, no permissions granted.
      let vaultEntries: { id: number; vault: string }[] = [];
      try {
        const delegations = await publicClient.readContract({
          address: DELEGATE_REGISTRY,
          abi: DELEGATE_ABI,
          functionName: "getIncomingDelegations",
          args: [addr as `0x${string}`],
        });

        // Accept only "all contracts" (type 1) or "this specific contract" (type 2) delegations.
        // Reject type 3 (single token) to keep the surface minimal.
        // Cap at 10 vault addresses to prevent abuse / runaway RPC calls.
        const vaultAddresses = [
          ...new Set(
            (delegations as readonly { type_: number; from: string; contract_: string }[])
              .filter(d =>
                d.type_ === 1 ||
                (d.type_ === 2 && d.contract_.toLowerCase() === GVC_ADDRESS.toLowerCase())
              )
              .map(d => d.from.toLowerCase())
          ),
        ].slice(0, 10);

        // Fetch tokens from each vault, ignoring per-vault failures gracefully
        const vaultResults = await Promise.allSettled(
          vaultAddresses.map(async (vault) => {
            const ids = await fetchTokensForAddress(vault);
            return ids.map(id => ({ id, vault }));
          })
        );

        vaultEntries = vaultResults
          .filter((r): r is PromiseFulfilledResult<{ id: number; vault: string }[]> => r.status === "fulfilled")
          .flatMap(r => r.value);
      } catch {
        // Delegation lookup failed — silently continue with own tokens only.
        // This is intentional: a registry outage shouldn't block the user.
      }

      // 3. Merge, deduplicate (own wallet takes priority), sort
      const seenIds = new Set<number>();
      const merged: { id: number; delegated: boolean; vault?: string }[] = [];

      for (const id of ownIds) {
        if (!seenIds.has(id)) { seenIds.add(id); merged.push({ id, delegated: false }); }
      }
      for (const { id, vault } of vaultEntries) {
        if (!seenIds.has(id)) { seenIds.add(id); merged.push({ id, delegated: true, vault }); }
      }

      merged.sort((a, b) => a.id - b.id);
      setTokens(merged);

      if (merged.length === 0) setError(null);
    } catch {
      setError("Couldn't load tokens — contract may not support enumeration.");
    } finally {
      setLoading(false);
    }
  }, [fetchTokensForAddress]);

  useEffect(() => {
    if (address) {
      fetchTokens(address);
      setShowCollection(true);
    } else {
      setTokens([]);
      setShowCollection(false);
    }
  }, [address, fetchTokens]);

  const getProvider = () => {
    const eth = (window as any).ethereum;
    if (!eth) return null;
    // When multiple wallet extensions are installed, each injects into
    // window.ethereum.providers[]. Find MetaMask specifically.
    if (eth.providers?.length) {
      const mm = eth.providers.find((p: any) => p.isMetaMask);
      if (mm) return mm;
    }
    // Single wallet — use it if it's MetaMask, else use whatever is there
    return eth;
  };

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setError("No wallet found. Install MetaMask and refresh.");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // Check if already silently authorised
      const existing: string[] = await provider.request({ method: "eth_accounts" });
      if (existing.length > 0) {
        setAddress(existing[0]);
        return;
      }

      // wallet_requestPermissions always forces the MetaMask approval popup
      await provider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      const approved: string[] = await provider.request({ method: "eth_accounts" });
      if (approved.length > 0) setAddress(approved[0]);

    } catch (e: any) {
      const code = e?.code ?? 0;
      if (code === 4001) {
        setError(null);
      } else {
        setError("Couldn't connect. Make sure MetaMask is unlocked and try again.");
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setTokens([]);
    setShowCollection(false);
  }, []);

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!address) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
        <button
          onClick={connect}
          disabled={connecting}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 22px", borderRadius: 10,
            background: "rgba(255,224,72,0.08)",
            border: "1px solid rgba(255,224,72,0.35)",
            color: "#FFE048", cursor: connecting ? "default" : "pointer",
            fontFamily: "var(--font-mundial)", fontSize: 14,
            opacity: connecting ? 0.6 : 1,
            transition: "background 0.18s, border-color 0.18s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,224,72,0.14)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,224,72,0.6)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,224,72,0.08)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,224,72,0.35)";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFE048" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            <line x1="12" y1="12" x2="12" y2="16"/>
            <line x1="10" y1="14" x2="14" y2="14"/>
          </svg>
          {connecting ? "Connecting…" : "Connect Wallet to View Your Collection"}
        </button>
        {error && (
          <p style={{ fontFamily:"var(--font-mundial)", fontSize:11, color:"rgba(255,100,100,0.8)",
            margin:0, textAlign:"center" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
      {/* Address chip */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8,
          padding: "7px 12px", borderRadius: 10,
          background: "rgba(46,255,46,0.08)", border: "1px solid rgba(46,255,46,0.22)" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2EFF2E",
            boxShadow: "0 0 6px rgba(46,255,46,0.6)" }} />
          <span style={{ fontFamily: "var(--font-mundial)", fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
            {shortAddr(address)}
          </span>
          {tokens.length > 0 && (
            <span style={{ fontFamily: "var(--font-brice)", fontSize: 11, fontWeight: 900,
              color: "#FFE048", letterSpacing: "0.05em" }}>
              {tokens.filter(t => !t.delegated).length} GVC
              {tokens.some(t => t.delegated) && (
                <span style={{ color: "#FF6B9D", marginLeft: 4 }}>
                  +{tokens.filter(t => t.delegated).length} delegated
                </span>
              )}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCollection(v => !v)}
          style={{
            padding: "7px 14px", borderRadius: 10, cursor: "pointer",
            background: showCollection ? "rgba(255,224,72,0.18)" : "rgba(255,224,72,0.08)",
            border: `1px solid rgba(255,224,72,${showCollection ? "0.5" : "0.28"})`,
            color: "#FFE048", fontFamily: "var(--font-mundial)", fontSize: 13,
            transition: "all 0.18s",
          }}
        >
          {showCollection ? "Hide" : "My Cards"}
        </button>
        <button
          onClick={disconnect}
          style={{
            padding: "7px 12px", borderRadius: 10, cursor: "pointer",
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mundial)", fontSize: 12,
            transition: "all 0.18s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,60,60,0.4)";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,100,100,0.8)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)";
          }}
        >
          Disconnect
        </button>
      </div>

      {/* Collection panel */}
      <AnimatePresence>
        {showCollection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{   opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            style={{ overflow: "hidden", width: "100%" }}
          >
            <div style={{
              background: "rgba(18,18,18,0.95)", border: "1px solid rgba(255,224,72,0.14)",
              borderRadius: 16, padding: "20px", marginTop: 4,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ fontFamily: "var(--font-brice)", fontSize: 16, fontWeight: 900,
                  color: "#FFE048", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Your Collection
                </p>
                {loading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                    <div className="gvc-spinner" style={{ width: 14, height: 14, border: "1.5px solid #FFE048", borderTopColor: "transparent" }} />
                    Loading tokens…
                  </div>
                )}
              </div>

              {error && (
                <p style={{ color: "rgba(255,100,100,0.8)", fontSize: 13, fontFamily: "var(--font-mundial)" }}>{error}</p>
              )}

              {!loading && !error && tokens.length === 0 && (
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontFamily: "var(--font-mundial)", textAlign: "center", padding: "24px 0" }}>
                  No GVC tokens found in this wallet
                </p>
              )}

              {tokens.length > 0 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                  gap: 10, maxHeight: 380, overflowY: "auto",
                  paddingRight: 4,
                }}>
                  {tokens.map(t => (
                    <TokenThumb key={t.id} id={t.id} delegated={t.delegated} onSelect={() => onSelectToken(t.id)} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TokenThumb({ id, delegated, onSelect }: { id: number; delegated: boolean; onSelect: () => void }) {
  const [imgState, setImgState] = useState<"loading"|"loaded"|"error">("loading");

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.06, y: -2 }}
      whileTap={{ scale: 0.96 }}
      style={{
        position: "relative", padding: 0, border: "none", borderRadius: 10,
        overflow: "hidden", cursor: "pointer", background: "#0d0d0d",
        aspectRatio: "3/4",
        boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
        outline: "1.5px solid rgba(255,224,72,0.15)",
        transition: "outline-color 0.18s",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.outlineColor = "rgba(255,224,72,0.55)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.outlineColor = "rgba(255,224,72,0.15)"}
    >
      {imgState === "loading" && (
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(135deg, #111 0%, #1a1a1a 50%, #111 100%)" }} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/portrait/${id}`}
        alt={`GVC #${id}`}
        style={{
          width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top",
          display: imgState === "loaded" ? "block" : "none",
        }}
        onLoad={() => setImgState("loaded")}
        onError={() => setImgState("error")}
      />
      {imgState === "error" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", background: "#0d0d16",
          fontFamily: "var(--font-brice)", fontSize: 11, color: "rgba(255,224,72,0.4)" }}>
          #{id}
        </div>
      )}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
        padding: "12px 6px 5px",
        fontFamily: "var(--font-mundial)", fontSize: 10, color: "rgba(255,255,255,0.65)",
        textAlign: "center",
      }}>
        #{id}
        {delegated && (
          <span style={{ display: "block", fontSize: 8, color: "#FF6B9D", letterSpacing: "0.04em" }}>
            delegated
          </span>
        )}
      </div>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)", opacity: 0,
        fontFamily: "var(--font-brice)", fontSize: 11, fontWeight: 900, color: "#FFE048",
        letterSpacing: "0.06em", textTransform: "uppercase",
        transition: "opacity 0.18s",
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "0"}
      >
        Generate
      </div>
    </motion.button>
  );
}
