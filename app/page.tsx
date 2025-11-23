"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import {
    useAccount,
    useConnect,
    useWriteContract,
    useWaitForTransactionReceipt,
} from "wagmi";
import { bountycastAbi, BOUNTYCAST_ADDRESS } from "../lib/contract";
import QuestionThread from "../components/QuestionThread";

interface Question {
    id: number;
    username: string;
    question: string;
    bounty: number;
    token: string;
    created: number;
    deadline: number;
    onchainId: number;
    status: string;
}

export default function HomePage() {
    const [isReady, setIsReady] = useState(false);
    const [viewerFid, setViewerFid] = useState<number | undefined>();
    const [viewerUsername, setViewerUsername] = useState<string | undefined>();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [showAsk, setShowAsk] = useState(false);
    const [questionText, setQuestionText] = useState("");
    const [bounty, setBounty] = useState(0.01);
    const [loading, setLoading] = useState(false);

    // wagmi hooks (Farcaster mini app wallet)
    const { isConnected, address } = useAccount();
    const {
        connect,
        connectors,
        error: connectError,
        isPending: isConnectPending,
    } = useConnect();
    const { writeContractAsync } = useWriteContract();

    const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
    const { isLoading: txPending } = useWaitForTransactionReceipt({
        hash: pendingHash,
    });

    const username =
        viewerUsername || (address ? `user-${address.slice(0, 6)}` : "anon");

    // Initialize Farcaster mini app context
    useEffect(() => {
        const init = async () => {
            try {
                await sdk.actions.ready();
                const ctx = await sdk.context;
                if (ctx?.viewer) {
                    setViewerFid(ctx.viewer.fid);
                    setViewerUsername(ctx.viewer.username || undefined);
                }
            } catch (e) {
                // This will usually fail if opened outside Farcaster – that's fine.
                console.error("mini app init error (likely outside Farcaster)", e);
            } finally {
                setIsReady(true);
            }
        };
        init();
    }, []);

    // Load questions from API
    const loadQuestions = async () => {
        try {
            const res = await fetch("/api/questions");
            const data = await res.json();
            setQuestions(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadQuestions();
    }, []);

    // Connect to Farcaster mini app wallet
    const handleConnectClick = () => {
        if (!connectors || connectors.length === 0) {
            console.error("No Farcaster mini app wallet connector available");
            alert(
                "This app is meant to run inside Farcaster as a mini app. Open it from Warpcast."
            );
            return;
        }

        const connector = connectors[0]; // mini app usually exposes a single connector

        console.log(
            "Connecting with Farcaster mini app wallet:",
            connector.id,
            connector.name
        );
        connect({ connector });
    };

    // Ask a question + lock bounty on-chain
    const ask = async () => {
        if (!questionText.trim()) return;
        if (!isConnected || !address) {
            alert("Connect your Farcaster wallet to lock bounty on-chain.");
            return;
        }

        setLoading(true);
        try {
            const now = Date.now();
            const deadlineMs = now + 30 * 24 * 60 * 60 * 1000; // 30 days
            const deadlineSec = Math.floor(deadlineMs / 1000);

            const metadata = {
                question: questionText,
                createdAt: now,
                bounty,
            };
            const metadataUri = `data:application/json,${encodeURIComponent(
                JSON.stringify(metadata)
            )}`;

            // 1) On-chain: createQuestion + lock bounty
            const hash = await writeContractAsync({
                address: BOUNTYCAST_ADDRESS,
                abi: bountycastAbi,
                functionName: "createQuestion",
                args: [metadataUri, BigInt(deadlineSec)],
                value: BigInt(Math.floor(bounty * 1e18)),
            });
            setPendingHash(hash);

            // TODO: decode onchainId from QuestionCreated event
            const onchainId = -1;

            // 2) Store question in DB for UI
            await fetch("/api/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fid: viewerFid,
                    username,
                    address,
                    question: questionText,
                    bounty,
                    token: "ETH",
                    onchainId,
                    deadline: deadlineMs,
                }),
            });

            setQuestionText("");
            setBounty(0.01);
            setShowAsk(false);
            await loadQuestions();
        } catch (e) {
            console.error(e);
            alert("Failed to ask question / send transaction");
        } finally {
            setLoading(false);
        }
    };

    if (!isReady) {
        return (
            <div
                style={{
                    width: "100%",
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "sans-serif",
                    fontSize: 12,
                    color: "#777",
                }}
            >
                Loading mini app…
            </div>
        );
    }

    return (
        <div
            style={{
                maxWidth: 640,
                margin: "0 auto",
                padding: 12,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: 14,
            }}
        >
            <header style={{ marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>🔮 BountyCast</h2>
                <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
                    Post questions with on-chain bounties. Let Farcaster answer.
                </p>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                    {isConnected && address ? (
                        <span>
                            {viewerUsername ? `@${viewerUsername}` : "Connected"} ·{" "}
                            {address.slice(0, 6)}…{address.slice(-4)}
                        </span>
                    ) : (
                        <button onClick={handleConnectClick} style={{ fontSize: 12 }}>
                            {isConnectPending ? "Connecting…" : "Connect wallet"}
                        </button>
                    )}
                    {connectError && (
                        <div style={{ fontSize: 10, color: "red" }}>
                            {connectError.message}
                        </div>
                    )}
                </div>
            </header>

            <section style={{ marginBottom: 16 }}>
                <button
                    onClick={() => setShowAsk((s) => !s)}
                    style={{
                        fontSize: 13,
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        background: "#fff",
                    }}
                >
                    {showAsk ? "Cancel" : "Ask a question"}
                </button>

                {showAsk && (
                    <div
                        style={{
                            marginTop: 8,
                            border: "1px solid #eee",
                            borderRadius: 8,
                            padding: 8,
                            background: "#fafafa",
                        }}
                    >
                        <textarea
                            style={{
                                width: "100%",
                                padding: 6,
                                marginBottom: 6,
                                fontSize: 13,
                                minHeight: 60,
                                resize: "vertical",
                            }}
                            placeholder="Your question…"
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                            <input
                                type="number"
                                min={0.001}
                                step={0.001}
                                style={{ flex: 1, padding: 6, fontSize: 13 }}
                                placeholder="Bounty (ETH)"
                                value={bounty}
                                onChange={(e) =>
                                    setBounty(Number(e.target.value || 0.001))
                                }
                            />
                            <span
                                style={{
                                    fontSize: 12,
                                    color: "#666",
                                    alignSelf: "center",
                                }}
                            >
                                Native (Base)
                            </span>
                        </div>
                        <button
                            onClick={ask}
                            disabled={loading || txPending}
                            style={{
                                fontSize: 13,
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "none",
                                background: "#000",
                                color: "#fff",
                                width: "100%",
                            }}
                        >
                            {loading || txPending
                                ? "Locking bounty…"
                                : "Submit & lock bounty"}
                        </button>
                    </div>
                )}
            </section>

            <section>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: 14 }}>Open questions</h3>
                    <button
                        onClick={loadQuestions}
                        style={{ fontSize: 11, padding: "2px 6px" }}
                    >
                        Refresh
                    </button>
                </div>
                {questions.length === 0 && (
                    <p style={{ fontSize: 12, color: "#777" }}>
                        No questions yet. Be the first to ask.
                    </p>
                )}
                {questions.map((q) => (
                    <div
                        key={q.id}
                        style={{
                            border: "1px solid #eee",
                            borderRadius: 8,
                            padding: 8,
                            marginBottom: 8,
                            opacity: q.status === "awarded" ? 0.6 : 1,
                        }}
                    >
                        <div style={{ marginBottom: 4 }}>
                            <b>{q.username}</b>: {q.question}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "#666",
                                display: "flex",
                                justifyContent: "space-between",
                            }}
                        >
                            <span>🏆 {q.bounty} ETH</span>
                            <span>
                                {new Date(q.created).toLocaleString(undefined, {
                                    hour12: false,
                                })}
                            </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                            Closes{" "}
                            {new Date(q.deadline).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            })}
                        </div>
                        <QuestionThread
                            questionId={q.id}
                            fid={viewerFid}
                            defaultUsername={username}
                        />
                    </div>
                ))}
            </section>
        </div>
    );
}
