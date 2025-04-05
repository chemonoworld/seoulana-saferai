import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Embedded wallet URL configuration (should be restricted to specific origin in production)
const EMBEDDED_WALLET_URL = 'http://localhost:5173';

// Message type definition
interface ChatMessage {
  text: string;
  isUser: boolean;
  type?: string;
  data?: any;
}

// API message format for communication with embedded wallet
interface ApiMessage {
  type: string;
  prompt: string;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: "How can I assist you today?", isUser: false },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollAreaRef.current?.scrollTo({
        top: messagesEndRef.current?.offsetTop,
        behavior: 'smooth'
      });
    }, 100);
  }, [messages]);

  // Event listener for messages from the embedded wallet
  useEffect(() => {
    const handleWalletMessage = (event: MessageEvent) => {
      // Check origin for security
      if (new URL(event.origin).origin !== new URL(EMBEDDED_WALLET_URL).origin) {
        console.warn('Received message from unauthorized origin:', event.origin);
        return;
      }
      
      console.log('Received message from wallet:', event.data);
      
      // Handle ResponseMessage format
      if (event.data && typeof event.data === 'object' && 'type' in event.data && event.data.type === 'response') {
        const { response, status, data } = event.data;
        
        if (response) {
          // Handle confirmation type messages that require user input
          const isConfirmation = data && data.type === 'confirmation';
          
          setMessages(prev => [...prev, { 
            text: response,
            isUser: false,
            type: isConfirmation ? 'confirmation' : status,
            data
          }]);
          
          // If processing was happening, it's now complete
          setIsProcessing(false);
        }
      } else if (event.data && typeof event.data === 'object' && 'message' in event.data) {
        // Original format handling (kept for backward compatibility)
        const { message, status, data } = event.data;
        
        if (message) {
          const isConfirmation = data && data.type === 'confirmation';
          
          setMessages(prev => [...prev, { 
            text: message,
            isUser: false,
            type: isConfirmation ? 'confirmation' : status,
            data
          }]);
          
          setIsProcessing(false);
        }
      }
    };
    
    window.addEventListener('message', handleWalletMessage);
    
    return () => {
      window.removeEventListener('message', handleWalletMessage);
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
      const message: ApiMessage = {
        type: "text",
        prompt: inputValue
      };
      
      // Try to find wallet iframe and send message directly to it
      const walletFrame = document.querySelector('iframe[src*="wallet"]') || 
                          document.querySelector('iframe[title="Embedded Wallet"]');
      
      if (walletFrame) {
        try {
          (walletFrame as HTMLIFrameElement).contentWindow?.postMessage(message, EMBEDDED_WALLET_URL);
          console.log('Message sent to wallet iframe:', message);
        } catch (frameError) {
          console.error('Error sending to iframe:', frameError);
          throw frameError; // Re-throw to be caught by outer catch
        }
      } else {
        // Fallback to parent window if iframe not found
        window.parent.postMessage(message, EMBEDDED_WALLET_URL);
        console.log('Message sent to parent window:', message);
      }
    } catch (error) {
      console.error('Error sending message to embedded wallet:', error);
      
      // Release processing state on error
      setIsProcessing(false);
      
      // Add error message
      setMessages(prev => [...prev, { 
        text: "An error occurred while sending your message. Please try again.", 
        isUser: false 
      }]);
    }
    
    // Clear input immediately
    setInputValue('');
  };

  // Render message with appropriate styling
  const renderMessage = (message: ChatMessage, index: number) => {
    // Determine message styling based on sender
    const messageClasses = message.isUser
      ? "bg-gradient-to-r from-blue-400 to-indigo-500 text-white rounded-lg px-4 py-3 max-w-[70%] ml-auto shadow-sm"
      : "bg-white border border-gray-200 text-gray-800 rounded-lg px-4 py-3 max-w-[70%] shadow-sm";
      
    // Add different styling for confirmation messages
    const confirmationClass = message.type === 'confirmation' 
      ? "bg-amber-50 border border-amber-300 text-gray-800" 
      : "";
      
    // Add different styling for success/error messages
    const statusClass = !message.isUser && message.type === 'success'
      ? "bg-emerald-50 border border-emerald-300 text-gray-800"
      : message.type === 'error'
        ? "bg-rose-50 border border-rose-300 text-gray-800"
        : "";
    
    return (
      <div key={index} className={`mb-3 ${message.isUser ? "text-right" : "text-left"}`}>
        <div className={`inline-block ${messageClasses} ${confirmationClass} ${statusClass}`}>
          <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
          
          {/* Add confirmation buttons if needed */}
          {message.type === 'confirmation' && (
            <div className="flex justify-center gap-3 mt-3">
              <Button 
                onClick={() => handleConfirmationResponse('Y')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                size="sm"
              >
                Yes
              </Button>
              <Button 
                onClick={() => handleConfirmationResponse('N')}
                className="bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
                size="sm"
              >
                No
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Handle confirmation response
  const handleConfirmationResponse = (response: string) => {
    // Add the user's response to the chat
    setMessages(prev => [...prev, { text: response, isUser: true }]);
    
    // Send the response to the wallet
    const message: ApiMessage = {
      type: "text",
      prompt: response
    };
    
    // Find wallet iframe
    const walletFrame = document.querySelector('iframe[src*="wallet"]') || 
                        document.querySelector('iframe[title="Embedded Wallet"]');
    
    if (walletFrame) {
      try {
        (walletFrame as HTMLIFrameElement).contentWindow?.postMessage(message, EMBEDDED_WALLET_URL);
        console.log('Confirmation response sent to wallet:', message);
      } catch (error) {
        console.error('Error sending confirmation to iframe:', error);
      }
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Handle key press for sending message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] border rounded-lg overflow-hidden bg-white shadow-md">
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
        <h2 className="text-md font-semibold text-gray-800">ZENITH Chat</h2>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-3 bg-gray-50">
        <div className="space-y-3">
          {messages.map((message, index) => renderMessage(message, index))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="px-4 py-3 border-t bg-white flex items-center">
        <input
          ref={inputRef}
          className="flex-1 px-3 py-2 text-sm border rounded-l-md focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
          placeholder={isProcessing ? "Processing your request..." : "Type a message..."}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          disabled={isProcessing}
        />
        <Button 
          onClick={handleSendMessage}
          className="rounded-l-none bg-indigo-500 hover:bg-indigo-600" 
          disabled={isProcessing || inputValue.trim() === ''}
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInterface;
