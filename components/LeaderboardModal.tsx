import { useEffect, useState } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";

interface LeaderboardEntry {
    fid: number;
    bountiesWon: number;
    totalEarned: number;
    profile: {
        username: string;
        pfpUrl: string;
        displayName: string;
    } | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function LeaderboardModal({ isOpen, onClose }: Props) {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadLeaderboard();
        }
    }, [isOpen]);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/leaderboard');
            const data = await res.json();
            if (Array.isArray(data)) {
                setLeaders(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1a1b1e] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🏆</span>
                        <h2 className="font-bold text-white text-lg">Top Hunters</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {loading ? (
                        <div className="py-10 text-center text-gray-500 flex flex-col items-center gap-3">
                            <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs">Loading rankings...</p>
                        </div>
                    ) : leaders.length === 0 ? (
                        <div className="py-10 text-center text-gray-500">
                            <p>No bounties awarded yet.</p>
                            <p className="text-xs mt-1">Be the first to win!</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {leaders.map((user, index) => (
                                <div
                                    key={user.fid}
                                    className={`flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-white/5 transition-all ${index === 0 ? 'bg-brand-gold/10 border-brand-gold/20' :
                                        index === 1 ? 'bg-gray-400/10 border-gray-400/20' :
                                            index === 2 ? 'bg-orange-700/10 border-orange-700/20' :
                                                'bg-white/5'
                                        }`}
                                >
                                    {/* Rank */}
                                    <div className={`w-6 text-center font-bold text-lg ${index === 0 ? 'text-brand-gold' :
                                        index === 1 ? 'text-gray-300' :
                                            index === 2 ? 'text-orange-400' :
                                                'text-gray-500 text-sm'
                                        }`}>
                                        {index + 1}
                                    </div>

                                    {/* Avatar */}
                                    <img
                                        src={user.profile?.pfpUrl || 'https://warpcast.com/avatar.png'}
                                        alt={user.profile?.username}
                                        className="w-10 h-10 rounded-full border-2 border-white/10"
                                    />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() => sdk.actions.openUrl(`https://warpcast.com/${user.profile?.username}`)}
                                            className="font-bold text-white hover:underline truncate block text-left"
                                        >
                                            {user.profile?.displayName || user.profile?.username || 'Anon'}
                                        </button>
                                        <div className="text-xs text-gray-400 flex items-center gap-1">
                                            <span>@{user.profile?.username}</span>
                                            <span>•</span>
                                            <span className="text-brand-purple">{user.bountiesWon} wins</span>
                                        </div>
                                    </div>

                                    {/* Earnings */}
                                    <div className="text-right">
                                        <div className="font-bold text-brand-gold text-sm">
                                            {user.totalEarned.toFixed(4)} ETH
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
