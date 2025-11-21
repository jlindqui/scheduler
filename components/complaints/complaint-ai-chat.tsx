"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  loadingStatus?: string;
}

interface ComplaintAIChatProps {
  complaintId: string;
  issue: string;
  articlesViolated?: string;
  settlementDesired?: string;
  organizationType: string;
  className?: string;
}

export default function ComplaintAIChat({
  complaintId,
  issue,
  articlesViolated,
  settlementDesired,
  organizationType,
  className
}: ComplaintAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `I'm here to help you with this complaint. I can assist with analysis, provide guidance on next steps, and help you understand the implications of this case. What would you like to know?`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Assess this complaint",
    "Resolution Options", 
    "Summary",
    "Next Steps"
  ];

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim()
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      isLoading: true,
      loadingStatus: 'Thinking...'
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: `AI response for: "${content.trim()}". This is a placeholder response.`, isLoading: false }
            : msg
        ));
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isLoading: false }
          : msg
      ));
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-full shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-100 flex-shrink-0">
          <div className="px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 rounded-t-xl">
            <h3 className="text-sm font-semibold text-white flex items-center">
              <Bot className="h-4 w-4 mr-2" />
              AI Helper
            </h3>
          </div>
        </div>

        {/* Messages - Scrollable area */}
        <div
          ref={messagesContainerRef}
          className="overflow-y-auto scroll-smooth p-2 flex-1 min-h-0"
        >
          <div className="space-y-1.5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type === 'assistant' && (
                  <div className="flex-shrink-0 w-4 h-4 bg-gradient-to-r from-slate-500 to-slate-600 rounded-full flex items-center justify-center mt-0.5">
                    <Bot className="h-2 w-2 text-white" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed shadow-sm",
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white'
                      : 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-900 border border-slate-200'
                  )}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-1 py-1">
                      <Loader2 className="h-2.5 w-2.5 animate-spin text-slate-600" />
                      <span className="text-xs text-slate-700 font-medium">
                        {message.loadingStatus || 'Thinking...'}
                      </span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="flex-shrink-0 w-4 h-4 bg-gradient-to-r from-slate-500 to-slate-600 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-medium">U</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-2 border-b border-slate-100">
          <div className="flex flex-wrap gap-1">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={isLoading}
                className="h-6 px-2 text-xs"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-2 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about this complaint..."
              className="min-h-[60px] max-h-[120px] resize-none text-xs"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={!inputValue.trim() || isLoading}
              className="h-[60px] px-3"
            >
              <Send className="h-3 w-3" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
