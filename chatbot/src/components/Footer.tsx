
import React from 'react';
import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
}

const Footer = ({ className }: FooterProps) => {
  return (
    <footer className={cn("w-full border-t py-6 md:py-0", className)}>
      <div className="container flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:h-16">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-web3-purple to-web3-blue flex items-center justify-center">
            <span className="text-white font-bold text-xs">W3</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2023 웹3 채팅. 모든 권리 보유.
          </p>
        </div>
        <nav className="flex items-center space-x-4">
          <a href="/" className="text-sm text-gray-500 hover:text-primary dark:text-gray-400">
            개인정보 처리방침
          </a>
          <a href="/" className="text-sm text-gray-500 hover:text-primary dark:text-gray-400">
            이용 약관
          </a>
          <a href="/" className="text-sm text-gray-500 hover:text-primary dark:text-gray-400">
            문의하기
          </a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
