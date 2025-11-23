"use client";
"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface Answer {
    id: number;
    fid: number;
    username: string;
    answer: string;
    upvotes: number;
    created: number;
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
}: {
    questionId: number;
    fid?: number;
    defaultUsername?: string;
}) {
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [newAnswer, setNewAnswer] = useState("");
    const [loading, setLoading] = useState(false);

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
        if (!newAnswer.trim()) return;
        if (!fid) {
            alert("Please log in to answer.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/answers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questionId,
                    fid,
                    username: defaultUsername,
                    answer: newAnswer,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Failed to submit answer");
                return;
            }

            setNewAnswer("");
            await loadAnswers();
        } catch (e) {
            console.error(e);
            alert("Error submitting answer");
        } finally {
            setLoading(false);
        }
    };

    const upvote = async (answerId: number) => {
        if (!fid) {
            alert("Please log in to upvote.");
            return;
        }
        try {
            const res = await fetch("/api/answers/upvote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: answerId, fid }),
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Failed to upvote");
                return;
            }

            await loadAnswers();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="mt-4 space-y-4">
            <h4 className="text-sm font-bold text-gray-300 mb-2">Answers ({answers.length})</h4>

            {answers.map((a) => (
                <div key={a.id} className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                {a.authorProfile ? (
                                    <img
                                        src={a.authorProfile.pfpUrl}
                                        alt={a.authorProfile.username}
                                        className="w-6 h-6 rounded-full border border-white/10"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                        {(a.username || 'AN').slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                {a.authorProfile?.isPro && (
                                    <div className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full p-[1px] border border-gray-800">
                                        <span title="Pro User" className="text-[8px]">⚡</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <a
                                    href={`https://warpcast.com/${a.authorProfile ? a.authorProfile.username : (a.username || 'anon')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-gray-300 hover:text-brand-purple hover:underline transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {a.authorProfile ? `@${a.authorProfile.username}` : (a.username || 'Anon')}
                                </a>
                                <span className="text-[10px] text-gray-600">
                                    {new Date(a.created).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => upvote(a.id)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-gold transition-colors bg-white/5 px-2 py-1 rounded-full"
                        >
                            <span>▲</span>
                            <span>{a.upvotes || 0}</span>
                        </button>
                    </div>
                    <p className="text-gray-300 text-sm pl-8">{a.answer}</p>
                </div>
            ))}

            <div className="mt-4 flex gap-2">
                <input
                    type="text"
                    className="glass-input flex-1 p-2 rounded-lg text-sm"
                    placeholder="Write an answer..."
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                />
                <button
                    onClick={submitAnswer}
                    disabled={loading}
                    className="btn-primary px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                    {loading ? "..." : "Reply"}
                </button>
            </div>
        </div>
    );
}
