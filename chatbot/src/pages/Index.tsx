
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import ChatInterface from '@/components/ChatInterface';
import WalletButton from '@/components/WalletButton';
import WalletWidget from '@/components/WalletWidget';

const Index = () => {
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const toggleWallet = () => {
    setIsWalletOpen(!isWalletOpen);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar toggleWallet={toggleWallet} />
      <main className="flex-1 container mx-auto py-6 px-4">
        <ChatInterface />
      </main>
      
      {/* Wallet Button and Widget */}
      <WalletButton 
        isOpen={isWalletOpen} 
        onClick={toggleWallet} 
      />
      <WalletWidget 
        isOpen={isWalletOpen} 
      />
    </div>
  );
};

export default Index;
