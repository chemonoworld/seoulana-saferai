import { useState, useEffect } from 'react';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
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
        // original은 64bytes
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

        // 32 bytes -> expanded(64 bytes)
        console.log("originalPrivKey", originalPrivKey);

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

    return {
        activePrivKeyshare,
        backupPrivKeyshare,
        pubkey,
        address,
        balance,
        generatePrivateKey: generateWallet,
        generatePrivateKeyFromSecretKey: generateWalletFromSecretKey,
        recoverWalletState,
        resetKeypair,
        refreshBalance,
    };
};
