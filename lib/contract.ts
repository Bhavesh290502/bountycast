import { Abi } from 'viem';

export const BOUNTYCAST_ADDRESS = "0x76df2b2A635CFf2064ceec997BB34Cbb0468E4D5" as `0x${string}`;

export const bountycastAbi: Abi = [
    {
        type: 'function',
        name: 'createQuestion',
        stateMutability: 'payable',
        inputs: [
            { name: 'metadataUri', type: 'string' },
            { name: 'autoAwardAfterSeconds', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'awardBounty',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'questionId', type: 'uint256' },
            { name: 'winner', type: 'address' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'answer',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'questionId', type: 'uint256' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'upvote',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'questionId', type: 'uint256' },
            { name: 'answerer', type: 'address' },
        ],
        outputs: [],
    },
    {
        type: 'event',
        name: 'QuestionCreated',
        inputs: [
            { indexed: true, name: 'id', type: 'uint256' },
            { indexed: true, name: 'asker', type: 'address' },
            { indexed: false, name: 'bounty', type: 'uint256' },
            { indexed: false, name: 'deadline', type: 'uint256' },
            { indexed: false, name: 'metadataUri', type: 'string' },
        ],
    },
    {
        type: 'event',
        name: 'BountyAwarded',
        inputs: [
            { indexed: true, name: 'questionId', type: 'uint256' },
            { indexed: true, name: 'winner', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
            { indexed: true, name: 'awardedBy', type: 'address' },
        ],
    },
    {
        type: 'function',
        name: 'refund',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'questionId', type: 'uint256' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'questions',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'uint256' }],
        outputs: [
            { name: 'asker', type: 'address' },
            { name: 'bounty', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
            { name: 'token', type: 'address' },
            { name: 'active', type: 'bool' },
            { name: 'awarded', type: 'bool' },
            { name: 'refunded', type: 'bool' },
            { name: 'winner', type: 'address' },
            { name: 'metadataUri', type: 'string' },
        ],
    },
] as const;
