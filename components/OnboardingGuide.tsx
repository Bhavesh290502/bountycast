"use client";

import { useState, useEffect } from 'react';

export default function OnboardingGuide() {
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeenGuide = localStorage.getItem('bountycast_onboarding_completed');
        if (!hasSeenGuide) {
            setIsVisible(true);
        }
    }, []);

    const completeGuide = () => {
        localStorage.setItem('bountycast_onboarding_completed', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    const steps = [
        {
            title: "Welcome to BountyCast! 🚀",
            content: "The easiest way to ask questions and earn ETH on Farcaster. Let's take a quick tour.",
            icon: "👋"
        },
        {
            title: "Ask & Earn",
            content: "Post your questions with an ETH bounty to get high-quality answers fast. Or answer others' questions to earn crypto!",
            icon: "💰"
        },
        {
            title: "Manage Bounties",
            content: "Track your questions and earnings in the 'My Bounties' section. You can also edit your questions and award bounties there.",
            icon: "📋"
        },
        {
            title: "Ready to go!",
            content: "Start exploring now. Good luck!",
            icon: "✨"
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="glass-card max-w-md w-full p-6 rounded-2xl relative animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-6">
                    <div className="text-4xl mb-4">{steps[step].icon}</div>
                    <h2 className="text-2xl font-bold text-white mb-2">{steps[step].title}</h2>
                    <p className="text-gray-300 leading-relaxed">{steps[step].content}</p>
                </div>

                <div className="flex items-center justify-between mt-8">
                    <div className="flex gap-1.5">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-brand-purple" : "w-1.5 bg-white/20"
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            if (step < steps.length - 1) {
                                setStep(step + 1);
                            } else {
                                completeGuide();
                            }
                        }}
                        className="bg-brand-purple hover:bg-brand-purple/80 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                        {step < steps.length - 1 ? "Next" : "Get Started"}
                    </button>
                </div>
            </div>
        </div>
    );
}
