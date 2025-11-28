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

import QuestionCard from '../components/QuestionCard';
import OnboardingGuide from '../components/OnboardingGuide';

const CATEGORIES = ['Solidity', 'Design', 'Marketing', 'Product', 'Business', 'Other'];

export default function HomePage() {
    const [isReady, setIsReady] = useState(false);
    const [viewerFid, setViewerFid] = useState<number | undefined>();
    const [viewerUsername, setViewerUsername] = useState<string | undefined>();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [showAsk, setShowAsk] = useState(false);
    const [questionText, setQuestionText] = useState("");
    const [bounty, setBounty] = useState(0.000001);
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
    const [selectedStatus, setSelectedStatus] = useState<string>("active");
    const [selectedSort, setSelectedSort] = useState<string>("newest");
    const [category, setCategory] = useState<string>("");
    const [tags, setTags] = useState<string[]>([]);
    const [isPrivate, setIsPrivate] = useState(false);

    const [showMyBountiesModal, setShowMyBountiesModal] = useState(false);
    const [myQuestions, setMyQuestions] = useState<Question[]>([]);
    const [myQuestionsLoading, setMyQuestionsLoading] = useState(false);

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

                // Register notification token if available
                if (ctx?.client?.notificationDetails && (ctx.user?.fid || ctx.viewer?.fid)) {
                    const fid = ctx.user?.fid || ctx.viewer?.fid;
                    const { url, token } = ctx.client.notificationDetails;

                    fetch('/api/notifications/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fid, url, token })
                    }).catch(err => console.error("Failed to register notification token:", err));
                }

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
            if (selectedSort) params.append('sort', selectedSort);

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
    }, [searchQuery, selectedCategory, selectedStatus, selectedSort]);

    // Load My Bounties when modal opens
    useEffect(() => {
        if (showMyBountiesModal && viewerFid) {
            setMyQuestionsLoading(true);
            fetch(`/api/questions?authorFid=${viewerFid}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setMyQuestions(data);
                })
                .catch(console.error)
                .finally(() => setMyQuestionsLoading(false));
        }
    }, [showMyBountiesModal, viewerFid]);

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
        if (bounty < 0.000001) {
            alert("Minimum bounty is 0.000001 ETH");
            return;
        }
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
            const durationMs = 15 * 24 * 60 * 60 * 1000; // 15 days
            const deadlineMs = now + durationMs;
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
                    console.log("Waiting for transaction receipt...", hash);
                    const receipt = await publicClient.waitForTransactionReceipt({ hash });
                    console.log("Receipt received:", receipt);

                    // Find the QuestionCreated event
                    for (const log of receipt.logs) {
                        try {
                            const event = decodeEventLog({
                                abi: bountycastAbi,
                                data: log.data,
                                topics: log.topics,
                            });
                            console.log("Decoded event:", event);
                            if (event.eventName === 'QuestionCreated' && event.args) {
                                // @ts-ignore
                                onchainId = Number(event.args.id);
                                console.log("Found onchainId:", onchainId);
                                break;
                            }
                        } catch (e) {
                            // Ignore logs that don't match our ABI
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse logs:", e);
                }
            } else {
                console.warn("No publicClient available to wait for receipt");
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
            setBounty(0.000001);
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
                            <div className="text-xs text-gray-500 text-right mt-1 mb-2">
                                Markdown supported: **bold**, *italic*, `code`
                            </div>
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

            {/* My Bounties Modal */}
            {showMyBountiesModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span>💎</span> My Bounties
                            </h3>
                            <button
                                onClick={() => setShowMyBountiesModal(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {myQuestionsLoading ? (
                                <div className="text-center py-10 text-gray-500">Loading...</div>
                            ) : myQuestions.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    You haven't posted any bounties yet.
                                </div>
                            ) : (
                                myQuestions.map(q => (
                                    <QuestionCard
                                        key={q.id}
                                        q={q}
                                        viewerFid={viewerFid}
                                        viewerUsername={viewerUsername}
                                        username={username}
                                        activeMenuQuestionId={activeMenuQuestionId}
                                        toggleMenu={toggleMenu}
                                        setActiveMenuQuestionId={setActiveMenuQuestionId}
                                        setEditingQuestion={setEditingQuestion}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

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

                        {/* Sort Dropdown */}
                        <select
                            value={selectedSort}
                            onChange={e => setSelectedSort(e.target.value)}
                            className="glass-input px-2 py-1.5 rounded-lg text-sm w-32"
                        >
                            <option value="newest">Newest</option>
                            <option value="highest_bounty">Highest Bounty</option>
                            <option value="expiring_soon">Expiring Soon</option>
                        </select>

                        {/* My Bounties Toggle */}
                        {viewerFid && (
                            <button
                                onClick={() => setShowMyBountiesModal(true)}
                                className="glass-card px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
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
                                    <div className="text-xs text-gray-500 text-right mt-1 mb-3">
                                        Markdown supported: **bold**, *italic*, `code`
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min={0.000001}
                                                step={0.000001}
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
                <div className="mb-4">
                    <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-lg">
                        {['active', 'awarded', 'expired'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setSelectedStatus(status)}
                                className={`py-2 rounded-md text-xs font-medium transition-all ${selectedStatus === status
                                    ? 'bg-brand-purple text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    {questions.length === 0 && (
                        <div className="text-center py-10 text-gray-600">
                            <p>No questions yet.</p>
                            <p className="text-xs mt-1">Be the first to ask!</p>
                        </div>
                    )}

                    {questions.map((q) => (
                        <QuestionCard
                            key={q.id}
                            q={q}
                            viewerFid={viewerFid}
                            viewerUsername={viewerUsername}
                            username={username}
                            activeMenuQuestionId={activeMenuQuestionId}
                            toggleMenu={toggleMenu}
                            setActiveMenuQuestionId={setActiveMenuQuestionId}
                            setEditingQuestion={setEditingQuestion}
                        />
                    ))}
                </div>
            </section>
            <OnboardingGuide />
        </div >
    );
}
