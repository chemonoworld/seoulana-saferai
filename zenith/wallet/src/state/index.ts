export interface WalletInfo {
    deviceId: string;
    pubkey: string;
    address: string;
    encryptedPrivKeyshare: string; // Encrypted private key share
    encryptedOpenAIApiKey?: string; // Encrypted OpenAI API key
}