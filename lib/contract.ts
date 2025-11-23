import { Abi } from 'viem';

export const BOUNTYCAST_ADDRESS = (process.env.NEXT_PUBLIC_BOUNTYCAST_ADDRESS || "0x5F336D3Ca56FC51216ee9551B53E7699424e21AE") as `0x${string}`;

export const bountycastAbi: Abi = [
    {
        type: 'function',
        name: 'createQuestion',
        stateMutability: 'payable',
        inputs: [
            { name: 'metadataUri', type: 'string' },
            { name: 'deadline', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'selectWinner',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'questionId', type: 'uint256' },
            { name: 'winner', type: 'address' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'claimBounty',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'questionId', type: 'uint256' }
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
] as const;
