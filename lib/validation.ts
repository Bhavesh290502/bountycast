// Input validation utilities

import { BOUNTY_CONFIG } from './constants';

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export const Validators = {
    // Question validation
    question: (text: string): ValidationResult => {
        if (!text || typeof text !== 'string') {
            return { valid: false, error: 'Question text is required' };
        }

        const trimmed = text.trim();
        if (trimmed.length === 0) {
            return { valid: false, error: 'Question cannot be empty' };
        }

        if (trimmed.length > BOUNTY_CONFIG.MAX_QUESTION_LENGTH) {
            return {
                valid: false,
                error: `Question too long (max ${BOUNTY_CONFIG.MAX_QUESTION_LENGTH} characters)`
            };
        }

        return { valid: true };
    },

    // Answer validation
    answer: (text: string): ValidationResult => {
        if (!text || typeof text !== 'string') {
            return { valid: false, error: 'Answer text is required' };
        }

        const trimmed = text.trim();
        if (trimmed.length === 0) {
            return { valid: false, error: 'Answer cannot be empty' };
        }

        if (trimmed.length > BOUNTY_CONFIG.MAX_ANSWER_LENGTH) {
            return {
                valid: false,
                error: `Answer too long (max ${BOUNTY_CONFIG.MAX_ANSWER_LENGTH} characters)`
            };
        }

        return { valid: true };
    },

    // Bounty amount validation
    bountyAmount: (amount: number): ValidationResult => {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return { valid: false, error: 'Invalid bounty amount' };
        }

        if (amount < BOUNTY_CONFIG.MIN_BOUNTY_ETH) {
            return {
                valid: false,
                error: `Minimum bounty is ${BOUNTY_CONFIG.MIN_BOUNTY_ETH} ETH`
            };
        }

        if (amount > 100) { // Reasonable max
            return { valid: false, error: 'Bounty amount too large (max 100 ETH)' };
        }

        return { valid: true };
    },

    // FID validation
    fid: (fid: any): ValidationResult => {
        if (!fid || typeof fid !== 'number' || fid <= 0) {
            return { valid: false, error: 'Valid FID is required' };
        }
        return { valid: true };
    },

    // Notification details validation
    notificationDetails: (details: any): ValidationResult => {
        if (!details || typeof details !== 'object') {
            return { valid: false, error: 'Notification details must be an object' };
        }

        if (!details.url || typeof details.url !== 'string') {
            return { valid: false, error: 'Notification URL is required' };
        }

        if (!details.token || typeof details.token !== 'string') {
            return { valid: false, error: 'Notification token is required' };
        }

        // Basic URL validation
        try {
            new URL(details.url);
        } catch {
            return { valid: false, error: 'Invalid notification URL' };
        }

        return { valid: true };
    },

    // Category validation
    category: (category: string, allowedCategories: string[]): ValidationResult => {
        if (!category) {
            return { valid: true }; // Optional field
        }

        if (!allowedCategories.includes(category)) {
            return {
                valid: false,
                error: `Invalid category. Allowed: ${allowedCategories.join(', ')}`
            };
        }

        return { valid: true };
    },
};
