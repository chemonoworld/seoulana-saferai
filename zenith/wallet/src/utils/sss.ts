import { combine, split } from "shamir-secret-sharing";
import { reqShare, reqShareStore } from "@/query";

const N = 3; // number of participants: client 2 + server 1
const T = 2; // threshold: 2

function toUint8Array(hexStr: string): Uint8Array {
    return new Uint8Array(Buffer.from(hexStr, "hex"));
}

export async function splitPrivKey(
    privKey: Buffer,
): Promise<{
    clientActiveKeyshare: string,
    clientBackupKeyshare: string,
}> {
    if (privKey.length !== 32) {
        throw new Error("Invalid secret key");
    }
    try {
        const shares = await split(
            toUint8Array(privKey.toString("hex")),
            N,
            T
        );

        // 2 -> server
        await reqShareStore({
            serverActiveKeyshare: Buffer.from(shares[2]).toString("hex"),
        });

        // 0 -> client
        // 1 -> client backup
        return {
            clientActiveKeyshare: Buffer.from(shares[0]).toString("hex"),
            clientBackupKeyshare: Buffer.from(shares[1]).toString("hex"),
        }
    } catch {
        throw new Error("Failed to store share");
    }
}


// only for testing
export async function combineShares(
    pubkey: string,
    activeSecretKeyshare: string,
): Promise<{ isSuccess: boolean, originalPrivKey: Buffer }> {
    const resp = await reqShare({
        pubkey,
    });

    // client0, server split -> recover privKeyShare0
    const shares: Uint8Array[] = [
        toUint8Array(activeSecretKeyshare),
        toUint8Array(resp.serverActiveKeyshare),
    ];

    const combinedKey = await combine(shares);

    const originalPrivKey = Buffer.from(combinedKey);

    // verification
    {
        if (combinedKey.length !== 32) {
            throw new Error("combined key is not 32 bytes");
        }
    }

    return { isSuccess: true, originalPrivKey };
}
