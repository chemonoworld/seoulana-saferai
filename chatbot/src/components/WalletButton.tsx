
import React from 'react';
import { Wallet, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface WalletButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

const WalletButton = ({ isOpen, onClick, className }: WalletButtonProps) => {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "rounded-full w-14 h-14 flex items-center justify-center fixed bottom-4 right-4 shadow-lg z-50 transition-all duration-300",
        isOpen ? "bg-red-500 hover:bg-red-600" : "bg-gradient-to-r from-web3-purple to-web3-blue hover:opacity-90",
        className
      )}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <Wallet className="h-6 w-6" />
      )}
    </Button>
  );
};

export default WalletButton;
