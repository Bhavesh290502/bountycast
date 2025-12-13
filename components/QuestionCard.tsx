import { useState } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";
import { useWriteContract } from "wagmi";
import { bountycastAbi, BOUNTYCAST_ADDRESS } from "../lib/contract";
import QuestionThread from "./QuestionThread";
import MarkdownRenderer from "./MarkdownRenderer";

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
    updatedAt?: number;
    winner_fid?: number;
    original_question?: string;
    authorProfile?: {
        username: string;
        pfpUrl: string;
        isPro: boolean;
        score: number;
    };
    winnerProfile?: {
        username: string;
        pfpUrl: string;
        isPro: boolean;
        score: number;
    };
}

interface QuestionCardProps {
    q: Question;
    viewerFid?: number;
    viewerUsername?: string;
    username: string;
    activeMenuQuestionId: number | null;
    toggleMenu: (id: number) => void;
    setActiveMenuQuestionId: (id: number | null) => void;
    setEditingQuestion: (q: Question | null) => void;
}

export default function QuestionCard({
    q,
    viewerFid,
    viewerUsername,
    username,
    activeMenuQuestionId,
    toggleMenu,
    setActiveMenuQuestionId,
    setEditingQuestion
}: QuestionCardProps) {
    const { writeContractAsync } = useWriteContract();
    const [isExpanded, setIsExpanded] = useState(false);



    return (
        <div
            className={`glass-card p-5 rounded-xl transition-all duration-300 
                hover:scale-[1.01] hover:shadow-lg hover:shadow-brand-purple/10 
                ${activeMenuQuestionId === q.id ? "z-20 relative" : "z-0"}
                ${viewerFid && q.fid === viewerFid ? "border-brand-purple/30 bg-brand-purple/5" : ""}
            `}
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
                        </div>
                        <div className="text-[10px] text-gray-500 flex gap-2">
                            <span>
                                {q.created ? (() => {
                                    const date = new Date(typeof q.created === 'number' ? q.created : parseInt(q.created as any));
                                    if (isNaN(date.getTime())) return '';
                                    const day = String(date.getDate()).padStart(2, '0');
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const year = date.getFullYear();
                                    return `${day}/${month}/${year}`;
                                })() : ''}
                            </span>

                            {q.authorProfile && q.authorProfile.score > 0 && (
                                <span>• Score: {q.authorProfile.score.toFixed(2)}</span>
                            )}
                        </div>

                        {q.status === 'active' && q.deadline && (
                            <div className="text-[10px] text-brand-gold mt-0.5">
                                {(() => {
                                    const now = Date.now();
                                    const diff = q.deadline - now;
                                    if (diff <= 0) return 'Expired';
                                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                    if (days > 0) return `${days}d ${hours}h left`;
                                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                    return `${hours}h ${minutes}m left`;
                                })()}
                            </div>
                        )}

                        {q.winnerProfile && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    sdk.actions.openUrl(`https://warpcast.com/${q.winnerProfile!.username}`);
                                }}
                                className="text-[10px] text-green-400 mt-0.5 flex items-center gap-1 hover:underline text-left"
                            >
                                <span>🏆 Won by @{q.winnerProfile.username}</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-brand-gold/10 border border-brand-gold/20 text-brand-gold px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <span>🏆</span>
                        <span>{Number(q.bounty || 0).toFixed(8).replace(/\.?0+$/, '')} ETH</span>
                    </div>



                    {/* Refund Button for Expired Questions */}
                    {q.status === 'expired' && viewerFid && q.fid === viewerFid && (
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (!q.onchainId || q.onchainId === -1) {
                                    alert("Error: Invalid On-Chain ID");
                                    return;
                                }
                                try {
                                    const hash = await writeContractAsync({
                                        address: BOUNTYCAST_ADDRESS,
                                        abi: bountycastAbi,
                                        functionName: "refund",
                                        args: [BigInt(q.onchainId)],
                                    });
                                    alert(`Refund transaction sent! Tx: ${hash}`);
                                } catch (err: any) {
                                    console.error(err);
                                    alert(`Refund failed: ${err.message}`);
                                }
                            }}
                            className="bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 px-2 py-1 rounded text-xs font-bold transition-colors"
                        >
                            Refund 💸
                        </button>
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
                                {viewerFid && q.fid === viewerFid && q.status === 'active' && !q.original_question && (
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
                                {q.status === 'active' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const text = `Help me solve this bounty! 💰 ${q.bounty} ETH\n\nAnswer here:`;
                                            const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(`https://bountycast.vercel.app?id=${q.id}`)}`;
                                            sdk.actions.openUrl(url);
                                            setActiveMenuQuestionId(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                                    >
                                        <span>🔁</span> Share
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="text-gray-200 mb-4 text-sm">
                {q.original_question ? (
                    <div className="space-y-3">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Original Question</div>
                            <div className={`relative ${!isExpanded ? 'max-h-[80px] overflow-hidden' : ''}`}>
                                <MarkdownRenderer content={q.original_question} />
                                {!isExpanded && q.original_question.length > 200 && (
                                    <div className="absolute bottom-0 left-0 w-full h-8 pointer-events-none" />
                                )}
                            </div>
                        </div>
                        <div className="bg-brand-purple/10 p-3 rounded-lg border border-brand-purple/20">
                            <div className="text-[10px] text-brand-purple uppercase font-bold mb-1">Edited Question</div>
                            <div className="relative">
                                <MarkdownRenderer
                                    content={q.question}
                                    className={!isExpanded ? 'line-clamp-5' : ''}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <MarkdownRenderer
                            content={q.question}
                            className={!isExpanded ? 'line-clamp-5' : ''}
                        />
                    </div>
                )}
                {(q.question.length > 200 || (q.original_question && q.original_question.length > 200)) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="text-brand-purple text-xs font-bold mt-2 relative z-10 hover:underline flex items-center gap-1"
                    >
                        {isExpanded ? (
                            <>Show Less <span className="text-[10px]">▲</span></>
                        ) : (
                            <>Read More <span className="text-[10px]">▼</span></>
                        )}
                    </button>
                )}
            </div>

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

            </div>

            <div className="border-t border-white/5 pt-3 mt-3">
                <QuestionThread
                    questionId={q.id}
                    fid={viewerFid}
                    defaultUsername={viewerUsername || username}
                    askerAddress={q.address}
                    isQuestionActive={q.status === 'active'}
                    onchainId={q.onchainId}
                    deadline={q.deadline}
                    winnerProfile={q.winnerProfile}
                />
            </div>
        </div >
    );
}
