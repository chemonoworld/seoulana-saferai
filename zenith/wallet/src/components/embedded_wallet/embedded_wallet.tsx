import { useEffect, useState } from 'react';
import crypto from 'crypto-js';
import { useWallet } from '@/hooks/use_wallet';
import PasswordModal from '@/components/modals/PasswordModal';
import BackupKeyModal from '@/components/modals/BackupKeyModal';
import type { WalletInfo } from '@/state';
import { encryptData } from '@/utils/encryption';

const EmbeddedWallet = () => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputSecretKey, setInputSecretKey] = useState<string | null>(null);
  const [balanceFormatted, setBalanceFormatted] = useState<number | null>(null);
  const [isBackupConfirmed, setIsBackupConfirmed] = useState(false);
  const [showBackupKeyModal, setShowBackupKeyModal] = useState(false);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Generate unique device ID
  const generateDeviceId = () => {
    const userAgent = navigator.userAgent;
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = new Date().getTimezoneOffset();
    const language = navigator.language;
    
    const fingerprint = `${userAgent}-${screenInfo}-${timezone}-${language}`;
    return crypto.SHA256(fingerprint).toString().substring(0, 16);
  };

  const { activePrivKeyshare, backupPrivKeyshare, pubkey, address, balance, openAIApiKey, setOpenAIApiKey, refreshBalance, generatePrivateKey, generatePrivateKeyFromSecretKey, resetKeypair, recoverWalletState } = useWallet();

  // Create new wallet
  const createWallet = () => {
    generatePrivateKey();
    setShowCreateModal(true);
  };


  // Set password and save wallet
  const handleSetPassword = (password: string, apiKey?: string) => {
    if (activePrivKeyshare) {
      try {
        const encryptedPrivKeyshare = encryptData(activePrivKeyshare, password);
        const newWallet: WalletInfo = {
          deviceId: generateDeviceId(),
          pubkey: pubkey!,
          address: address!,
          encryptedPrivKeyshare,
        };
        
        // Encrypt and store OpenAI API key if provided
        if (apiKey) {
          newWallet.encryptedOpenAIApiKey = encryptData(apiKey, password);
          setOpenAIApiKey(apiKey); // Store API key in state
        }
        
        setWallet(newWallet);
        localStorage.setItem('zenith-wallet', JSON.stringify(newWallet));
        setShowCreateModal(false);
        
        // Show backup key modal
        setShowBackupKeyModal(true);
      } catch (err) {
        console.error("Error saving wallet:", err);
        setError("An error occurred while saving wallet.");
      }
    }
  };

  // Backup key confirmation complete
  const handleBackupConfirm = () => {
    setShowBackupKeyModal(false);
    setIsBackupConfirmed(true);
    refreshBalance();
  };

  // Create wallet from existing secret key
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

  // Load stored wallet
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

  // Unlock wallet
  const handleUnlockWallet = async (password: string) => {
    const storedWallet = localStorage.getItem('zenith-wallet');
    if (storedWallet) {
      try {
        const parsedWallet = JSON.parse(storedWallet) as WalletInfo;
        setWallet(parsedWallet);
        await recoverWalletState(parsedWallet, password);
        
        setShowUnlockModal(false);
        setIsBackupConfirmed(true); // Consider backup as confirmed when unlocking
      } catch (err) {
        console.error("Wallet unlock error:", err);
        setError("The password is incorrect.");
      }
    }
  };

  // Reset wallet
  const resetWallet = () => {
    localStorage.removeItem('zenith-wallet');
    setWallet(null);
    resetKeypair();
    setIsBackupConfirmed(false);
    setOpenAIApiKey(null); // Reset API key
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
              <section className="mb-2">
                <span className="text-sm font-semibold text-gray-600">API Key:</span>
                <p className="text-sm font-mono break-all">
                  {openAIApiKey ? 
                    `${openAIApiKey.substring(0, 3)}...${openAIApiKey.substring(openAIApiKey.length - 4)}` : 
                    "Not set"}
                </p>
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

      {/* Password setup modal */}
      <PasswordModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleSetPassword}
        title="Set Wallet Password"
        buttonText="Set Password"
        needsApiKey={true}
      />

      {/* Wallet unlock modal */}
      <PasswordModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        onConfirm={handleUnlockWallet}
        title="Unlock Wallet"
        buttonText="Unlock"
        needsApiKey={false}
      />

      {/* Backup key modal */}
      <BackupKeyModal
        isOpen={showBackupKeyModal}
        onClose={handleBackupConfirm}
        backupPrivKeyshare={backupPrivKeyshare}
      />
    </div>
  );
};

export default EmbeddedWallet;

