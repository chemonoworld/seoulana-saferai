import express from 'express';
import { AgentService } from '../service/agent';
import { appServerState } from '../state';

const agentService = new AgentService();

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
    transactionMessage?: any;
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

            // Store pubkey for future use if provided
            if (pubkey) {
                // If you want to store the pubkey in the server state, you can do it here
                // This is optional based on your requirements
                console.log('Storing pubkey for future use:', pubkey);
            }

            // Analyze the message using the agent service
            const analysis = await agentService.analyzeMessage(message);

            // Create a structured transaction message
            const transactionMessage = agentService.createTransactionMessage(analysis);

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