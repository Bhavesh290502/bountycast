// Application constants - centralized configuration

// Bounty Configuration
export const BOUNTY_CONFIG = {
    MIN_BOUNTY_ETH: parseFloat(process.env.NEXT_PUBLIC_MIN_BOUNTY_ETH || '0.001'),
    DEADLINE_DAYS: parseInt(process.env.NEXT_PUBLIC_BOUNTY_DEADLINE_DAYS || '15'),
    MAX_QUESTION_LENGTH: parseInt(process.env.NEXT_PUBLIC_MAX_QUESTION_LENGTH || '500'),
    MAX_ANSWER_LENGTH: parseInt(process.env.NEXT_PUBLIC_MAX_ANSWER_LENGTH || '2000'),
} as const;

// Eligibility Configuration
export const ELIGIBILITY_CONFIG = {
    MIN_NEYNAR_SCORE: parseFloat(process.env.NEYNAR_MIN_SCORE || '0.6'),
} as const;

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
    QUESTIONS_PER_HOUR: parseInt(process.env.RATE_LIMIT_QUESTIONS_PER_HOUR || '10'),
    ANSWERS_PER_HOUR: parseInt(process.env.RATE_LIMIT_ANSWERS_PER_HOUR || '20'),
    NOTIFICATIONS_PER_MINUTE: parseInt(process.env.RATE_LIMIT_NOTIFICATIONS_PER_MINUTE || '5'),
} as const;
