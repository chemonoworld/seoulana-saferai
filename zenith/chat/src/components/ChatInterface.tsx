import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Embedded wallet URL configuration (should be restricted to specific origin in production)
const EMBEDDED_WALLET_URL = '*';

// Message type definition
interface ChatMessage {
  text: string;
  isUser: boolean;
}

// Response message type definition
interface ResponseMessage {
  type: string;
  response: string;
  status: 'success' | 'error' | 'info';
  data?: any;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: "Hello! I'm Zenith AI Agent. How can I help you today?", isUser: false }
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

  // Add response message listener
  useEffect(() => {
    const handleWalletResponse = (event: MessageEvent) => {
      // Message format validation
      if (event.data && typeof event.data === 'object' && 
          'type' in event.data && event.data.type === 'response' &&
          'response' in event.data && 'status' in event.data) {
        
        const responseData = event.data as ResponseMessage;
        console.log('Received response from wallet:', responseData);
        
        // Create a styled message based on status
        let messageStyle = '';
        
        switch (responseData.status) {
          case 'success':
            messageStyle = '✅ ';
            break;
          case 'error':
            messageStyle = '❌ ';
            break;
          case 'info':
            messageStyle = 'ℹ️ ';
            break;
          default:
            messageStyle = '';
        }
        
        // Add styled message to chat
        setMessages(prev => [...prev, { 
          text: messageStyle + responseData.response,
          isUser: false
        }]);
        
        // Set processing complete
        setIsProcessing(false);
      }
    };
    
    window.addEventListener('message', handleWalletResponse);
    
    return () => {
      window.removeEventListener('message', handleWalletResponse);
    };
  }, []);

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
    
    // Send message to embedded wallet using postMessage
    try {
      // Format message in standardized format
      const message = {
        type: "text",
        prompt: inputValue
      };
      
      // Send message to parent window (if embedded wallet is in parent window)
      window.parent.postMessage(message, EMBEDDED_WALLET_URL);
      console.log('Message sent to embedded wallet:', message);
      
      // Also send message to top window (for complex iframe structures)
      if (window.top !== window.parent) {
        window.top.postMessage(message, EMBEDDED_WALLET_URL);
      }
    } catch (error) {
      console.error('Error sending message to embedded wallet:', error);
      
      // Release processing state on error
      setIsProcessing(false);
      
      // Add error message
      setMessages(prev => [...prev, { 
        text: "An error occurred while sending the message. Please try again.", 
        isUser: false 
      }]);
    }
    
    // Clear input immediately
    setInputValue('');
    
    // Add waiting message if response takes more than 3 seconds
    const timeoutId = setTimeout(() => {
      // Only add message if still processing (no response received yet)
      if (isProcessing) {
        setMessages(prev => [...prev, { 
          text: "Waiting for response...", 
          isUser: false 
        }]);
      }
    }, 3000);
    
    // Cleanup function
    return () => clearTimeout(timeoutId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper function to render message with appropriate styling
  const renderMessage = (message: ChatMessage, index: number) => {
    // Special styling for transaction results
    let messageClass = message.isUser 
      ? 'bg-gradient-to-r from-web3-purple to-web3-blue text-white'
      : 'bg-gray-100';
    
    // Add special styling for response types
    if (!message.isUser) {
      if (message.text.startsWith('✅')) {
        messageClass = 'bg-green-100 border border-green-300';
      } else if (message.text.startsWith('❌')) {
        messageClass = 'bg-red-100 border border-red-300';
      } else if (message.text.startsWith('ℹ️')) {
        messageClass = 'bg-blue-100 border border-blue-300';
      }
    }

    return (
      <div 
        key={index} 
        className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div 
          className={`max-w-[80%] p-3 rounded-lg ${messageClass}`}
        >
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[70vh] border rounded-lg shadow-sm bg-white">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Zenith AI Agent</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => renderMessage(message, index))}
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
