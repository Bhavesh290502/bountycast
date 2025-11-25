"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import {
    useAccount,
    useConnect,
    useWriteContract,
    useWaitForTransactionReceipt,
    usePublicClient,
} from "wagmi";
import { decodeEventLog } from 'viem';
import { bountycastAbi, BOUNTYCAST_ADDRESS } from "../lib/contract";
import QuestionThread from "../components/QuestionThread";

interface Question {
    id: number;
    fid: number;
    username: string;
    question: string;
    bounty: number;
    token: string;
    created: number;
    deadline: number;
    onchainId: number;
    status: string;
    address?: string;
    active?: boolean;
    category?: string;
    tags?: string[];
    isPrivate?: boolean;
    updatedAt?: number;
    authorProfile?: {
        username: string;
        pfpUrl: string;
        isPro: boolean;
        score: number;
    };
}

const CATEGORIES = ['Solidity', 'Design', 'Marketing', 'Product', 'Business', 'Other'];

export default function HomePage() {
    const [isReady, setIsReady] = useState(false);
    const [viewerFid, setViewerFid] = useState<number | undefined>();
    const [viewerUsername, setViewerUsername] = useState<string | undefined>();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [showAsk, setShowAsk] = useState(false);
    const [questionText, setQuestionText] = useState("");
    const [bounty, setBounty] = useState(0.01);
    const [loading, setLoading] = useState(false);
    const [lastPostedBounty, setLastPostedBounty] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isFrameAdded, setIsFrameAdded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeMenuQuestionId, setActiveMenuQuestionId] = useState<number | null>(null);

    // Close menu when clicking outside (using overlay instead of document listener)
    const toggleMenu = (id: number) => {
        if (activeMenuQuestionId === id) {
            setActiveMenuQuestionId(null);
        } else {
            setActiveMenuQuestionId(id);
        }
    };
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [tags, setTags] = useState<string[]>([]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [showMyBounties, setShowMyBounties] = useState(false);

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

    // wagmi hooks (Farcaster mini app wallet)
    const { isConnected, address } = useAccount();
    const {
        connect,
        connectors,
        error: connectError,
        isPending: isConnectPending,
    } = useConnect();

    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();

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

                // Check if frame is already added
                const frameAdded = ctx?.client?.added || false;
                setIsFrameAdded(frameAdded);

                // Show "Add to Miniapps" popup automatically only if not added
                if (!frameAdded) {
                    try {
                        await sdk.actions.addFrame();
                        setIsFrameAdded(true);
                    } catch (e) {
                        console.log("Add frame prompt skipped or failed:", e);
                    }
                }
            } catch (e) {
                console.error("mini app init error (likely outside Farcaster)", e);
            } finally {
                setIsReady(true);
            }
        };
        init();
    }, []);

    // Load questions from API with filters
    const loadQuestions = async () => {
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (selectedCategory) params.append('category', selectedCategory);
            if (selectedStatus) params.append('status', selectedStatus);
            if (showMyBounties && viewerFid) params.append('authorFid', viewerFid.toString());

            const res = await fetch(`/api/questions?${params.toString()}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setQuestions(data);
            } else {
                console.error("Failed to load questions:", data);
                setQuestions([]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadQuestions();
    }, [searchQuery, selectedCategory, selectedStatus, showMyBounties]);

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

            let onchainId = -1;
            if (publicClient) {
                try {
                    const receipt = await publicClient.waitForTransactionReceipt({ hash });
                    // Find the QuestionCreated event
                    for (const log of receipt.logs) {
                        try {
                            const event = decodeEventLog({
                                abi: bountycastAbi,
                                data: log.data,
                                topics: log.topics,
                            });
                            if (event.eventName === 'QuestionCreated' && event.args) {
                                // @ts-ignore
                                onchainId = Number(event.args.id);
                                break;
                            }
                        } catch (e) {
                            // Ignore logs that don't match our ABI
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse logs:", e);
                }
            }

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
                    category,
                    tags,
                    isPrivate,
                }),
            });

            setLastPostedBounty({ question: questionText, bounty });
            setQuestionText("");
            setBounty(0.01);
            setCategory("");
            setTags([]);
            setIsPrivate(false);
            // Don't close showAsk yet, let user see success screen
            await loadQuestions();
        } catch (e) {
            console.error(e);
            alert("Failed to ask question / send transaction");
        } finally {
            setLoading(false);
        }
    };

    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [editLoading, setEditLoading] = useState(false);

    const handleEdit = async () => {
        if (!editingQuestion) return;
        setEditLoading(true);
        try {
            const res = await fetch('/api/questions/edit', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: editingQuestion.id,
                    fid: viewerFid,
                    question: editingQuestion.question,
                    category: editingQuestion.category,
                    tags: editingQuestion.tags,
                    isPrivate: editingQuestion.isPrivate
                }),
            });

            if (res.ok) {
                setEditingQuestion(null);
                await loadQuestions();
            } else {
                alert("Failed to update question");
            }
        } catch (e) {
            console.error(e);
            alert("Error updating question");
        } finally {
            setEditLoading(false);
        }
    };

    if (!isReady) {
        return (
            <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
                Loading mini app…
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto p-4 font-sans text-sm pb-20">
            {/* Edit Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Edit Question</h3>
                        <div className="space-y-3 mb-4">
                            <textarea
                                className="glass-input w-full p-3 rounded-lg min-h-[100px] resize-none text-sm placeholder-gray-500"
                                value={editingQuestion.question}
                                onChange={e => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                            />
                            <select
                                value={editingQuestion.category || ''}
                                onChange={e => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                                className="glass-input w-full p-3 rounded-lg text-sm"
                            >
                                <option value="">Select Category</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Tags (comma separated)"
                                value={editingQuestion.tags?.join(', ') || ''}
                                onChange={e => setEditingQuestion({ ...editingQuestion, tags: e.target.value.split(',').map(t => t.trim()) })}
                                className="glass-input w-full p-3 rounded-lg text-sm"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setEditingQuestion(null)}
                                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-black"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={editLoading}
                                className="px-4 py-2 rounded bg-brand-purple text-white hover:bg-brand-gold"
                            >
                                {editLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
            {/* Header and controls */}
            <header className="mb-6 text-center">
                <div className="flex flex-col items-center gap-2 mb-4">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-gold">
                        BountyCast
                    </h2>
                    {isConnected && address && userProfile && (
                        <div className="glass-card px-3 py-1 rounded-full text-xs flex items-center gap-2">
                            <img
                                src={userProfile.pfpUrl}
                                alt={userProfile.username}
                                className="w-5 h-5 rounded-full border border-white/10"
                            />
                            <span className="text-white font-bold">@{userProfile.username}</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-brand-gold">{typeof userProfile.score === 'number' ? userProfile.score.toFixed(2) : '0.00'}</span>
                        </div>
                    )}
                </div>

                {/* Controls Container */}
                <div className="flex flex-col items-center gap-3">
                    {/* Top Row: Search, Filters, Notifications, Add Frame */}
                    <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-lg">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="glass-input px-3 py-1.5 rounded-lg text-sm flex-1 min-w-[100px]"
                        />
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="glass-input px-2 py-1.5 rounded-lg text-sm w-28"
                        >
                            <option value="">Category</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {/* My Bounties Toggle */}
                        {viewerFid && (
                            <button
                                onClick={() => setShowMyBounties(!showMyBounties)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${showMyBounties
                                    ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                                    : 'glass-card text-gray-400 hover:text-white'
                                    }`}
                            >
                                My Bounties
                            </button>
                        )}

                        {!isFrameAdded && (
                            <button
                                onClick={async () => {
                                    try {
                                        await sdk.actions.addFrame();
                                        setIsFrameAdded(true);
                                    } catch (e) {
                                        console.log("Add frame failed:", e);
                                    }
                                }}
                                className="text-brand-purple hover:text-brand-gold text-xs font-medium transition-colors flex items-center gap-1 p-1.5 glass-card rounded-lg"
                                title="Add to Miniapps"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex justify-center mt-4">
                    {!isConnected && (
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
                        {lastPostedBounty ? (
                            <div className="text-center py-4">
                                <div className="text-4xl mb-3">🎉</div>
                                <h3 className="font-bold text-white text-lg mb-2">Bounty Posted!</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Share it to Farcaster to get answers faster.
                                </p>

                                <button
                                    onClick={() => {
                                        const text = `Help me solve this bounty! 💰 ${lastPostedBounty.bounty} ETH\n\n${lastPostedBounty.question}\n\nAnswer here:`;
                                        const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent('https://bountycast.vercel.app')}`;
                                        sdk.actions.openUrl(url);
                                    }}
                                    className="btn-primary w-full py-3 rounded-lg font-medium mb-3 flex items-center justify-center gap-2"
                                >
                                    <span>🔁</span> Share on Warpcast
                                </button>

                                <button
                                    onClick={() => {
                                        setLastPostedBounty(null);
                                        setShowAsk(false);
                                    }}
                                    className="text-gray-500 hover:text-white text-sm transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-white">New Bounty</h3>
                                    <button
                                        onClick={() => setShowAsk(false)}
                                        className="text-gray-500 hover:text-white transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <textarea
                                        className="glass-input w-full p-3 rounded-lg min-h-[100px] resize-none text-sm placeholder-gray-500"
                                        placeholder="What do you want to know?"
                                        value={questionText}
                                        onChange={(e) => setQuestionText(e.target.value)}
                                    />

                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min={0.00033}
                                                step={0.00001}
                                                className="glass-input w-full p-3 rounded-lg pl-8 text-sm"
                                                placeholder="0.001"
                                                value={bounty}
                                                onChange={(e) => setBounty(Number(e.target.value))}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold">
                                                Ξ
                                            </span>
                                        </div>
                                        <div className="flex items-center text-xs text-gray-500">
                                            Native Base ETH
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <select
                                            value={category}
                                            onChange={e => setCategory(e.target.value)}
                                            className="glass-input flex-1 p-3 rounded-lg text-sm"
                                        >
                                            <option value="">Select Category</option>
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Tags (e.g. react, web3)"
                                        value={tags.join(', ')}
                                        onChange={e => setTags(e.target.value.split(',').map(t => t.trim()))}
                                        className="glass-input w-full p-3 rounded-lg text-sm"
                                    />
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
                            </>
                        )}
                    </div>
                )}
            </section >

            {/* Transparent overlay to close menu */}
            {activeMenuQuestionId !== null && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => setActiveMenuQuestionId(null)}
                />
            )}

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
                            className={`glass-card p-5 rounded-xl transition-all duration-300 ${q.status === "awarded" ? "opacity-70 grayscale-[0.5]" : "hover:scale-[1.01] hover:shadow-lg hover:shadow-brand-purple/10"} ${activeMenuQuestionId === q.id ? "z-20 relative" : "z-0"}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    {q.authorProfile ? (
                                        <img
                                            src={q.authorProfile.pfpUrl}
                                            alt={q.authorProfile.username}
                                            className="w-8 h-8 rounded-full border border-white/10"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-gray-400">
                                            {(q.username || 'AN').slice(0, 2).toUpperCase()}
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const username = q.authorProfile ? q.authorProfile.username : (q.username || 'anon');
                                                    sdk.actions.openUrl(`https://warpcast.com/${username}`);
                                                }}
                                                className="font-semibold text-white text-sm hover:underline hover:text-brand-purple transition-colors text-left"
                                            >
                                                {q.authorProfile ? `@${q.authorProfile.username}` : (q.username || 'Anon')}
                                            </button>
                                            {q.authorProfile?.isPro && <span title="Pro User" className="text-[10px]">⚡</span>}
                                        </div>
                                        <div className="text-[10px] text-gray-500 flex gap-2">
                                            <span>
                                                {q.created ? (() => {
                                                    const date = new Date(typeof q.created === 'number' ? q.created : parseInt(q.created));
                                                    if (isNaN(date.getTime())) return '';
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const year = date.getFullYear();
                                                    return `${day}/${month}/${year}`;
                                                })() : ''}
                                            </span>
                                            {q.authorProfile && q.authorProfile.score > 0 && (
                                                <span>Score: {q.authorProfile.score.toFixed(2)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-brand-gold/10 border border-brand-gold/20 text-brand-gold px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                        <span>🏆</span>
                                        <span>{Number(q.bounty || 0).toFixed(8).replace(/\.?0+$/, '')} ETH</span>
                                    </div>
                                    {q.status !== 'active' && (
                                        <div className={`px-2 py-1 rounded text-xs font-medium border ${q.status === 'awarded'
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                                            }`}>
                                            {q.status === 'awarded' ? 'Awarded' : 'Expired'}
                                        </div>
                                    )}

                                    {/* 3-Dot Menu */}
                                    <div className="relative z-20">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                toggleMenu(q.id);
                                            }}
                                            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                                            </svg>
                                        </button>

                                        {activeMenuQuestionId === q.id && (
                                            <div className="absolute right-0 top-8 w-40 bg-gray-900 border border-white/10 shadow-xl rounded-lg py-1 z-50">
                                                {viewerFid && q.fid === viewerFid && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingQuestion(q);
                                                            setActiveMenuQuestionId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                                                    >
                                                        <span>✏️</span> Edit Question
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const text = `Help me solve this bounty! 💰 ${q.bounty} ETH\n\nAnswer here:`;
                                                        const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent('https://bountycast.vercel.app')}`;
                                                        sdk.actions.openUrl(url);
                                                        setActiveMenuQuestionId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                                                >
                                                    <span>🔁</span> Share
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="text-gray-200 mb-4 text-sm leading-relaxed">
                                {q.question}
                            </p>

                            {/* Tags & Category */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {q.category && (
                                    <span className="bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded text-[10px] border border-brand-purple/30">
                                        {q.category}
                                    </span>
                                )}
                                {q.tags && q.tags.map((tag, i) => (
                                    <span key={i} className="bg-white/5 text-gray-400 px-2 py-0.5 rounded text-[10px] border border-white/10">
                                        #{tag}
                                    </span>
                                ))}
                                {q.isPrivate && (
                                    <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                        🔒 Private
                                    </span>
                                )}
                            </div>

                            <div className="border-t border-white/5 pt-3 mt-3">
                                <QuestionThread
                                    questionId={q.id}
                                    fid={viewerFid}
                                    defaultUsername={viewerUsername || username}
                                    askerAddress={q.address}
                                    isQuestionActive={q.status === 'active'}
                                    onchainId={q.onchainId}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div >
    );
}
