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
    setLoading(true);
    try {
      await fetch('/api/answers', {
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
      setMyAnswer('');
      await loadAnswers();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const upvote = async (id: number) => {
    try {
      await fetch('/api/answers/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await loadAnswers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        <input
          style={{ flex: 1, padding: 4, fontSize: 12 }}
          placeholder="Answer…"
          value={myAnswer}
          onChange={(e) => setMyAnswer(e.target.value)}
        />
        <button onClick={submitAnswer} disabled={loading} style={{ fontSize: 12 }}>
          {loading ? 'Posting…' : 'Post'}
        </button>
      </div>
      <div style={{ fontSize: 12 }}>
        {answers.map((a) => (
          <div
            key={a.id}
            style={{
              borderTop: '1px solid #eee',
              paddingTop: 4,
              paddingBottom: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              <b>{a.username}</b>: {a.answer}
            </span>
            <span>
              ▲ {a.upvotes}{' '}
              <button
                onClick={() => upvote(a.id)}
                style={{ fontSize: 10, marginLeft: 4 }}
              >
                Upvote
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
