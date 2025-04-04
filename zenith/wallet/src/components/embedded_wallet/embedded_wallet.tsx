import { useEffect, useState } from 'react';
import crypto from 'crypto-js';
import { useWallet } from '@/hooks/use_wallet';
import PasswordModal from '@/components/modals/PasswordModal';
import type { WalletInfo } from '@/state';
import { encryptData } from '@/utils/encryption';

const EmbeddedWallet = () => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputSecretKey, setInputSecretKey] = useState<string | null>(null);
  const [balanceFormatted, setBalanceFormatted] = useState<number | null>(null);
  const [isBackupConfirmed, setIsBackupConfirmed] = useState(false);
  const [showBackupKeyModal, setShowBackupKeyModal] = useState(false);
  
  // 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // 디바이스 고유 ID 생성 함수
  const generateDeviceId = () => {
    const userAgent = navigator.userAgent;
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = new Date().getTimezoneOffset();
    const language = navigator.language;
    
    const fingerprint = `${userAgent}-${screenInfo}-${timezone}-${language}`;
    return crypto.SHA256(fingerprint).toString().substring(0, 16);
  };

  const { activePrivKeyshare, backupPrivKeyshare, pubkey, address, balance, refreshBalance, generatePrivateKey, generatePrivateKeyFromSecretKey, resetKeypair, recoverWalletState } = useWallet();

  // 지갑 생성 함수
  const createWallet = () => {
    generatePrivateKey();
    setShowCreateModal(true);
  };


  // 비밀번호 설정 및 지갑 저장
  const handleSetPassword = (password: string) => {
    if (activePrivKeyshare) {
      try {
        const encryptedPrivKeyshare = encryptData(activePrivKeyshare, password);
        const newWallet: WalletInfo = {
          deviceId: generateDeviceId(),
          pubkey: pubkey!,
          address: address!,
          encryptedPrivKeyshare,
        };
        
        setWallet(newWallet);
        localStorage.setItem('zenith-wallet', JSON.stringify(newWallet));
        setShowCreateModal(false);
        
        // 백업 키 표시 모달 열기
        setShowBackupKeyModal(true);
      } catch (err) {
        console.error("Error saving wallet:", err);
        setError("An error occurred while saving wallet.");
      }
    }
  };

  // 백업 키 확인 완료
  const handleBackupConfirm = () => {
    setShowBackupKeyModal(false);
    setIsBackupConfirmed(true);
    refreshBalance();
  };

  // 기존 비밀키로 지갑 생성
  const createWalletFromSecretKey = () => {
    if (inputSecretKey) {
      try {
        const secretKeyBuffer = Buffer.from(inputSecretKey, 'hex');
        generatePrivateKeyFromSecretKey(secretKeyBuffer);
        setShowCreateModal(true);
      } catch (err) {
        console.error("Secret key format error:", err);
        setError("Invalid secret key format.");
      }
    }
  };

  // 저장된 지갑 불러오기
  useEffect(() => {
    const storedWallet = localStorage.getItem('zenith-wallet');
    if (storedWallet) {
      try {
        const parsedWallet = JSON.parse(storedWallet) as WalletInfo;
        setWallet(parsedWallet);
        setShowUnlockModal(true);
      } catch (err) {
        console.error("Error loading stored wallet information:", err);
        setError("Could not load saved wallet information.");
      }
    }
  }, []);

  useEffect(() => {
    if (balance) {
      const decimals = 9;
      setBalanceFormatted(Number(balance) / 10 ** decimals);
    }
  }, [balance])

  // 지갑 잠금 해제
  const handleUnlockWallet = async (password: string) => {
    const storedWallet = localStorage.getItem('zenith-wallet');
    if (storedWallet) {
      try {
        setWallet(JSON.parse(storedWallet));
        await recoverWalletState(JSON.parse(storedWallet), password);
        setShowUnlockModal(false);
        setIsBackupConfirmed(true); // 잠금 해제 시에는 백업이 완료된 것으로 간주
      } catch (err) {
        console.error("Wallet unlock error:", err);
        setError("The password is incorrect.");
      }
    }
  };

  // 지갑 초기화 함수
  const resetWallet = () => {
    localStorage.removeItem('zenith-wallet');
    setWallet(null);
    resetKeypair();
    setIsBackupConfirmed(false);
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md">
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
            <input type="text" className="w-full py-2 px-4 bg-gray-200 rounded" placeholder='Please input secret key in hex format' onChange={(e) => setInputSecretKey(e.target.value)} />
          </section>
            </div>
        </div>
      ) : (
        <div className="mt-4">
          {isBackupConfirmed ? (
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <section className="mb-2">
                <span className="text-sm font-semibold text-gray-600">Address:</span>
                <p className="text-sm font-mono break-all">{wallet.address}</p>
              </section>
              <section className="mb-2">
                <span className="text-sm font-semibold text-gray-600">Balance:</span>
                <p className="text-sm font-mono break-all">{balanceFormatted} SOL</p>
                <button 
                  onClick={refreshBalance}
                  className="mt-2 py-1 px-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Refresh
                </button>
              </section>
              <button
                onClick={resetWallet}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reset Wallet
              </button>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-lg mb-4 text-center">
              <p className="text-red-600 font-bold mb-3">Please back up your private key share first!</p>
              <button
                onClick={() => setShowBackupKeyModal(true)}
                className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Back Up Private Key Share
              </button>
            </div>
          )}
        </div>
      )}

      {/* 비밀번호 설정 모달 */}
      <PasswordModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleSetPassword}
        title="Set Wallet Password"
        buttonText="Set Password"
      />

      {/* 지갑 잠금 해제 모달 */}
      <PasswordModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        onConfirm={handleUnlockWallet}
        title="Unlock Wallet"
        buttonText="Unlock"
      />

      {/* 백업 키 표시 모달 */}
      {showBackupKeyModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Backup Private Key Share</h2>
            <div className="mb-6">
              <p className="text-red-600 font-bold mb-2">⚠️ Important: Store this backup key share in a safe place!</p>
              <p className="mb-4 text-sm text-gray-700">
                This backup key share is essential for wallet recovery. You will lose access to your assets if lost.
                Take a screenshot or save it in a secure location.
              </p>
              <div className="p-3 bg-gray-100 rounded-lg break-all font-mono text-sm mb-4">
                {backupPrivKeyshare}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleBackupConfirm}
                className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Backup Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddedWallet;

