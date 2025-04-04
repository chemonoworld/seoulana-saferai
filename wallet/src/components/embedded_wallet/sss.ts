import { combine, split } from "shamir-secret-sharing";
import { encryptData, decryptData } from "@/utils/encryption";


function toUint8Array(hexStr: string): Uint8Array {
  return new Uint8Array(Buffer.from(hexStr, "hex"));
}

// 0: live key share in client, 1: backup key share in client, 2: live key share in server
export async function runSplit(
  clientState: EWalletClientState,
  password: string
) {
  const now = performance.now();

  const shares = await split(
    toUint8Array(clientState.keygenOutput0?.private_share!),
    3,
    2
  );
  clientState.share0ClientSplit1 = shares[1];

  // 33 bytes -> hex string length = 66
  const share0ClientSplit0Hex = Buffer.from(shares[0]).toString("hex");
  const encryptedShare = encryptData(share0ClientSplit0Hex, password);
  localStorage.setItem("share0ClientSplit0", encryptedShare);

  await reqShareSplitStore({
    share0ServerSplit: Buffer.from(shares[2]).toString("hex"),
  });

  // forget the private share(to be recovered in combine) and share0(saved in localStorage)
  clientState.keygenOutput0!.private_share = "";

  const later = performance.now();
  setResult("run split");
  setResult(`split shares0: ${share0ClientSplit0Hex}`);
  setResult(`split shares1: ${Buffer.from(shares[1]).toString("hex")}`);
  setResult(`split shares2: ${Buffer.from(shares[2]).toString("hex")}`);
  setResult(`time elapsed (ms): ${later - now}`);
}

export async function runCombine(
  clientState: EWalletClientState,
  password: string
) {
  const now = performance.now();

  const resp = await reqShareSplit();

  const encryptedShare = localStorage.getItem("share0ClientSplit0");
  if (!encryptedShare) {
    setError("Encrypted share not found");
    return;
  }

  let share0ClientSplit0: string;
  try {
    share0ClientSplit0 = decryptData(encryptedShare, password);
  } catch (error) {
    setError("Password is incorrect");
    return;
  }

  // client0, server split -> recover privKeyShare0
  const shares: Uint8Array[] = [
    toUint8Array(share0ClientSplit0),
    toUint8Array(resp.share0ServerSplit),
  ];

  const combinedKey = await combine(shares);

  clientState.combinedKey = combinedKey;
  clientState.keygenOutput0!.private_share =
    Buffer.from(combinedKey).toString("hex");

  // verification
  {
    // 1. verify combined key with the private share
    if (combinedKey.length !== 32) {
      setError("combined key is not 32 bytes");
      return;
    }
    // 2. verify combined key with the backup
    const sharesFromBackup = [
      new Uint8Array(clientState.share0ClientSplit1!),
      toUint8Array(resp.share0ServerSplit),
    ];
    const combinedKeyFromBackup = await combine(sharesFromBackup);
    if (!Buffer.from(combinedKey).equals(Buffer.from(combinedKeyFromBackup))) {
      setError(
        "combined key is not the same as the one from backup and server split"
      );
      return;
    }
    // 3. verify combined key with the shares only from client
    const sharesOnlyFromClient = [
      toUint8Array(share0ClientSplit0),
      new Uint8Array(clientState.share0ClientSplit1!),
    ];
    const combinedKeyFromClient = await combine(sharesOnlyFromClient);
    if (!Buffer.from(combinedKey).equals(Buffer.from(combinedKeyFromClient))) {
      setError(
        "combined key is not the same as the one from shares only from client"
      );
      return;
    }
  }

  const later = performance.now();
  setResult("run combine");
  setResult(`combinedKey: ${Buffer.from(combinedKey).toString("hex")}`);
  setResult(`time elapsed (ms): ${later - now}`);
}
