import { useEffect, useState } from 'react';
import crypto from 'crypto-js';
import { useWallet } from '@/hooks/use_wallet';

// 지갑 타입 정의
interface WalletInfo {
  deviceId: string;
  pubkey: string;
  address: string;
}

const EmbeddedWallet = () => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputSecretKey, setInputSecretKey] = useState<string | null>(null);

  // 디바이스 고유 ID 생성 함수
  const generateDeviceId = () => {
    const userAgent = navigator.userAgent;
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = new Date().getTimezoneOffset();
    const language = navigator.language;
    
    const fingerprint = `${userAgent}-${screenInfo}-${timezone}-${language}`;
    return crypto.SHA256(fingerprint).toString().substring(0, 16);
  };

  const { generatePrivateKey, pubkey, address, generatePrivateKeyFromSecretKey, resetKeypair } = useWallet();

  useEffect(() => {
    const storedWallet = localStorage.getItem('zenith-wallet');
    if (storedWallet) {
      try {
        setWallet(JSON.parse(storedWallet));
      } catch (err) {
        console.error("Error loading stored wallet information:", err);
      }
    }
  }, []);

  // 지갑 초기화 함수
  const resetWallet = () => {
    localStorage.removeItem('zenith-wallet');
    setWallet(null);
    resetKeypair();
  };

  const createWallet = () => {
    generatePrivateKey();
  }

  const createWalletFromSecretKey = () => {
    if (inputSecretKey) {
      generatePrivateKeyFromSecretKey(Buffer.from(inputSecretKey, 'hex'));
    }
  }

  useEffect(() => {
    if (pubkey && address) {
      setWallet({
        deviceId: generateDeviceId(),
        pubkey: pubkey,
        address: address,
      });
    }
  }, [pubkey]);

  useEffect(() => {
    if (wallet) {
      localStorage.setItem('zenith-wallet', JSON.stringify(wallet));
    }
  }, [wallet])

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Embedded Wallet</h2>
      
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {!wallet ? (
        <div className="flex flex-col items-center">
          <p className="mb-4 text-center text-gray-700">
            Create an embedded wallet.
          </p>
          <div className="flex flex-col gap-4">
          <section>
            <button
              onClick={createWallet}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
              {"Create New Wallet"}
            </button>
          </section>
          <section className='flex flex-col gap-2'>
            <button
              onClick={createWalletFromSecretKey}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
              {"Create Wallet From Existing Secret Key"}
            </button>
            <input type="text" className="w-full py-2 px-4 bg-gray-200 rounded" placeholder='plz input secret key in hex format' onChange={(e) => setInputSecretKey(e.target.value)} />
          </section>
            </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="p-3 bg-gray-50 rounded-lg mb-4">
            <section className="mb-2">
              <span className="text-sm font-semibold text-gray-600">Device ID:</span>
              <p className="text-sm font-mono break-all">{wallet.deviceId}</p>
            </section>
            <section className="mb-2">
              <span className="text-sm font-semibold text-gray-600">Pubkey:</span>
              <p className="text-sm font-mono break-all">{wallet.pubkey}</p>
            </section>
            <section className="mb-2">
              <span className="text-sm font-semibold text-gray-600">Address:</span>
              <p className="text-sm font-mono break-all">{wallet.address}</p>
            </section>
            <button
              onClick={resetWallet}
              className="flex-1 py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reset Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddedWallet;