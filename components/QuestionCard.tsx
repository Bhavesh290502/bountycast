import { sdk } from "@farcaster/miniapp-sdk";
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
    isPrivate?: boolean;
    updatedAt?: number;
    authorProfile?: {
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
    return (
        <div
            className={`glass-card p-5 rounded-xl transition-all duration-300 
                ${q.status === "awarded" ? "opacity-70 grayscale-[0.5]" : "hover:scale-[1.01] hover:shadow-lg hover:shadow-brand-purple/10"} 
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

            <div className="text-gray-200 mb-4 text-sm">
                <MarkdownRenderer content={q.question} />
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
    );
}
