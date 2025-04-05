import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { PromptTemplate } from '@langchain/core/prompts';
import { OutputFixingParser, StructuredOutputParser } from 'langchain/output_parsers';

// Define the types of transactions that could be requested
export enum TransactionType {
    TRANSFER_SOL = 'TRANSFER_SOL',
    NFT_MINT = 'NFT_MINT',
    TOKEN_SWAP = 'TOKEN_SWAP',
    UNKNOWN = 'UNKNOWN',
}

// Define the transaction data structure using zod
const transactionSchema = z.object({
    type: z.nativeEnum(TransactionType),
    params: z.object({
        // For SOL transfer
        recipientAddress: z.string().optional(),
        amount: z.number().optional(),

        // Could add more fields for other transaction types in the future
        tokenAddress: z.string().optional(),
        swapFromToken: z.string().optional(),
        swapToToken: z.string().optional(),
    }).optional(),
    confidence: z.number().min(0).max(1),
    errorMessage: z.string().optional(),
});

export type TransactionData = z.infer<typeof transactionSchema>;

export class AgentService {
    private model: ChatOpenAI;
    private parser;
    private promptTemplate: PromptTemplate;

    constructor(apiKey?: string) {
        // Initialize LLM
        this.model = new ChatOpenAI({
            openAIApiKey: apiKey || process.env.OPENAI_API_KEY,
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
        });

        // Initialize parser
        this.parser = StructuredOutputParser.fromZodSchema(transactionSchema);

        // Create the prompt template
        const formatInstructions = this.parser.getFormatInstructions();

        this.promptTemplate = PromptTemplate.fromTemplate(
            `You are a financial transaction parser for a Solana wallet application.
        
        Given a user message, determine if they are requesting a transaction and what type.
        Currently, we only support SOL transfers (sending SOL to an address).
        
        User message: {userMessage}
        
        If the message contains a request to transfer SOL:
        1. Extract the recipient address (a Solana address starting with a letter or number)
        2. Extract the amount (defaulting to 0.01 SOL if not specified)
        3. Set confidence based on how clear the request is
        
        If it doesn't look like a transaction request or you're unsure, set type to UNKNOWN.
        If you can tell it's a transaction but something is missing (like address), still try to categorize it but set a low confidence.
        
        {formatInstructions}`
        );
    }

    /**
     * Analyzes a user message and attempts to parse it into a transaction request
     */
    async analyzeMessage(message: string): Promise<TransactionData> {
        try {
            // Format the prompt with the user message
            const formattedPrompt = await this.promptTemplate.format({
                userMessage: message,
                formatInstructions: this.parser.getFormatInstructions(),
            });

            // Get the response from the LLM
            const response = await this.model.invoke(formattedPrompt);

            console.log('LLM response:', response);

            // Parse the response
            try {
                const result = await this.parser.parse(
                    typeof response.content === 'string'
                        ? response.content
                        : JSON.stringify(response.content)
                );
                return result as TransactionData;
            } catch (parseError) {
                console.error('Error parsing response:', parseError);

                // Fallback to default unknown response
                return {
                    type: TransactionType.UNKNOWN,
                    confidence: 0,
                    errorMessage: `Failed to parse LLM response: ${(parseError as Error).message}`,
                };
            }
        } catch (error) {
            console.error('Error analyzing message:', error);
            return {
                type: TransactionType.UNKNOWN,
                confidence: 0,
                errorMessage: `Failed to analyze message: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Creates a structured transaction message based on the analysis
     */
    createTransactionMessage(txData: TransactionData): {
        success: boolean;
        transactionType: string;
        data?: any;
        message: string;
    } {
        // If confidence is too low or type is unknown, return an error
        if (txData.confidence < 0.5 || txData.type === TransactionType.UNKNOWN) {
            return {
                success: false,
                transactionType: 'UNKNOWN',
                message: txData.errorMessage || 'Could not understand the transaction request. Please try again with more details.',
            };
        }

        // Process based on transaction type
        switch (txData.type) {
            case TransactionType.TRANSFER_SOL:
                const params = txData.params;
                if (!params?.recipientAddress) {
                    return {
                        success: false,
                        transactionType: txData.type,
                        message: 'No recipient address found in the request.',
                    };
                }

                return {
                    success: true,
                    transactionType: txData.type,
                    data: {
                        recipientAddress: params.recipientAddress,
                        amount: params.amount || 0.01, // Default to 0.01 SOL if not specified
                    },
                    message: `Preparing to transfer ${params.amount || 0.01} SOL to ${params.recipientAddress}`,
                };

            // Add cases for other transaction types as needed
            default:
                return {
                    success: false,
                    transactionType: 'UNSUPPORTED',
                    message: 'This type of transaction is not supported yet.',
                };
        }
    }
}
