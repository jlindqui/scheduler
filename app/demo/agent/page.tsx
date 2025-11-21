'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendMessageToAgent, startAvailabilityConversation } from '@/app/actions/scheduling-agent';
import { staff, getScheduleSummary } from '@/app/lib/mock-schedule-data';
import type { Message, ConversationContext, AgentResponse } from '@/app/lib/scheduling-agent';

export default function AgentDemoPage() {
  const [selectedStaff, setSelectedStaff] = useState<number>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<Array<{ label: string; value: string }>>([]);

  const summary = getScheduleSummary();
  const currentStaff = staff.find(s => s.staffNumber === selectedStaff);

  const handleStartConversation = async () => {
    setIsLoading(true);
    setMessages([]);
    setContext(null);
    setSuggestedActions([]);

    try {
      const response: AgentResponse = await startAvailabilityConversation(selectedStaff);

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
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Scheduling Agent Prototype
        </h1>
        <p className="text-gray-600">
          Real LLM-powered conversation for schedule availability submission
        </p>
      </div>

      {/* Schedule Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">📊 Schedule Context</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-blue-800">
          <div>
            <strong>Total Staff:</strong> {summary.totalStaff}
          </div>
          <div>
            <strong>Full-Time:</strong> {summary.fullTimeStaff}
          </div>
          <div>
            <strong>Part-Time:</strong> {summary.partTimeStaff}
          </div>
          <div>
            <strong>Period:</strong> {summary.schedulePeriod}
          </div>
          <div className="col-span-2">
            <strong>Staffing:</strong> {summary.staffingRequirement}
          </div>
        </div>
      </div>

      {/* Staff Selector */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          1. Select Staff Member
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.slice(0, 6).map((s) => (
            <button
              key={s.staffNumber}
              onClick={() => setSelectedStaff(s.staffNumber)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedStaff === s.staffNumber
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">{s.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                {s.status} ({s.fte} FTE) • {s.seniorityYears} yrs seniority
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {s.canWorkDayShift && s.canWorkNightShift ? '✓ Day & Night shifts' :
                 s.canWorkDayShift ? '✓ Day shifts only' : '✓ Night shifts only'}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleStartConversation}
          disabled={isLoading}
          className="mt-4 w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Starting conversation...' : `Start Availability Conversation with ${currentStaff?.name}`}
        </button>
      </div>

      {/* Chat Interface */}
      {messages.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center">
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center mr-3 text-xl">
              🤖
            </div>
            <div className="flex-1">
              <div className="font-semibold">AI Scheduling Assistant</div>
              <div className="text-sm text-blue-100">
                Helping {currentStaff?.name} • {context?.currentStep?.replace('_', ' ')}
              </div>
            </div>
            <div className="text-xs text-blue-100">
              Powered by Claude
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${
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
                  {message.role === 'assistant' && (
                    <div className="text-xs mt-2 opacity-70">
                      AI Assistant
                    </div>
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
            <div className="mt-2 text-xs text-gray-500">
              💡 Try asking about your schedule, time off banks, or availability requirements
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {messages.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">How it works:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
            <li>Select a staff member from the list above</li>
            <li>Click "Start Availability Conversation" to begin</li>
            <li>The AI agent will guide you through submitting availability</li>
            <li>It will validate CBA requirements, suggest optimal time off bank usage, and collect preferences</li>
            <li>All data is from the CSV example files (20 RN staff, 6-week schedule)</li>
          </ol>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <strong>⚡ Live AI:</strong> This uses real Claude API calls - responses may take a few seconds
          </div>
        </div>
      )}
    </div>
  );
}
