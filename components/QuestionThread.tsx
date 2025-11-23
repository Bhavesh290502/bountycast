"use client";

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { sdk } from "@farcaster/miniapp-sdk";
import { bountycastAbi, BOUNTYCAST_ADDRESS } from '../lib/contract';

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
    // For now, we'll assume the parent component passes `askerAddress` or we use `address` comparison if we had it.
    // Since we don't have askerAddress prop, let's add it.

    // WAIT: I need to update props first.
    // Let's assume for this step I will just add the function and button, but I need the asker address.
    // I'll update the component signature in the next step or this one if I can see the file content again to be sure.
    // Looking at previous view_file, QuestionThread takes questionId, fid, defaultUsername.
    // I need to add `askerAddress` and `isQuestionActive` to props.

    const awardBounty = async (winnerAddress: string) => {
        if (!winnerAddress) return;
        try {
            const hash = await writeContractAsync({
                address: BOUNTYCAST_ADDRESS,
                abi: bountycastAbi,
                const hash = await writeContractAsync({
                    address: BOUNTYCAST_ADDRESS,
                    abi: bountycastAbi,
                    functionName: "selectWinner",
                    args: [BigInt(onchainId && onchainId > -1 ? onchainId : questionId), winnerAddress as `0x${string}`],
                });
                alert(`Bounty awarded! Tx: ${hash}`);
            // Optimistically update UI or reload
        } catch (e) {
            console.error(e);
            alert("Failed to award bounty");
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
            </div>

            <div className="space-y-2">
                {answers.map((a) => (
                    <div
                        key={a.id}
                        className="bg-white/5 p-3 rounded-lg flex justify-between items-center group hover:bg-white/10 transition-colors"
                    >
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
    className = "font-bold text-brand-purple text-xs hover:underline text-left"
        >
        { a.authorProfile ? `@${a.authorProfile.username}` : a.username }
                                </button >
        { a.authorProfile?.isPro && <span title="Pro User" className="text-[10px]">⚡</span> }
                            </div >
        <span className="text-gray-300 text-xs block pl-7">{a.answer}</span>
                        </div >

        <div className="flex items-center gap-2">
            {/* Show Award button if viewer is asker and question is active */}
            {askerAddress && address && askerAddress.toLowerCase() === address.toLowerCase() && isQuestionActive && a.address && (
                <button
                    onClick={() => awardBounty(a.address!)}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-colors mr-2"
                    title="Award Bounty"
                >
                    🏆 Award
                </button>
            )}

            <span className="text-xs font-medium text-gray-400">{a.upvotes}</span>
            <button
                onClick={() => upvote(a.id)}
                className="text-gray-500 hover:text-brand-gold transition-colors p-1 rounded hover:bg-brand-gold/10"
                title="Upvote"
            >
                ▲
            </button>
        </div>
                    </div >
                ))
}
            </div >
        </div >
    );
}
