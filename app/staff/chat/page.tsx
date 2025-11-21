'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendMessageToAgent, startAvailabilityConversation } from '@/app/actions/scheduling-agent';
import type { Message, ConversationContext, AgentResponse } from '@/app/lib/scheduling-agent';

const STAFF_NUMBER = 1; // Alex Thompson

export default function StaffChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<Array<{ label: string; value: string }>>([]);
  const [hasStarted, setHasStarted] = useState(false);

  const handleStartConversation = async () => {
    setIsLoading(true);
    setMessages([]);
    setContext(null);
    setSuggestedActions([]);

    try {
      const response: AgentResponse = await startAvailabilityConversation(STAFF_NUMBER);

      setMessages([
        {
          role: 'user',
          content: "Hi! I'm ready to submit my availability for next month's schedule.",
        },
        {
          role: 'assistant',
          content: response.message,
        },
      ]);
      setContext(response.context);
      setSuggestedActions(response.suggestedActions || []);
      setHasStarted(true);
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const userMessage = messageText || input.trim();
    if (!userMessage || !context) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setSuggestedActions([]);

    try {
      const response: AgentResponse = await sendMessageToAgent(context, newMessages);

      setMessages([
        ...newMessages,
        { role: 'assistant', content: response.message },
      ]);
      setContext(response.context);
      setSuggestedActions(response.suggestedActions || []);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (value: string) => {
    handleSendMessage(value);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Scheduling Assistant</h1>
        <p className="text-gray-600">
          Get personalized help with your schedule, availability, and time off
        </p>
      </div>

      {!hasStarted ? (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-6">🤖</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Start a Conversation
            </h2>
            <p className="text-gray-600 mb-8">
              The AI assistant can help you with:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="font-semibold text-blue-900 mb-2">📋 Availability Submission</div>
                <div className="text-sm text-blue-700">
                  Submit your availability and get CBA compliance validation
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="font-semibold text-green-900 mb-2">🏖️ Time Off Requests</div>
                <div className="text-sm text-green-700">
                  Smart suggestions for which bank to use
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="font-semibold text-purple-900 mb-2">🔄 Shift Swap Help</div>
                <div className="text-sm text-purple-700">
                  Find compatible co-workers for swaps
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="font-semibold text-orange-900 mb-2">❓ Schedule Questions</div>
                <div className="text-sm text-orange-700">
                  Ask about your schedule, banks, and rules
                </div>
              </div>
            </div>
            <button
              onClick={handleStartConversation}
              disabled={isLoading}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Starting...' : 'Start Availability Submission'}
            </button>
            <div className="mt-4 text-sm text-gray-500">
              ⚡ Powered by Claude AI
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 250px)', minHeight: '600px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center mr-3 text-xl">
                🤖
              </div>
              <div>
                <div className="font-semibold">AI Scheduling Assistant</div>
                <div className="text-sm text-blue-100">
                  {context?.currentStep?.replace('_', ' ')}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setHasStarted(false);
                setMessages([]);
                setContext(null);
              }}
              className="text-sm text-blue-100 hover:text-white underline"
            >
              Start New Conversation
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 shadow-md border border-gray-200'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed">{message.content}</div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 shadow-md border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {suggestedActions.length > 0 && !isLoading && (
            <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
              <div className="text-xs text-gray-500 mb-2">Quick replies:</div>
              <div className="flex flex-wrap gap-2">
                {suggestedActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(action.value)}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
