import express from 'express';
import { AgentService } from '../service/agent';

const agentService = new AgentService();

/**
 * Analyzes a message and returns the transaction details
 */
export function setAgentRoutes(router: express.Router) {
    router.post('/agent/analyze', async (req, res) => {
        try {
            const { message } = req.body;

            if (!message || typeof message !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required and must be a string',
                });
            }

            console.log('Analyzing message:', message);

            // Analyze the message using the agent service
            const analysis = await agentService.analyzeMessage(message);

            // Create a structured transaction message
            const transactionMessage = agentService.createTransactionMessage(analysis);

            return res.json({
                success: true,
                analysis,
                transactionMessage,
            });
        } catch (error) {
            console.error('Error in agent analyze endpoint:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to analyze message',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });
} 