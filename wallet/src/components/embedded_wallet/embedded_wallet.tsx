import { useEffect, useState } from 'react';
import crypto from 'crypto-js';

// 지갑 타입 정의
interface WalletInfo {
  deviceId: string;
  walletAddress: string;
  balance: string;
  createdAt: string;
}

const EmbeddedWallet = () => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 디바이스 고유 ID 생성 함수
  const generateDeviceId = () => {
    // 브라우저 핑거프린팅으로 디바이스 ID 생성
    const userAgent = navigator.userAgent;
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = new Date().getTimezoneOffset();
    const language = navigator.language;
    
    // 여러 정보를 조합하여 해시 생성
    const fingerprint = `${userAgent}-${screenInfo}-${timezone}-${language}`;
    return crypto.SHA256(fingerprint).toString().substring(0, 16);
  };

  // 가상의 지갑 주소 생성 (실제 구현에서는 백엔드에서 생성)
  const generateWalletAddress = (deviceId: string) => {
    return "0x" + crypto.SHA256(deviceId + new Date().toISOString()).toString().substring(0, 40);
  };

  // 지갑 생성 함수
  const createWallet = () => {
    setLoading(true);
    try {
      const deviceId = generateDeviceId();
      const walletAddress = generateWalletAddress(deviceId);
      
      const newWallet: WalletInfo = {
        deviceId,
        walletAddress,
        balance: "0.00",
        createdAt: new Date().toISOString()
      };
      
      setWallet(newWallet);
      
      // 로컬 스토리지에 지갑 정보 저장
      localStorage.setItem('embeddedWallet', JSON.stringify(newWallet));
      
      setError(null);
      console.log("Wallet creation successful:", newWallet);
    } catch (err) {
      setError("An error occurred while creating the wallet.");
      console.error("Wallet creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 기존 지갑 불러오기
  useEffect(() => {
    const storedWallet = localStorage.getItem('embeddedWallet');
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
    localStorage.removeItem('embeddedWallet');
    setWallet(null);
  };

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
            Create an embedded wallet based on your device ID.
          </p>
          <button
            onClick={createWallet}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Wallet"}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="p-3 bg-gray-50 rounded-lg mb-4">
            <div className="mb-2">
              <span className="text-sm font-semibold text-gray-600">Device ID:</span>
              <p className="text-sm font-mono break-all">{wallet.deviceId}</p>
            </div>
            <div className="mb-2">
              <span className="text-sm font-semibold text-gray-600">Wallet Address:</span>
              <p className="text-sm font-mono break-all">{wallet.walletAddress}</p>
            </div>
            <div className="mb-2">
              <span className="text-sm font-semibold text-gray-600">Balance:</span>
              <p className="text-lg font-bold">{wallet.balance} ETH</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">Created:</span>
              <p className="text-sm">{new Date(wallet.createdAt).toLocaleString()}</p>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => setWallet({...wallet, balance: (parseFloat(wallet.balance) + 0.01).toFixed(2)})}
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Deposit (+0.01)
            </button>
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