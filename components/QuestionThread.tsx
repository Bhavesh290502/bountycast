"use client";

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { sdk } from "@farcaster/miniapp-sdk";
import { bountycastAbi, BOUNTYCAST_ADDRESS } from '../lib/contract';
import MarkdownRenderer from './MarkdownRenderer';

interface Answer {
    id: number;
    username: string;
    answer: string;
    upvotes: number;
    address?: string; // Need address to award bounty
    authorProfile?: {
        username: string;
        pfpUrl: string;
        isPro: boolean;
        score: number;
    };
}

export default function QuestionThread({
    questionId,
    fid,
    defaultUsername,
    askerAddress,
    isQuestionActive,
    onchainId,
}: {
    questionId: number;
    fid?: number;
    defaultUsername?: string;
    askerAddress?: string;
    isQuestionActive?: boolean;
    onchainId?: number;
}) {
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [myAnswer, setMyAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();

    const username = defaultUsername || (address ? `user-${address.slice(0, 6)}` : 'anon');

    const loadAnswers = async () => {
        try {
            const res = await fetch(`/api/answers?questionId=${questionId}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setAnswers(data);
            } else {
                console.error("Failed to load answers:", data);
                setAnswers([]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadAnswers();
    }, [questionId]);

    const submitAnswer = async () => {
        if (!myAnswer.trim()) return;

        if (!fid) {
            alert("Please log in to answer.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId,
                    answer: myAnswer,
                    fid,
                    username,
                    address,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                alert(data.error || "Failed to post answer");
                return;
            }

            setMyAnswer('');
            await loadAnswers();
        } catch (e) {
            console.error(e);
            alert("An error occurred while posting your answer.");
        } finally {
            setLoading(false);
        }
    };

    const upvote = async (id: number) => {
        if (!fid) {
            alert("Please log in to upvote.");
            return;
        }

        try {
            const res = await fetch('/api/answers/upvote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, fid }),
            });

            if (!res.ok) {
                const data = await res.json();
                alert(data.error || "Failed to upvote");
                return;
            }

            await loadAnswers();
        } catch (e) {
            console.error(e);
        }
    };

    const { address: viewerAddress } = useAccount();

    // Check if viewer is the asker (this needs to be passed down or fetched)
    const awardBounty = async (winnerAddress: string) => {
        if (!winnerAddress) return;

        const targetId = onchainId && onchainId > -1 ? onchainId : questionId;

        if (targetId === -1 || targetId === undefined) {
            alert("Error: Invalid On-Chain ID. Cannot award bounty.");
            return;
        }

        try {
            const hash = await writeContractAsync({
                address: BOUNTYCAST_ADDRESS,
                abi: bountycastAbi,
                functionName: "selectWinner",
                args: [BigInt(targetId), winnerAddress as `0x${string}`],
            });

            // Call API to update status
            await fetch('/api/questions/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId,
                    fid,
                    txHash: hash
                })
            });

            alert(`Bounty awarded! Tx: ${hash}`);
            window.location.reload(); // Reload to show updated status
        } catch (e) {
            console.error(e);
            alert("Failed to award bounty");
        }
    };

    const [comments, setComments] = useState<{ [answerId: number]: any[] }>({});
    const [expandedComments, setExpandedComments] = useState<{ [answerId: number]: boolean }>({});
    const [commentText, setCommentText] = useState<{ [answerId: number]: string }>({});
    const [commentLoading, setCommentLoading] = useState<{ [answerId: number]: boolean }>({});

    // Load all comments for all answers on mount
    const loadAllComments = async () => {
        try {
            const commentPromises = answers.map(async (a) => {
                const res = await fetch(`/api/comments?answerId=${a.id}`);
                const data = await res.json();
                return { answerId: a.id, comments: Array.isArray(data) ? data : [] };
            });
            const results = await Promise.all(commentPromises);
            const commentsMap: { [key: number]: any[] } = {};
            results.forEach(r => {
                commentsMap[r.answerId] = r.comments;
            });
            setComments(commentsMap);
        } catch (e) {
            console.error("Failed to load comments", e);
        }
    };

    useEffect(() => {
        if (answers.length > 0) {
            loadAllComments();
        }
    }, [answers.length]);

    const toggleComments = async (answerId: number) => {
        const isExpanded = expandedComments[answerId];
        setExpandedComments(prev => ({ ...prev, [answerId]: !isExpanded }));
    };

    const postComment = async (answerId: number) => {
        const text = commentText[answerId];
        if (!text?.trim()) return;
        if (!fid) {
            alert("Please log in to comment.");
            return;
        }

        setCommentLoading(prev => ({ ...prev, [answerId]: true }));
        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answerId,
                    fid,
                    username,
                    address,
                    comment: text
                }),
            });

            if (res.ok) {
                setCommentText(prev => ({ ...prev, [answerId]: '' }));
                // Reload comments
                const commentsRes = await fetch(`/api/comments?answerId=${answerId}`);
                const data = await commentsRes.json();
                if (Array.isArray(data)) {
                    setComments(prev => ({ ...prev, [answerId]: data }));
                }
            }
        } catch (e) {
            console.error(e);
            alert("Failed to post comment");
        } finally {
            setCommentLoading(prev => ({ ...prev, [answerId]: false }));
        }
    };

    return (
        <div className="mt-4">
            <div className="flex gap-2 mb-4">
                <input
                    className="glass-input flex-1 p-2 rounded-lg text-xs"
                    placeholder="Add an answer..."
                    value={myAnswer}
                    onChange={(e) => setMyAnswer(e.target.value)}
                />
                <button
                    onClick={submitAnswer}
                    disabled={loading}
                    className="btn-primary px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                    {loading ? 'Posting...' : 'Post'}
                </button>
            </div >
            <div className="text-[10px] text-gray-500 text-right mb-4 -mt-3 mr-1">
                Markdown supported: **bold**, *italic*, `code`
            </div>

            <div className="space-y-2">
                {answers.map((a) => (
                    <div key={a.id} className="bg-white/5 rounded-lg overflow-hidden">
                        <div className="p-3 flex justify-between items-center group hover:bg-white/10 transition-colors">
                            <div className="flex-1 mr-2">
                                <div className="flex items-center gap-2 mb-1">
                                    {a.authorProfile ? (
                                        <img
                                            src={a.authorProfile.pfpUrl}
                                            alt={a.authorProfile.username}
                                            className="w-5 h-5 rounded-full border border-white/10"
                                        />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[8px] text-gray-400">
                                            {(a.username || 'AN').slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            const username = a.authorProfile?.username || a.username;
                                            sdk.actions.openUrl(`https://warpcast.com/${username}`);
                                        }}
                                        className="font-bold text-brand-purple text-xs hover:underline text-left"
                                    >
                                        {a.authorProfile ? `@${a.authorProfile.username}` : a.username}
                                    </button >
                                </div >

                                <div className="text-gray-300 text-xs block pl-7">
                                    <MarkdownRenderer content={a.answer} />
                                </div>
                            </div >

                            <div className="flex items-center gap-2">
                                {/* Show Award button if viewer is asker and question is active */}
                                {askerAddress && address && askerAddress.toLowerCase() === address.toLowerCase() && isQuestionActive && a.address && (
                                    <button
                                        onClick={() => awardBounty(a.address!)}
                                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-green-500/20 hover:bg-green-500/40 text-green-400 hover:text-white transition-all group mr-2"
                                        title="Award Bounty"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 16 16"
                                            fill="currentColor"
                                            className="group-hover:scale-110 transition-transform"
                                        >
                                            <path d="M8 1L10 6H15L11 9L12.5 14L8 11L3.5 14L5 9L1 6H6L8 1Z" />
                                        </svg>
                                    </button>
                                )}

                                <button
                                    onClick={() => toggleComments(a.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all group mr-2"
                                    title="Comments"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        className="group-hover:scale-110 transition-transform"
                                    >
                                        <path d="M2 4.5C2 3.67157 2.67157 3 3.5 3H12.5C13.3284 3 14 3.67157 14 4.5V10.5C14 11.3284 13.3284 12 12.5 12H9L5 14V12H3.5C2.67157 12 2 11.3284 2 10.5V4.5Z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span className="text-xs font-medium">{comments[a.id]?.length || 0}</span>
                                </button>

                                <button
                                    onClick={() => upvote(a.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-brand-gold transition-all group"
                                    title="Toggle Upvote"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                        className="group-hover:scale-110 transition-transform"
                                    >
                                        <path d="M8 2L4 8H7V14H9V8H12L8 2Z" />
                                    </svg>
                                    <span className="text-xs font-bold">{a.upvotes}</span>
                                </button>
                            </div>
                        </div>

                        {/* Comments Section */}
                        {
                            expandedComments[a.id] && (
                                <div className="bg-black/20 p-3 border-t border-white/5">
                                    {comments[a.id]?.map((c: any) => (
                                        <div key={c.id} className="mb-2 pl-2 border-l-2 border-white/10 text-xs">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <button
                                                    onClick={() => sdk.actions.openUrl(`https://warpcast.com/${c.username}`)}
                                                    className="font-bold text-gray-400 hover:text-brand-purple hover:underline"
                                                >
                                                    {c.username}
                                                </button>

                                            </div>
                                            <p className="text-gray-300">{c.comment}</p>
                                        </div>
                                    ))}
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            className="glass-input flex-1 p-1.5 rounded text-xs"
                                            placeholder="Reply..."
                                            value={commentText[a.id] || ''}
                                            onChange={e => setCommentText(prev => ({ ...prev, [a.id]: e.target.value }))}
                                        />
                                        <button
                                            onClick={() => postComment(a.id)}
                                            disabled={commentLoading[a.id]}
                                            className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-xs"
                                        >
                                            {commentLoading[a.id] ? '...' : 'Reply'}
                                        </button>
                                    </div>
                                </div>
                            )
                        }
                    </div>
                ))}
            </div >
        </div >
    );
}
