"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface Answer {
    id: number;
    username: string;
    answer: string;
    upvotes: number;
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
    const [myAnswer, setMyAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const { address } = useAccount();

    const username = defaultUsername || (address ? `user-${address.slice(0, 6)}` : 'anon');

    const loadAnswers = async () => {
        try {
            const res = await fetch(`/api/answers?questionId=${questionId}`);
            const data = await res.json();
            setAnswers(data || []);
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
                            <span className="font-bold text-brand-purple text-xs mr-2">{a.username}</span>
                            <span className="text-gray-300 text-xs">{a.answer}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-400">{a.upvotes}</span>
                            <button
                                onClick={() => upvote(a.id)}
                                className="text-gray-500 hover:text-brand-gold transition-colors p-1 rounded hover:bg-brand-gold/10"
                                title="Upvote"
                            >
                                ▲
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
