import { useState, useEffect } from 'react';
import { Keypair, Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { combineShares, splitPrivKey } from '@/utils/sss';
import type { WalletInfo } from '@/state';
import { decryptData } from '@/utils/encryption';

const DEVNET_RPC_URL = "https://api.devnet.solana.com";

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
    async function sendTransaction(recipientAddress: string): Promise<{ success: boolean; message: string; signature?: string }> {
        try {
            // Check keypair
            if (!recoveredKeypair) {
                return { success: false, message: "No recovered keypair found. Please load your wallet first." };
            }

            // Validate recipient address
            let recipientPubkey: PublicKey;
            try {
                recipientPubkey = new PublicKey(recipientAddress);
            } catch (error) {
                return { success: false, message: "Invalid recipient address." };
            }

            // Amount to send (0.01 SOL = 10_000_000 Lamports)
            const amountInLamports = 0.01 * LAMPORTS_PER_SOL;

            // Create connection
            const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

            // Check sender balance
            const senderBalance = await connection.getBalance(recoveredKeypair.publicKey);
            if (senderBalance < amountInLamports + 5000) { // 5000 lamports for estimated transaction fee
                return { success: false, message: "Insufficient balance. You need at least 0.01 SOL + fee." };
            }

            // Get recent blockhash
            const { blockhash } = await connection.getLatestBlockhash();

            // Create transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: recoveredKeypair.publicKey,
                    toPubkey: recipientPubkey,
                    lamports: amountInLamports,
                })
            );

            // Set blockhash and fee payer
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = recoveredKeypair.publicKey;

            // Sign and send transaction
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [recoveredKeypair]
            );

            // Refresh balance
            await refreshBalance();

            return {
                success: true,
                message: "Successfully sent 0.01 SOL.",
                signature
            };
        } catch (error) {
            console.error("Transaction error:", error);
            return {
                success: false,
                message: `Error during transaction: ${error instanceof Error ? error.message : String(error)}`
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
