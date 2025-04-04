export interface EWalletClientState {
    deviceId: string;
    originalPrivateKey: Buffer;
    pubkey: Buffer;
    clientBackupKeyshare: Buffer;
    combinedKey: Buffer;
}