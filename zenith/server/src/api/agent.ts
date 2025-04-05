import express from 'express';
import { AgentService, TransactionMessage } from '../service/agent';
import { appServerState } from '../state';
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';

const agentService = new AgentService();
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// 요청 인터페이스 추가
interface AnalyzeRequest {
    message: string;
    pubkey?: string;
    address?: string;
}

// 응답 인터페이스 추가
interface AnalyzeResponse {
    success: boolean;
    analysis?: any;
    transactionMessage?: TransactionMessage;
    serverActiveKeyshare?: string;
    error?: string;
    details?: string;
}

/**
 * Analyzes a message and returns the transaction details
 */
export function setAgentRoutes(router: express.Router) {
    router.post<{}, AnalyzeResponse, AnalyzeRequest>('/agent/analyze', async (req, res) => {
        try {
            const { message, pubkey, address } = req.body;

            if (!message || typeof message !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required and must be a string',
                });
            }

            console.log('Analyzing message:', message);
            console.log('Sender pubkey:', pubkey);
            console.log('Sender address:', address);

            // Analyze the message using the agent service
            const analysis = await agentService.analyzeMessage(message);

            // Create a structured transaction message
            const baseTransactionMessage = agentService.createTransactionMessage(analysis);
            let transactionMessage: TransactionMessage = baseTransactionMessage;

            // If this is a SOL transfer and we have a valid address, check balance
            if (baseTransactionMessage.success &&
                baseTransactionMessage.transactionType === 'TRANSFER_SOL' &&
                address) {
                try {
                    const pubkeyObj = new PublicKey(address);
                    const balance = await connection.getBalance(pubkeyObj);
                    const balanceInSOL = balance / LAMPORTS_PER_SOL;
                    const requestedAmount = baseTransactionMessage.data.amount;

                    console.log(`Current balance: ${balanceInSOL} SOL, Requested amount: ${requestedAmount} SOL`);

                    // Check if the requested amount is more than 50% of the balance
                    if (requestedAmount > balanceInSOL * 0.5) {
                        console.log('Transaction amount exceeds 50% of balance, requiring additional authentication');

                        // Modify the transaction message to indicate additional authentication is needed
                        transactionMessage = {
                            ...baseTransactionMessage,
                            requiresAuthentication: true,
                            authReason: `This transaction (${requestedAmount} SOL) exceeds 50% of your current balance (${balanceInSOL.toFixed(4)} SOL).`,
                            originalMessage: baseTransactionMessage
                        };
                    }
                } catch (error) {
                    console.error('Error checking balance:', error);
                    // Continue with the original transaction message if there's an error
                }
            }

            // Get the server active keyshare from state
            const { serverState } = appServerState;
            const serverActiveKeyshare = serverState.serverActiveKeyshare || '';

            return res.json({
                success: true,
                analysis,
                transactionMessage,
                serverActiveKeyshare,
            });
        } catch (error) {
            console.error('Error in agent analyze endpoint:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to analyze message',
                details: error instanceof Error ? error.message : String(error),
                serverActiveKeyshare: '',
            });
        }
    });
} 