export interface WalletClientState {
    deviceId: string;
    originalPrivateKey: Buffer;
    pubkey: Buffer;
    clientBackupKeyshare: Buffer;
    combinedKey: Buffer;
}