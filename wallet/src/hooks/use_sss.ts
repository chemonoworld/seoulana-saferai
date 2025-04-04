import { combine, split } from "shamir-secret-sharing";
import { encryptData, decryptData } from "@/utils/encryption";
import type { EWalletClientState } from "@/state";
import { reqShare, reqShareStore } from "@/query";


function toUint8Array(hexStr: string): Uint8Array {
    return new Uint8Array(Buffer.from(hexStr, "hex"));
}

// 0: active key share in client, 1: backup key share in client, 2: active key share in server
export async function runSplit(
    clientState: EWalletClientState,
    password: string
) {
    const shares = await split(
        toUint8Array(clientState.originalPrivateKey.toString("hex")),
        3,
        2
    );
    clientState.clientBackupKeyshare = Buffer.from(shares[1]);

    // 33 bytes -> hex string length = 66
    const share0ClientSplit0Hex = Buffer.from(shares[0]).toString("hex");
    const encryptedShare = encryptData(share0ClientSplit0Hex, password);
    localStorage.setItem("clientActiveKeyshare", encryptedShare);

    await reqShareStore({
        serverActiveKeyshare: Buffer.from(shares[2]).toString("hex"),
    });
}

export async function runCombine(
    clientState: EWalletClientState,
    password: string
) {
    // TODO: 구글 로그인 인증 추가
    const resp = await reqShare({
        pubkey: clientState.pubkey.toString("hex"),
    });

    const encryptedShare = localStorage.getItem("share0ClientSplit0");
    if (!encryptedShare) {
        throw new Error("Encrypted share not found");
    }

    let clientActiveKeyshareStr: string;
    try {
        clientActiveKeyshareStr = decryptData(encryptedShare, password);
    } catch (error) {
        throw new Error("Password is incorrect");
        return;
    }

    // client0, server split -> recover privKeyShare0
    const shares: Uint8Array[] = [
        toUint8Array(clientActiveKeyshareStr),
        toUint8Array(resp.serverKeyshare),
    ];

    const combinedKey = await combine(shares);

    clientState.combinedKey = Buffer.from(combinedKey);
    clientState.originalPrivateKey = Buffer.from(combinedKey);

    // verification
    {
        // 1. verify combined key with the private share
        if (combinedKey.length !== 32) {
            throw new Error("combined key is not 32 bytes");
            return;
        }
        // 2. verify combined key with the backup
        const sharesFromBackup = [
            new Uint8Array(clientState.clientBackupKeyshare),
            toUint8Array(resp.serverKeyshare),
        ];
        const combinedKeyFromBackup = await combine(sharesFromBackup);
        if (!Buffer.from(combinedKey).equals(Buffer.from(combinedKeyFromBackup))) {
            throw new Error(
                "combined key is not the same as the one from backup and server split"
            );
            return;
        }
        // 3. verify combined key with the shares only from client
        const sharesOnlyFromClient = [
            toUint8Array(clientActiveKeyshareStr),
            new Uint8Array(clientState.clientBackupKeyshare),
        ];
        const combinedKeyFromClient = await combine(sharesOnlyFromClient);
        if (!Buffer.from(combinedKey).equals(Buffer.from(combinedKeyFromClient))) {
            throw new Error(
                "combined key is not the same as the one from shares only from client"
            );
            return;
        }
    }
}
