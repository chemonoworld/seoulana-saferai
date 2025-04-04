
import React from 'react';
import { cn } from '@/lib/utils';

interface HeroProps {
  className?: string;
}

const Hero = ({ className }: HeroProps) => {
  return (
    <section className={cn("w-full py-12 md:py-24 lg:py-32", className)}>
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
              웹3 채팅 및 지갑 솔루션
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              간편한 웹3 채팅 경험과 임베디드 지갑 솔루션으로 쉽게 암호화폐를 관리하세요.
            </p>
          </div>
          <div className="space-x-4">
            <button className="inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-r from-web3-purple to-web3-blue px-8 text-sm font-medium text-white shadow transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              데모 체험
            </button>
            <button className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              더 알아보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
