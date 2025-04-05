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

// Server URL configuration
const SERVER_URL = 'http://localhost:8080/api';
console.log('Using server URL:', SERVER_URL);

// Transaction type from server
enum TransactionType {
  TRANSFER_SOL = 'TRANSFER_SOL',
  NFT_MINT = 'NFT_MINT',
  TOKEN_SWAP = 'TOKEN_SWAP',
  UNKNOWN = 'UNKNOWN',
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
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Transaction test related states
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendResult, setSendResult] = useState<string | null>(null);
  
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

  // Function to analyze message with server
  const analyzeMessageWithServer = async (prompt: string): Promise<void> => {
    if (!prompt) return;
    
    setIsProcessingMessage(true);
    setMessageResult(`Processing message: "${prompt}"`);
    
    const requestUrl = `${SERVER_URL}/agent/analyze`;
    const requestBody = JSON.stringify({ message: prompt });
    
    console.log('Sending request to:', requestUrl);
    console.log('Request body:', requestBody);
    
    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });
      
      console.log('Server response status:', response.status);
      console.log('Server response headers:', Object.fromEntries([...response.headers.entries()]));
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Failed to read error response');
        console.error('Error response body:', errorText);
        throw new Error(`Server responded with status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Server analysis:', data);
      
      if (!data.success) {
        postMessageResponse(
          `Error from server: ${data.error || 'Unknown error analyzing your message'}`,
          'error'
        );
        setMessageResult(`Error from server: ${data.error || 'Unknown error'}`);
        return;
      }
      
      const { transactionMessage } = data;
      
      // Handle the transaction message
      if (transactionMessage.success) {
        switch (transactionMessage.transactionType) {
          case TransactionType.TRANSFER_SOL:
            setMessageResult(`Preparing to send ${transactionMessage.data.amount} SOL to ${transactionMessage.data.recipientAddress}`);
            
            // Call the send transaction function
            if (wallet && isBackupConfirmed) {
              try {
                const result = await sendTransaction(transactionMessage.data.recipientAddress);
                
                // Send the result back to the chat component
                if (result.success) {
                  postMessageResponse(
                    `Successfully sent ${transactionMessage.data.amount} SOL to ${transactionMessage.data.recipientAddress}.\nTransaction signature: ${result.signature}`,
                    'success',
                    result
                  );
                  setMessageResult(`Transaction successful: ${result.message}`);
                } else {
                  postMessageResponse(`Transaction failed: ${result.message}`, 'error', result);
                  setMessageResult(`Transaction failed: ${result.message}`);
                }
              } catch (error) {
                postMessageResponse(
                  `Error executing transaction: ${error instanceof Error ? error.message : String(error)}`,
                  'error'
                );
                setMessageResult(`Error executing transaction: ${error instanceof Error ? error.message : String(error)}`);
              }
            } else {
              postMessageResponse(
                'Wallet not ready for transactions. Please create and back up your wallet first.',
                'error'
              );
              setMessageResult('Wallet not ready for transactions');
            }
            break;
            
          default:
            postMessageResponse(
              `Unsupported transaction type: ${transactionMessage.transactionType}`,
              'error'
            );
            setMessageResult(`Unsupported transaction type: ${transactionMessage.transactionType}`);
            break;
        }
      } else {
        // Transaction message was unsuccessful
        postMessageResponse(transactionMessage.message, 'error');
        setMessageResult(`Analysis failed: ${transactionMessage.message}`);
      }
    } catch (error) {
      console.error('Error analyzing message with server:', error);
      
      // Try to get more information about the error
      const errorDetails = error instanceof Error ? 
        {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        } : 
        String(error);
      
      console.error('Error details:', JSON.stringify(errorDetails, null, 2));
      
      postMessageResponse(
        `Failed to analyze message: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      setMessageResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessingMessage(false);
    }
  };

  // postMessage event listener setup
  useEffect(() => {
    console.log('Setting up message event listener');
    
    const handleMessage = async (event: MessageEvent) => {
      console.log('Raw message event received:', event);
      console.log('Message data:', JSON.stringify(event.data, null, 2));
      
      // Origin verification is omitted but should be added in real implementation
      console.log('Message received:', event.data);
      
      // Check if message is a valid object
      if (!event.data || typeof event.data !== 'object') {
        console.warn('Invalid message format: Not an object', event.data);
        return;
      }
      
      // Debug properties available in the event.data
      console.log('Message properties:', Object.keys(event.data));
      
      // Message format validation
      if ('type' in event.data && 'prompt' in event.data) {
        const message = event.data as ChatMessage;
        console.log('Valid chat message format detected:', message);
        
        if (message.type === 'text') {
          setReceivedMessage(message);
          console.log('Chat message received:', message.prompt);
          
          // First, update UI to show we received the message
          setMessageResult('Message received: ' + message.prompt);
          
          // Process with the server if wallet is ready
          if (wallet && isBackupConfirmed) {
            console.log('Wallet is ready, sending to analyzeMessageWithServer');
            await analyzeMessageWithServer(message.prompt);
          } else {
            console.warn('Wallet not ready:', { wallet: !!wallet, isBackupConfirmed });
            postMessageResponse(
              'Wallet not created or not backed up. Please set up your wallet first.',
              'error'
            );
          }
        } else {
          console.warn('Unsupported message type:', message.type);
        }
      } else {
        console.warn('Message does not match expected format for ChatMessage');
        console.log('Required properties missing:', {
          hasType: 'type' in event.data,
          hasPrompt: 'prompt' in event.data,
        });
      }
    };
    
    // Add event listener for messages from parent window
    window.addEventListener('message', handleMessage);
    console.log('Message event listener added');
    
    // Remove event listener on component unmount
    return () => {
      console.log('Removing message event listener');
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

  // Manual transaction test function
  const handleManualSend = async () => {
    if (!recipientAddress) {
      setError('Please enter a recipient address.');
      return;
    }
    
    if (!wallet || !isBackupConfirmed) {
      setError('Wallet not ready. Please create and backup your wallet first.');
      return;
    }
    
    try {
      console.log('Manually sending 0.01 SOL to:', recipientAddress);
      const result = await sendTransaction(recipientAddress);
      console.log('Transaction result:', result);
      
      if (result.success) {
        setSendResult(`Transaction successful! Signature: ${result.signature}`);
      } else {
        setSendResult(`Transaction failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Manual transaction error:', error);
      setSendResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    
    // Wallet ready
    return (
      <div className="flex flex-col gap-4">
        <section className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Wallet Info</h3>
          <p className="text-sm text-gray-600 break-all">Address: {address}</p>
          <p className="text-sm text-gray-600 mt-1">
            Balance: {balanceFormatted !== null ? `${balanceFormatted} SOL` : 'Loading...'}
            <button
              onClick={() => refreshBalance()}
              className="ml-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </p>
        </section>
        
        {/* Transaction testing section */}
        <section className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Transaction Test</h3>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="w-full py-2 px-4 bg-white border border-gray-300 rounded"
              placeholder="Enter recipient SOL address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />
            <button
              onClick={handleManualSend}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Send 0.01 SOL
            </button>
            {sendResult && (
              <div className={`mt-2 p-2 text-sm rounded ${
                sendResult.includes('successful') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {sendResult}
              </div>
            )}
          </div>
        </section>
        
        <section className="flex justify-between">
          <button
            onClick={resetWallet}
            className="py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reset Wallet
          </button>
        </section>
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
        <div className={`mb-4 p-2 ${isProcessingMessage ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'} rounded`}>
          {messageResult}
          {isProcessingMessage && (
            <div className="mt-2 flex items-center">
              <div className="w-3 h-3 bg-yellow-600 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm">Processing...</span>
            </div>
          )}
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

