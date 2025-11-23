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
                const ctx = await sdk.context as any;
                console.log("Farcaster Context:", ctx); // DEBUG LOG

                if (ctx?.user) { // Try ctx.user first (v2 spec)
                    console.log("Found ctx.user:", ctx.user);
                    setViewerFid(ctx.user.fid);
                    setViewerUsername(ctx.user.username || undefined);
                } else if (ctx?.viewer) { // Fallback to ctx.viewer (older spec)
                    console.log("Found ctx.viewer:", ctx.viewer);
                    setViewerFid(ctx.viewer.fid);
                    setViewerUsername(ctx.viewer.username || undefined);
                } else {
                    console.warn("No viewer found in context");
                }
            } catch (e) {
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

        const connector = connectors[0];
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
            // 0) Check Eligibility
            if (viewerFid) {
                const checkRes = await fetch(`/api/check-eligibility?fid=${viewerFid}`);
                if (!checkRes.ok) {
                    const checkData = await checkRes.json();
                    alert(checkData.reason || "You are not eligible to post (Pro or Score > 0.6 required).");
                    setLoading(false);
                    return;
                }
            }

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
            <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
                Loading mini app…
            </div>
        );
    }

    const [userProfile, setUserProfile] = useState<any>(null);

    // Load User Profile
    useEffect(() => {
        if (viewerFid) {
            fetch(`/api/user?fid=${viewerFid}`)
                .then(res => res.json())
                .then(data => {
                    if (!data.error) setUserProfile(data);
                })
                .catch(console.error);
        }
    }, [viewerFid]);

    return (
        <div className="max-w-xl mx-auto p-4 font-sans text-sm pb-20">
            <header className="mb-8 text-center">
                <h2 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-gold">
                    BountyCast
                </h2>
                <p className="text-gray-400 text-xs mb-4">
                    Ask questions. Get answers. Earn ETH.
                </p>

                <div className="flex justify-center">
                    {isConnected && address ? (
                        <div className="glass-card px-4 py-2 rounded-full text-xs flex items-center gap-3">
                            {userProfile ? (
                                <>
                                    <img
                                        src={userProfile.pfpUrl}
                                        alt={userProfile.username}
                                        className="w-6 h-6 rounded-full border border-white/10"
                                    />
                                    <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-1">
                                            <span className="text-white font-bold">@{userProfile.username || 'user'}</span>
                                            {userProfile.isPro && <span title="Pro User">⚡</span>}
                                        </div>
                                        <div className="text-[10px] text-gray-400 flex gap-2">
                                            <span>Score: {typeof userProfile.score === 'number' ? userProfile.score.toFixed(2) : '0.00'}</span>
                                            <span>|</span>
                                            <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-gray-300">
                                        {viewerUsername ? `@${viewerUsername}` : "Connected"}
                                    </span>
                                    <span className="text-gray-500">
                                        ({address.slice(0, 6)}…{address.slice(-4)})
                                    </span>
                                </>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={handleConnectClick}
                            className="btn-primary px-6 py-2 rounded-full font-medium text-xs"
                        >
                            {isConnectPending ? "Connecting…" : "Connect Wallet"}
                        </button>
                    )}
                    {connectError && (
                        <div className="text-red-500 text-xs mt-2">
                            {connectError.message}
                        </div>
                    )}
                </div>
            </header>

            <section className="mb-8">
                {!showAsk ? (
                    <button
                        onClick={() => setShowAsk(true)}
                        className="w-full glass-card p-4 rounded-xl text-left text-gray-400 hover:bg-white/5 transition-colors flex items-center justify-between group"
                    >
                        <span>Ask a question...</span>
                        <span className="bg-brand-purple/20 text-brand-purple px-2 py-1 rounded text-xs group-hover:bg-brand-purple group-hover:text-white transition-colors">
                            + New
                        </span>
                    </button>
                ) : (
                    <div className="glass-card p-5 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-white">New Bounty</h3>
                            <button
                                onClick={() => setShowAsk(false)}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <textarea
                            className="glass-input w-full p-3 rounded-lg mb-3 min-h-[100px] resize-none text-sm placeholder-gray-500"
                            placeholder="What do you want to know?"
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                        />

                        <div className="flex gap-3 mb-4">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    min={0.001}
                                    step={0.001}
                                    className="glass-input w-full p-3 rounded-lg pl-8 text-sm"
                                    placeholder="0.01"
                                    value={bounty}
                                    onChange={(e) => setBounty(Number(e.target.value || 0.001))}
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold">
                                    Ξ
                                </span>
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                                Native Base ETH
                            </div>
                        </div>

                        <button
                            onClick={ask}
                            disabled={loading || txPending}
                            className="btn-primary w-full py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading || txPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </span>
                            ) : (
                                "Post Bounty"
                            )}
                        </button>
                    </div>
                )}
            </section>

            <section>
                <div className="flex justify-between items-end mb-4 px-1">
                    <h3 className="text-lg font-bold text-white">Recent Questions</h3>
                    <button
                        onClick={loadQuestions}
                        className="text-brand-purple text-xs hover:text-brand-purple-dark transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                <div className="space-y-4">
                    {questions.length === 0 && (
                        <div className="text-center py-10 text-gray-600">
                            <p>No questions yet.</p>
                            <p className="text-xs mt-1">Be the first to ask!</p>
                        </div>
                    )}

                    {questions.map((q) => (
                        <div
                            key={q.id}
                            className={`glass-card p-5 rounded-xl transition-all duration-300 ${q.status === "awarded" ? "opacity-70 grayscale-[0.5]" : "hover:scale-[1.01] hover:shadow-lg hover:shadow-brand-purple/10"
                                }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-gray-400">
                                        {q.username.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white text-sm">{q.username}</div>
                                        <div className="text-[10px] text-gray-500">
                                            {new Date(q.created).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-brand-gold/10 border border-brand-gold/20 text-brand-gold px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                    <span>🏆</span>
                                    <span>{q.bounty} ETH</span>
                                </div>
                            </div>

                            <p className="text-gray-200 mb-4 text-sm leading-relaxed">
                                {q.question}
                            </p>

                            <div className="border-t border-white/5 pt-3 mt-3">
                                <QuestionThread
                                    questionId={q.id}
                                    fid={viewerFid}
                                    defaultUsername={viewerUsername || username}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
