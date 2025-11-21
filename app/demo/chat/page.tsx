'use client';

import { useState } from 'react';
import { chatMessages as initialMessages } from '@/app/lib/mock-data';
import type { ChatMessage } from '@/app/lib/definitions';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId: 'conv_1',
      role: 'user',
      content: input,
      metadata: null,
      createdAt: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        conversationId: 'conv_1',
        role: 'assistant',
        content: getAIResponse(input),
        metadata: {
          action: 'response',
          confidence: 0.95,
        },
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getAIResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('submit') || lowerInput.includes('yes') || lowerInput.includes('confirm')) {
      return "Perfect! I've submitted your availability for next month's schedule. Your manager will review it and you'll be notified once the schedule is published. Is there anything else I can help you with?";
    }

    if (lowerInput.includes('swap') || lowerInput.includes('trade')) {
      return "I can help you request a shift swap! Which shift would you like to swap? I'll check for compatible co-workers who match your skills and won't trigger any CBA violations.";
    }

    if (lowerInput.includes('time off') || lowerInput.includes('vacation')) {
      return "I can help you request time off! I noticed your Stat Day bank has 24 hours expiring in 30 days. Would you like to use those hours first to avoid losing them?";
    }

    if (lowerInput.includes('schedule')) {
      return "You have 4 upcoming shifts this week totaling 32 hours. Your next shift is today at 7:00 AM in the Emergency Department. Would you like to see your full schedule?";
    }

    return "I'm here to help with:\n\n• 📋 Submitting availability\n• 🔄 Requesting shift swaps\n• 🏖️ Time off requests\n• 📊 Viewing your schedule\n• ⚖️ CBA rule questions\n\nWhat would you like to do?";
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Scheduling Agent</h1>
        <p className="text-gray-600">
          Chat with your AI assistant for all scheduling needs
        </p>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ height: '600px' }}>
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center">
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
            🤖
          </div>
          <div>
            <div className="font-semibold">AI Agent</div>
            <div className="text-sm text-blue-100">Available • Responds instantly</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 shadow'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {message.createdAt.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 shadow rounded-lg px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            💡 Try: "Can I see my schedule?", "I need time off", or "Help me swap a shift"
          </div>
        </div>
      </div>
    </div>
  );
}
