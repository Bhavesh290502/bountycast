import { Abi } from 'viem';

export const BOUNTYCAST_ADDRESS = (process.env.NEXT_PUBLIC_BOUNTYCAST_ADDRESS || "0x5F336D3Ca56FC51216ee9551B53E7699424e21AE") as `0x${string}`;

export const bountycastAbi = [
    {
        type: 'function',
        name: 'createQuestion',
        inputs: [
            { name: 'metadataUri', type: 'string' },
            { name: 'autoAwardAfterSeconds', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'awardBounty',
        inputs: [
            { name: 'questionId', type: 'uint256' },
            { name: 'winner', type: 'address' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'refund',
        inputs: [{ name: 'questionId', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable',
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
] as const;
