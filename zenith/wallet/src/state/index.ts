export interface WalletInfo {
    deviceId: string;
    pubkey: string;
    address: string;
    encryptedPrivKeyshare: string; // 암호화된 비밀키쉐어
}