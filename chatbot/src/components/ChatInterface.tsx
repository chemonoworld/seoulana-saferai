
import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const ChatInterface = () => {
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([
    { text: "Hello! I'm your SAFERAI chatbot. How can I help you today?", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add effect to focus input when processing completes
  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  const handleSendMessage = () => {
    if (inputValue.trim() === '' || isProcessing) return;
    
    // Set processing flag to prevent duplicate submissions
    setIsProcessing(true);
    
    // Add user message
    setMessages(prev => [...prev, { text: inputValue, isUser: true }]);
    
    // Clear input immediately
    setInputValue('');
    
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "I'm still learning. I'll be able to provide better answers soon!", 
        isUser: false 
      }]);
      setIsProcessing(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[70vh] border rounded-lg shadow-sm bg-white">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">SAFERAI Chatbot</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.isUser 
                    ? 'bg-gradient-to-r from-web3-purple to-web3-blue text-white' 
                    : 'bg-gray-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <textarea 
            className="flex-1 resize-none border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-web3-purple"
            placeholder="Type your message..."
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isProcessing}
            ref={inputRef}
          />
          <Button 
            onClick={handleSendMessage}
            className="bg-gradient-to-r from-web3-purple to-web3-blue hover:opacity-90"
            disabled={isProcessing}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
