import { decodeEventLog, TransactionReceipt } from 'viem';
import { bountycastAbi } from './contract';

export const getOnChainId = (receipt: TransactionReceipt): number | null => {
    for (const log of receipt.logs) {
        try {
            const event = decodeEventLog({
                abi: bountycastAbi,
                data: log.data,
                topics: log.topics,
            });
            if (event.eventName === 'QuestionCreated' && event.args) {
                // @ts-ignore
                return Number(event.args.id);
            }
        } catch (e) {
            // Ignore logs that don't match our ABI
        }
    }
    return null;
};
