import { useEffect, useState } from 'react';
import crypto from 'crypto-js';
import { useWallet } from '@/hooks/use_wallet';
import PasswordModal from '@/components/modals/PasswordModal';
import BackupKeyModal from '@/components/modals/BackupKeyModal';
import type { WalletInfo } from '@/state';
import { encryptData } from '@/utils/encryption';

// Message type definition
interface ChatMessage {
  type: string;
  prompt: string;
}

// Response message type definition
interface ResponseMessage {
  type: string;
  response: string;
  status: 'success' | 'error' | 'info';
  data?: any;
}

const EmbeddedWallet = () => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputSecretKey, setInputSecretKey] = useState<string | null>(null);
  const [balanceFormatted, setBalanceFormatted] = useState<number | null>(null);
  const [isBackupConfirmed, setIsBackupConfirmed] = useState(false);
  const [showBackupKeyModal, setShowBackupKeyModal] = useState(false);
  
  // Chat message related states
  const [receivedMessage, setReceivedMessage] = useState<ChatMessage | null>(null);
  const [messageResult, setMessageResult] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const { activePrivKeyshare, backupPrivKeyshare, pubkey, address, balance, refreshBalance, generatePrivateKey, generatePrivateKeyFromSecretKey, resetKeypair, recoverWalletState, sendTransaction } = useWallet();

  // Debug logging for state changes
  useEffect(() => {
    console.log('Wallet state changed:', {
      wallet,
      showBackupKeyModal,
      isBackupConfirmed
    });
  }, [wallet, showBackupKeyModal, isBackupConfirmed]);

  // Function to send response messages
  const postMessageResponse = (response: string, status: 'success' | 'error' | 'info' = 'info', data?: any) => {
    try {
      const responseMessage: ResponseMessage = {
        type: 'response',
        response,
        status,
        data
      };
      
      // Send message to all possible targets
      window.parent.postMessage(responseMessage, '*');
      
      if (window.opener) {
        window.opener.postMessage(responseMessage, '*');
      }
      
      console.log('Response message sent:', responseMessage);
    } catch (error) {
      console.error('Error sending response message:', error);
    }
  };

  // postMessage event listener setup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Origin verification is omitted but should be added in real implementation
      console.log('Message received:', event.data);
      
      // Message format validation
      if (event.data && typeof event.data === 'object' && 'type' in event.data && 'prompt' in event.data) {
        const message = event.data as ChatMessage;
        
        if (message.type === 'text') {
          setReceivedMessage(message);
          console.log('Chat message received:', message.prompt);
          setMessageResult('Message received: ' + message.prompt);
          
          // Message processing logic
          const prompt = message.prompt.toLowerCase();
          
          // Check wallet status
          if (!wallet || !isBackupConfirmed) {
            postMessageResponse('Wallet not created or not backed up. Please set up your wallet first.', 'error');
            return;
          }
          
          // Command processing
          if (prompt.includes('balance')) {
            await refreshBalance();
            postMessageResponse(`Your current balance is ${balanceFormatted} SOL.`, 'success', { balance: balanceFormatted });
          } 
          else if (prompt.includes('send') || prompt.includes('transfer')) {
            // Attempt to extract address
            const addressMatch = prompt.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
            
            if (addressMatch) {
              const recipientAddress = addressMatch[0];
              
              // Send transaction
              try {
                const result = await sendTransaction(recipientAddress);
                
                if (result.success) {
                  postMessageResponse(`Successfully sent 0.01 SOL to ${recipientAddress}.\nTransaction signature: ${result.signature}`, 'success', result);
                } else {
                  postMessageResponse(`Send failed: ${result.message}`, 'error', result);
                }
              } catch (error) {
                postMessageResponse(`Error during transaction: ${error instanceof Error ? error.message : String(error)}`, 'error');
              }
            } else {
              postMessageResponse('No valid SOL address found. Please include a valid address.', 'error');
            }
          }
          else if (prompt.includes('address')) {
            postMessageResponse(`My wallet address: ${address}`, 'success', { address });
          }
          else {
            postMessageResponse('Unsupported command. You can use commands like checking balance, sending SOL, or viewing address.', 'info');
          }
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Remove event listener on component unmount
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [wallet, isBackupConfirmed, sendTransaction, address, balanceFormatted, refreshBalance]);

  // Generate unique device ID
  const generateDeviceId = () => {
    const userAgent = navigator.userAgent;
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = new Date().getTimezoneOffset();
    const language = navigator.language;
    
    const fingerprint = `${userAgent}-${screenInfo}-${timezone}-${language}`;
    return crypto.SHA256(fingerprint).toString().substring(0, 16);
  };

  // Create new wallet
  const createWallet = () => {
    generatePrivateKey();
    setShowCreateModal(true);
  };

  // Set password and save wallet
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
        
        // Show backup key modal
        setTimeout(() => {
          console.log('Opening backup key modal');
          setShowBackupKeyModal(true);
        }, 100);
        
        // Send wallet creation message
        postMessageResponse('Wallet successfully created. Please securely store your backup key.', 'success');
      } catch (err) {
        console.error("Error saving wallet:", err);
        setError("An error occurred while saving wallet.");
        postMessageResponse('Error occurred during wallet creation.', 'error');
      }
    } else {
      console.error("No active private key share available");
      setError("Failed to create wallet: No active private key share");
    }
  };

  // Backup key confirmation complete
  const handleBackupConfirm = () => {
    console.log('Backup confirmed');
    setShowBackupKeyModal(false);
    setIsBackupConfirmed(true);
    refreshBalance();
    
    // Send backup complete message
    postMessageResponse('Backup completed. You can now use your wallet.', 'success');
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
        postMessageResponse('Invalid secret key format.', 'error');
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
        
        // Send wallet unlock message
        postMessageResponse('Wallet successfully unlocked.', 'success');
      } catch (err) {
        console.error("Wallet unlock error:", err);
        setError("The password is incorrect.");
        postMessageResponse('Incorrect password.', 'error');
      }
    }
  };

  // Reset wallet
  const resetWallet = () => {
    localStorage.removeItem('zenith-wallet');
    setWallet(null);
    resetKeypair();
    setIsBackupConfirmed(false);
    
    // Send wallet reset message
    postMessageResponse('Wallet has been reset.', 'info');
  };

  const renderWalletContent = () => {
    // No wallet state - show creation options
    if (!wallet) {
      return (
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
              <input 
                type="text" 
                className="w-full py-2 px-4 bg-gray-200 rounded" 
                placeholder='Please input secret key in hex format' 
                onChange={(e) => setInputSecretKey(e.target.value)} 
              />
            </section>
          </div>
        </div>
      );
    }
    
    // Wallet exists but backup not confirmed
    if (!isBackupConfirmed) {
      return (
        <div className="p-3 bg-gray-50 rounded-lg mb-4 text-center">
          <p className="text-red-600 font-bold mb-3">Please back up your private key share first!</p>
          <button
            onClick={() => {
              console.log('Opening backup key modal from button');
              setShowBackupKeyModal(true);
            }}
            className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back Up Private Key Share
          </button>
        </div>
      );
    }
    
    // Wallet exists and backup confirmed - show wallet info
    return (
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
    );
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md">
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Message display area */}
      {messageResult && (
        <div className="mb-4 p-2 bg-blue-100 text-blue-700 rounded">
          {messageResult}
        </div>
      )}
      
      {/* Main wallet content */}
      <div className="mt-4">
        {renderWalletContent()}
      </div>

      {/* Password setup modal */}
      <PasswordModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleSetPassword}
        title="Set Wallet Password"
        buttonText="Set Password"
        needsApiKey={false}
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

