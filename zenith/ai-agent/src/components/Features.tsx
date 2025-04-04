
import React from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Wallet, Shield, Zap } from 'lucide-react';

interface FeaturesProps {
  className?: string;
}

const Features = ({ className }: FeaturesProps) => {
  const features = [
    {
      icon: <MessageSquare className="h-10 w-10 text-web3-purple" />,
      title: "웹3 채팅",
      description: "안전하고 분산화된 채팅 플랫폼으로 암호화폐 관련 대화를 나누세요."
    },
    {
      icon: <Wallet className="h-10 w-10 text-web3-blue" />,
      title: "임베디드 지갑",
      description: "사이트에서 벗어나지 않고 암호화폐를 쉽게 관리할 수 있는 지갑 솔루션입니다."
    },
    {
      icon: <Shield className="h-10 w-10 text-web3-teal" />,
      title: "보안 우선",
      description: "사용자의 자산과 대화를 보호하기 위한 최고 수준의 암호화 기술을 적용했습니다."
    },
    {
      icon: <Zap className="h-10 w-10 text-web3-deepPurple" />,
      title: "빠른 거래",
      description: "대화 중에 바로 자산을 전송하고 거래할 수 있는 빠른 솔루션입니다."
    }
  ];

  return (
    <section className={cn("w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900", className)}>
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              주요 기능
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              우리의 Web3 채팅 및 지갑 솔루션의 주요 기능을 확인하세요
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mt-12">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center space-y-4 rounded-lg border p-6 bg-background shadow-sm transition-all hover:shadow">
              {feature.icon}
              <h3 className="text-xl font-bold">{feature.title}</h3>
              <p className="text-center text-gray-500 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
