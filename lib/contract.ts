// lib/contract.ts
import { Abi } from 'viem';

export const BOUNTYCAST_ADDRESS = process.env.NEXT_PUBLIC_BOUNTYCAST_ADDRESS as `0x${string}`;

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
    name: 'awardBounty',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'winner', type: 'address' },
    ],
    outputs: [],
  },
];
