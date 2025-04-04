
import React from 'react';
import { cn } from '@/lib/utils';

interface WalletWidgetProps {
  isOpen: boolean;
  className?: string;
}

const WalletWidget = ({ isOpen, className }: WalletWidgetProps) => {
  const widgetClasses = cn(
    "fixed bottom-20 right-4 w-80 h-[500px] rounded-lg shadow-lg overflow-hidden transition-all duration-300 z-40",
    isOpen 
      ? "animate-slide-in-from-right opacity-100 pointer-events-auto" 
      : "animate-slide-out-to-right opacity-0 pointer-events-none transform translate-x-full",
    className
  );

  // For demo purposes, using a placeholder wallet URL
  // Replace with your actual embedded wallet URL in production
  const walletUrl = "about:blank";

  return (
    <div className={widgetClasses}>
      <div className="w-full h-full bg-gradient-to-br from-web3-purple to-web3-blue p-1 rounded-lg">
        <div className="bg-white dark:bg-gray-900 w-full h-full rounded-md overflow-hidden">
          <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b">
            <h3 className="font-semibold text-center">SAFERAI Wallet</h3>
          </div>
          <iframe 
            src={walletUrl} 
            className="wallet-iframe"
            title="Embedded Wallet"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
};

export default WalletWidget;
