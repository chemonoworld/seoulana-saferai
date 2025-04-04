import { useState, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';

export const useWallet = () => {
    const [fullSecretKey, setFullSecretKey] = useState<Buffer | null>(null);
    const [privateKey, setPrivateKey] = useState<Buffer | null>(null);
    const [pubkey, setPubkey] = useState<string | null>(null);
    const [address, setAddress] = useState<string | null>(null);

    useEffect(() => {
        if (fullSecretKey) {
            const keypair = Keypair.fromSecretKey(fullSecretKey);
            setPubkey(Buffer.from(keypair.publicKey.toBytes()).toString('hex'));
            setAddress(keypair.publicKey.toBase58());
        }
    }, [fullSecretKey]);

    function generatePrivateKey() {
        const keypair = Keypair.generate();
        setFullSecretKey(Buffer.from(keypair.secretKey));
        setPrivateKey(Buffer.from(keypair.secretKey.slice(0, 32)));
    }

    function generatePrivateKeyFromSecretKey(secretKey: Buffer) {
        const keypair = Keypair.fromSecretKey(secretKey);
        setFullSecretKey(secretKey);
        setPrivateKey(secretKey.slice(0, 32));
        setPubkey(Buffer.from(keypair.publicKey.toBytes()).toString('hex'));
        setAddress(keypair.publicKey.toBase58());
    }

    function resetKeypair() {
        setFullSecretKey(null);
        setPrivateKey(null);
        setPubkey(null);
        setAddress(null);
    }


    return {
        fullSecretKey,
        privateKey,
        setPrivateKey,
        pubkey,
        address,
        generatePrivateKey,
        generatePrivateKeyFromSecretKey,
        resetKeypair,
    };
};
