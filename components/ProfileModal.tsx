import { useEffect, useState } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";

interface UserStats {
    profile: {
        username: string;
        displayName: string;
        pfpUrl: string;
        bio: string;
        isPro: boolean;
        score: number;
    } | null;
    stats: {
        bountiesWon: number;
        totalEarned: number;
        questionsAsked: number;
    };
    recentActivity: {
        id: number;
        question: string;
        bounty: number;
        status: string;
        created: number;
    }[];
}

interface Props {
    fid: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ fid, isOpen, onClose }: Props) {
    const [data, setData] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && fid) {
            loadStats();
        }
    }, [isOpen, fid]);

    const loadStats = async () => {
        if (!fid) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/user/${fid}/stats`);
            const json = await res.json();
            if (!json.error) {
                setData(json);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#1a1b1e] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {loading ? (
                    <div className="p-10 flex flex-col items-center justify-center text-gray-500 gap-3">
                        <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs">Loading profile...</p>
                    </div>
                ) : data && data.profile ? (
                    <div>
                        {/* Header / Banner */}
                        <div className="h-24 bg-gradient-to-r from-brand-purple/20 to-brand-gold/10 relative">
                            <button
                                onClick={onClose}
                                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Profile Info */}
                        <div className="px-6 pb-6 -mt-10">
                            <div className="flex justify-between items-end mb-4">
                                <img
                                    src={data.profile.pfpUrl}
                                    alt={data.profile.username}
                                    className="w-20 h-20 rounded-full border-4 border-[#1a1b1e] bg-[#1a1b1e]"
                                />
                                <button
                                    onClick={() => sdk.actions.openUrl(`https://warpcast.com/${data.profile?.username}`)}
                                    className="mb-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-xs font-medium text-white transition-colors border border-white/10"
                                >
                                    View on Warpcast ↗
                                </button>
                            </div>

                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {data.profile.displayName}
                                    {data.profile.isPro && <span className="text-xs bg-brand-purple px-1.5 py-0.5 rounded text-white">PRO</span>}
                                </h2>
                                <p className="text-gray-400 text-sm">@{data.profile.username}</p>
                                {data.profile.bio && (
                                    <p className="text-gray-300 text-sm mt-2 leading-relaxed">{data.profile.bio}</p>
                                )}
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                                    <div className="text-2xl font-bold text-brand-gold">{data.stats.totalEarned.toFixed(3)}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">ETH Earned</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                                    <div className="text-2xl font-bold text-white">{data.stats.bountiesWon}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Bounties Won</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                                    <div className="text-2xl font-bold text-white">{data.stats.questionsAsked}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Asked</div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            {data.recentActivity.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Bounties</h3>
                                    <div className="space-y-2">
                                        {data.recentActivity.map(q => (
                                            <div key={q.id} className="bg-white/5 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                                                <div className="truncate flex-1 mr-3">
                                                    <p className="text-sm text-gray-200 truncate">{q.question}</p>
                                                    <p className="text-xs text-gray-500">{new Date(q.created).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-brand-gold font-bold text-xs">{q.bounty} ETH</div>
                                                    <div className={`text-[10px] px-1.5 py-0.5 rounded inline-block mt-1 ${q.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                        q.status === 'awarded' ? 'bg-brand-gold/20 text-brand-gold' :
                                                            'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {q.status}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-10 text-center text-red-400">
                        Failed to load profile.
                    </div>
                )}
            </div>
        </div>
    );
}
