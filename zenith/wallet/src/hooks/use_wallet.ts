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
     * 특정 주소로 0.01 SOL을 전송합니다
     * @param recipientAddress 받는 사람의 지갑 주소 (base58 형식)
     * @returns 트랜잭션 서명 (성공 시) 또는 에러 메시지 (실패 시)
     */
    async function sendTransaction(recipientAddress: string): Promise<{ success: boolean; message: string; signature?: string }> {
        try {
            // 키페어 확인
            if (!recoveredKeypair) {
                return { success: false, message: "복구된 키페어가 없습니다. 먼저 지갑을 불러오세요." };
            }

            // 수신자 주소 유효성 검사
            let recipientPubkey: PublicKey;
            try {
                recipientPubkey = new PublicKey(recipientAddress);
            } catch (error) {
                return { success: false, message: "유효하지 않은 수신자 주소입니다." };
            }

            // 보낼 금액 (0.01 SOL = 10_000_000 Lamports)
            const amountInLamports = 0.01 * LAMPORTS_PER_SOL;

            // 연결 생성
            const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

            // 전송자 잔액 확인
            const senderBalance = await connection.getBalance(recoveredKeypair.publicKey);
            if (senderBalance < amountInLamports + 5000) { // 5000 lamports는 트랜잭션 수수료 예상치
                return { success: false, message: "잔액이 부족합니다. 최소 0.01 SOL + 수수료가 필요합니다." };
            }

            // 최근 블록해시 가져오기
            const { blockhash } = await connection.getLatestBlockhash();

            // 트랜잭션 생성
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: recoveredKeypair.publicKey,
                    toPubkey: recipientPubkey,
                    lamports: amountInLamports,
                })
            );

            // 블록해시 설정
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = recoveredKeypair.publicKey;

            // 트랜잭션 서명 및 전송
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [recoveredKeypair]
            );

            // 잔액 새로고침
            await refreshBalance();

            return {
                success: true,
                message: "0.01 SOL을 성공적으로 전송했습니다.",
                signature
            };
        } catch (error) {
            console.error("트랜잭션 전송 오류:", error);
            return {
                success: false,
                message: `트랜잭션 전송 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`
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
