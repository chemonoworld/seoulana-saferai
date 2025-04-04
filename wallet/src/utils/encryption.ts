import CryptoJS from "crypto-js";

export const encryptData = (data: string, password: string): string => {
  const salt = CryptoJS.lib.WordArray.random(128 / 8);
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 1000,
  });
  const iv = CryptoJS.lib.WordArray.random(128 / 8);

  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  });

  const result = salt.toString() + iv.toString() + encrypted.toString();
  return result;
};

export const decryptData = (
  encryptedData: string,
  password: string
): string => {
  const salt = CryptoJS.enc.Hex.parse(encryptedData.substr(0, 32));
  const iv = CryptoJS.enc.Hex.parse(encryptedData.substr(32, 32));
  const encrypted = encryptedData.substring(64);

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 1000,
  });

  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
};
