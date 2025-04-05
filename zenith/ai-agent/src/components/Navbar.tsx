
import React from 'react';
import { cn } from '@/lib/utils';

interface NavbarProps {
  className?: string;
  toggleWallet: () => void;
}

const Navbar = ({ className, toggleWallet }: NavbarProps) => {
  return (
    <header className={cn("w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <a href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-web3-purple to-web3-blue flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xs">ZN</span>
            </div>
            <span className="font-bold text-xl hidden sm:inline-block">ZENITH AI AGENT</span>
          </a>
        </div>
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          <a
            href="/"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Home
          </a>
          <a
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Docs
          </a>
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <button 
            onClick={toggleWallet}
            className="px-4 py-2 rounded-md bg-gradient-to-r from-web3-purple to-web3-blue text-white font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
