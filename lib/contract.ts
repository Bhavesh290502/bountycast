// lib/contract.ts
import { Abi } from 'viem';

export const BOUNTYCAST_ADDRESS = process.env.NEXT_PUBLIC_BOUNTYCAST_ADDRESS as `0x${string}`;

export const bountycastAbi: Abi = [
    ```typescript
// lib/contract.ts
import { Abi } from 'viem';

export const BOUNTYCAST_ADDRESS = process.env.NEXT_PUBLIC_BOUNTYCAST_ADDRESS as `0x5F336D3Ca56FC51216ee9551B53E7699424e21AE`;

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
    "inputs": [
        { "internalType": "uint256", "name": "questionId", "type": "uint256" },
        { "internalType": "address", "name": "winner", "type": "address" }
    ],
    "name": "selectWinner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
        { "internalType": "uint256", "name": "questionId", "type": "uint256" }
    ],
    "name": "claimBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
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
```
