import { useState, useEffect } from 'react';
import { Keypair, Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { combineShares, splitPrivKey } from '@/utils/sss';
import type { WalletInfo } from '@/state';
import { decryptData } from '@/utils/encryption';

const DEVNET_RPC_URL = "https://api.devnet.solana.com";

// Transaction result interface
interface TransactionResult {
    success: boolean;
    message: string;
    signature?: string;
}

export const useWallet = () => {
    const [backupPrivKeyshare, setBackupPrivKeyshare] = useState<string | null>(null);

    // necessary
    const [activePrivKeyshare, setActivePrivKeyshare] = useState<string | null>(null);
    const [pubkey, setPubkey] = useState<string | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [recoveredKeypair, setRecoveredKeypair] = useState<Keypair | null>(null);
    useEffect(() => {
        refreshBalance();
    }, [address]);

    async function generateWallet() {
        const keypair = Keypair.generate();
        setPubkey(Buffer.from(keypair.publicKey.toBytes()).toString('hex'));
        setAddress(keypair.publicKey.toBase58());
        const secretKey = Buffer.from(keypair.secretKey.slice(0, 32));
        const { clientActiveKeyshare, clientBackupKeyshare } = await splitPrivKey(secretKey);
        setActivePrivKeyshare(clientActiveKeyshare)
        setBackupPrivKeyshare(clientBackupKeyshare)
    }

    async function generateWalletFromSecretKey(originalSecretKey: Buffer) {
        // original is 64 bytes
        if (originalSecretKey.length !== 64) {
            throw new Error("Invalid secret key");
        }
        const keypair = Keypair.fromSecretKey(originalSecretKey);
        setPubkey(Buffer.from(keypair.publicKey.toBytes()).toString('hex'));
        setAddress(keypair.publicKey.toBase58());
        const privKey = Buffer.from(keypair.secretKey.slice(0, 32));
        const { clientActiveKeyshare, clientBackupKeyshare } = await splitPrivKey(privKey);
        setActivePrivKeyshare(clientActiveKeyshare);
        setBackupPrivKeyshare(clientBackupKeyshare);
    }

    async function recoverWalletState(info: WalletInfo, password: string) {
        const decryptedPrivKeyshare = decryptData(info.encryptedPrivKeyshare, password);
        setActivePrivKeyshare(decryptedPrivKeyshare);
        setBackupPrivKeyshare(null);
        setPubkey(info.pubkey);
        setAddress(info.address);

        // recover original privkey
        const { isSuccess, originalPrivKey } = await combineShares(info.pubkey, decryptData(info.encryptedPrivKeyshare, password));
        if (!isSuccess) {
            throw new Error("Failed to combine shares");
        }

        const expandedPrivKey = Buffer.concat([originalPrivKey, Buffer.from(info.pubkey, 'hex')]);
        setRecoveredKeypair(Keypair.fromSecretKey(expandedPrivKey));
    }

    function resetKeypair() {
        setPubkey(null);
        setAddress(null);
    }

    async function refreshBalance() {
        if (address) {
            const connection = new Connection(DEVNET_RPC_URL);
            const balance = await connection.getBalance(new PublicKey(address));
            setBalance(balance.toString());
        }
    }

    /**
     * Sends 0.01 SOL to a specific address
     * @param recipientAddress Recipient wallet address (base58 format)
     * @returns Transaction signature (if successful) or error message (if failed)
     */
    async function sendTransaction(recipientAddress: string, amount?: string): Promise<TransactionResult> {
        try {
            if (!recoveredKeypair) {
                console.error('Keypair is not available');
                return { success: false, message: 'Wallet is not ready. Please create or unlock your wallet first.' };
            }

            // Validate recipient address
            try {
                new PublicKey(recipientAddress);
            } catch (err) {
                console.error('Invalid recipient address:', err);
                return { success: false, message: 'Invalid recipient address' };
            }

            // Use specified amount or default to 0.01 SOL
            const amountInSOL = amount ? parseFloat(amount) : 0.01;
            const lamportsToSend = amountInSOL * LAMPORTS_PER_SOL;

            // Create connection
            const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

            // Check wallet balance
            const walletBalance = await connection.getBalance(recoveredKeypair.publicKey);

            if (walletBalance < lamportsToSend + 5000) { // Add some for transaction fee
                return {
                    success: false,
                    message: `Insufficient balance. You have ${walletBalance / LAMPORTS_PER_SOL} SOL but need at least ${amountInSOL + 0.000005} SOL.`
                };
            }

            console.log(`Sending ${amountInSOL} SOL to ${recipientAddress}...`);

            // Create transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: recoveredKeypair.publicKey,
                    toPubkey: new PublicKey(recipientAddress),
                    lamports: lamportsToSend
                })
            );

            // Send and confirm transaction
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [recoveredKeypair]
            );

            console.log('Transaction successful with signature:', signature);

            // Refresh balance after transaction
            setTimeout(() => refreshBalance(), 2000);

            return {
                success: true,
                message: `Successfully sent ${amountInSOL} SOL to ${recipientAddress}`,
                signature
            };
        } catch (error) {
            console.error('Error sending transaction:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }

    return {
        activePrivKeyshare,
        backupPrivKeyshare,
        pubkey,
        address,
        balance,
        recoveredKeypair,
        generatePrivateKey: generateWallet,
        generatePrivateKeyFromSecretKey: generateWalletFromSecretKey,
        recoverWalletState,
        resetKeypair,
        refreshBalance,
        sendTransaction,
    };
};
