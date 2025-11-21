'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
// ScrollArea component not available, using div with overflow
import { 
  Bot, 
  User, 
  Send, 
  Loader2, 
  Copy, 
  Check,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { generateAIContent, classifyUserQuestion } from '@/app/actions/llm/analysis';
import { AI_MODEL_CONFIG } from '@/app/actions/llm/models';
import { extractEvidencePdfContent } from '@/app/actions/evidence';
import { createAiChatSession, logAiInteraction, updateAiInteractionFeedback } from '@/app/actions/ai-tracking';
import { getCachedDisciplineContext, extractAndCacheDisciplineSections, shouldUseDisciplineGuidance } from '@/app/actions/grievance-discipline-cache';
import { getEstablishedFacts } from '@/app/actions/established-facts';
import { useEstablishedFacts } from '@/hooks/use-established-facts';
import { generateStepMeetingPreparation } from '@/app/actions/llm/step-meeting';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { Evidence, Grievor, WorkInformation } from '@/app/lib/definitions';


interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  loadingStatus?: string;
}

interface GrievanceAIChatProps {
  grievanceId: string;
  statement: string;
  evidence: Evidence[];
  grievors: Grievor[];
  workInformation: WorkInformation;
  agreementId?: string;
  articlesViolated?: string;
  settlementDesired?: string;
  organizationType: 'HR' | 'Union' | 'LAW_FIRM';
  className?: string;
  width?: number;
  onWidthChange?: (width: number) => void;
  onSwitchToEmails?: () => void;
}

export default function GrievanceAIChat({
  grievanceId,
  statement,
  evidence,
  grievors,
  workInformation,
  agreementId,
  articlesViolated,
  settlementDesired,
  organizationType,
  className,
  width: externalWidth,
  onWidthChange,
  onSwitchToEmails
}: GrievanceAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hi! I'm your AI assistant with access to all case evidence, stipulated facts, collective agreement articles, and arbitrator guidance. What can I help you with?`,
      timestamp: new Date()
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, 'up' | 'down' | null>>({});
  const [width, setWidth] = useState(externalWidth || 450);
  const [isResizing, setIsResizing] = useState(false);
  const [cachedDisciplineContext, setCachedDisciplineContext] = useState<string | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [useOnlyStipulatedFacts, setUseOnlyStipulatedFacts] = useState(true);
  
  // Use React Query for established facts
  const { 
    data: establishedFactsData, 
    isLoading: isLoadingFacts,
    isFetching: isRefetchingFacts,
    refetch: refreshEstablishedFacts
  } = useEstablishedFacts(grievanceId);
  
  const establishedFacts = establishedFactsData?.facts || null;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize AI chat session (only once per grievanceId)
  useEffect(() => {
    const initializeSession = async () => {
      // Guard: Don't create a new session if one already exists
      if (sessionId) {
        return;
      }

      try {
        const result = await createAiChatSession({
          chatType: 'GRIEVANCE_ANALYSIS',
          contextId: grievanceId,
          contextType: 'grievance'
        });

        if (result.success && result.sessionId) {
          setSessionId(result.sessionId);
        } else {
          console.error('Failed to create AI chat session:', result.error);
        }
      } catch (error) {
        console.error('Error initializing AI chat session:', error);
      }
    };

    initializeSession();
  }, [grievanceId, sessionId]);

  // Load cached discipline context if needed (separate effect)
  useEffect(() => {
    const loadDisciplineCache = async () => {
      // Check if this grievance needs discipline guidance
      const needsDiscipline = await shouldUseDisciplineGuidance(statement);
      if (!needsDiscipline) {
        console.log('This grievance does not need discipline guidance');
        return;
      }

      setIsLoadingCache(true);
      try {
        // First check if we have cached discipline context
        const cached = await getCachedDisciplineContext(grievanceId);

        if (cached) {
          console.log('Using cached discipline context for grievance:', grievanceId);
          setCachedDisciplineContext(cached.relevantSections);
        } else {
          // Extract and cache on first load (not on every message)
          console.log('Extracting discipline sections for caching...');
          const result = await extractAndCacheDisciplineSections(
            grievanceId,
            statement,
            articlesViolated ? [articlesViolated] : undefined
          );

          if (result.success && result.relevantSections) {
            console.log('Successfully cached discipline sections');
            setCachedDisciplineContext(result.relevantSections);
          }
        }
      } catch (error) {
        console.error('Error loading discipline cache:', error);
      } finally {
        setIsLoadingCache(false);
      }
    };

    loadDisciplineCache();
    // React Query automatically loads established facts
  }, [grievanceId, statement, articlesViolated]);

  // Sync external width changes
  useEffect(() => {
    if (externalWidth && externalWidth !== width) {
      setWidth(externalWidth);
    }
  }, [externalWidth, width]);

  // Resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    // Min width: 280px, Max width: 60% of screen
    const minWidth = 280;
    const maxWidth = window.innerWidth * 0.6;
    const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
    
    setWidth(constrainedWidth);
    onWidthChange?.(constrainedWidth);
  }, [isResizing, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const updateLoadingStatus = (status: string, loadingMessageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === loadingMessageId && msg.isLoading
          ? { ...msg, loadingStatus: status }
          : msg
      )
    );
  };



  const processEvidenceForLLM = async (evidenceArray: Evidence[]) => {
    const processedEvidence = await Promise.all(
      evidenceArray.map(async (e) => {
        let content = '';
        
        // First try to use stored extractedText, then fallback to extraction
        if (e.extractedText) {
          content = e.extractedText;
        } else if (e.type === 'File') {
          try {
            const extractedContent = await extractEvidencePdfContent(e.id);
            content = extractedContent || e.summary || 'Content could not be extracted';
          } catch (error) {
            console.error('Error extracting PDF content:', error);
            content = e.summary || 'Content could not be extracted';
          }
        } else {
          content = e.text || e.content || e.summary || '';
        }

        return {
          name: e.name,
          summary: e.summary,
          content: content,
          facts: e.facts
        };
      })
    );
    return processedEvidence;
  };

  const handlePrepareStepMeeting = async () => {
    setIsLoading(true);

    // Add a system message to show generation progress
    const generatingMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      loadingStatus: 'Generating step meeting preparation document...'
    };

    setMessages(prev => [...prev, generatingMessage]);

    try {
      // Generate the step meeting preparation document
      const result = await generateStepMeetingPreparation({
        grievanceId,
        statement,
        evidence,
        grievors,
        workInformation,
        articlesViolated: articlesViolated || '',
        settlementDesired: settlementDesired || '',
        organizationType,
        establishedFacts: establishedFacts || null,
        agreementId
      });

      if (!result.success || !result.pdfBase64) {
        throw new Error(result.error || 'Failed to generate preparation document');
      }

      // Convert base64 to blob and create download link
      const byteCharacters = atob(result.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Create a download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `step-meeting-preparation-${grievanceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL
      URL.revokeObjectURL(url);

      // Replace loading message with success message
      setMessages(prev => prev.slice(0, -1).concat([{
        id: generatingMessage.id,
        type: 'assistant',
        content: '✅ **Step meeting preparation document generated successfully!**\n\nThe document has been downloaded to your computer and includes:\n- Case analysis from your perspective\n- Key arguments to present\n- Anticipated opposition arguments\n- Strategic questions to ask\n- Evidence presentation strategy\n- Closing strategy and next steps',
        timestamp: new Date(),
        isLoading: false
      }]));

      toast({
        title: "Success",
        description: "Step meeting preparation document has been downloaded",
      });
    } catch (error) {
      console.error('Error generating step meeting preparation:', error);

      // Replace loading message with error message
      setMessages(prev => prev.slice(0, -1).concat([{
        id: generatingMessage.id,
        type: 'assistant',
        content: '❌ **Failed to generate step meeting preparation document**\n\n' + (error instanceof Error ? error.message : "An unknown error occurred. Please try again."),
        timestamp: new Date(),
        isLoading: false
      }]));

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate preparation document",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      loadingStatus: 'Analyzing your question...'
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // First, classify the user's question to determine what context is needed
      updateLoadingStatus('Analyzing your question...', loadingMessage.id);
      const classification = await classifyUserQuestion(input.trim());
      console.log('Question classification:', classification);

      // Process evidence for AI context (conditionally based on toggle)
      let processedEvidence: any[] = [];
      if (useOnlyStipulatedFacts) {
        if (establishedFacts) {
          updateLoadingStatus('Using stipulated facts only...', loadingMessage.id);
        } else {
          updateLoadingStatus('No stipulated facts available - please add facts first...', loadingMessage.id);
        }
        // Don't process any evidence - leave processedEvidence as empty array
      } else {
        updateLoadingStatus('Processing evidence...', loadingMessage.id);
        processedEvidence = await processEvidenceForLLM(evidence);
      }
      
      // Build basic context for AI
      const context = {
        statement: statement,
        evidence: processedEvidence, // This is empty when useOnlyStipulatedFacts=true
        grievors: grievors,
        workInformation: workInformation,
        articlesViolated: articlesViolated ? [articlesViolated] : [],
        settlementDesired: settlementDesired,
        organizationType: organizationType
      };

      let responseText = '';
      let disciplineContext = '';

      // Check if discipline cache should be refreshed due to newer stipulated facts
      let shouldRefreshCache = false;
      if (classification.needsDisciplineGuide && cachedDisciplineContext && establishedFacts) {
        try {
          // Get both cache info and full facts object with dates
          const [cacheInfo, factsObject] = await Promise.all([
            getCachedDisciplineContext(grievanceId),
            getEstablishedFacts(grievanceId)
          ]);
          
          if (cacheInfo && factsObject) {
            // Compare stipulated facts update time with cache creation time
            const factsUpdatedAt = new Date(factsObject.updatedAt);
            const cacheCreatedAt = new Date(cacheInfo.extractedAt);
            
            if (factsUpdatedAt > cacheCreatedAt) {
              shouldRefreshCache = true;
              console.log('Stipulated facts are newer than cache - refreshing discipline cache');
              console.log(`Facts updated: ${factsUpdatedAt.toISOString()}, Cache created: ${cacheCreatedAt.toISOString()}`);
            }
          }
        } catch (error) {
          console.error('Error checking cache freshness:', error);
        }
      }

      // Use cached discipline context if available, needed, and not stale
      if (classification.needsDisciplineGuide && cachedDisciplineContext && !shouldRefreshCache) {
        updateLoadingStatus('📚 Using cached Brown & Beatty guidance...', loadingMessage.id);
        console.log('Using cached discipline context');
        disciplineContext = `
DISCIPLINE GUIDANCE (Brown & Beatty - Canadian Employment Law):
${cachedDisciplineContext}`;
      } else if (classification.needsDisciplineGuide && (!cachedDisciplineContext || shouldRefreshCache)) {
        // Fetch and cache - either no cache exists or facts are newer
        const loadingMsg = shouldRefreshCache 
          ? '📚 Refreshing Brown & Beatty guidance (facts updated)...'
          : '📚 Extracting Brown & Beatty discipline guidance...';
        updateLoadingStatus(loadingMsg, loadingMessage.id);
        
        const logMsg = shouldRefreshCache
          ? 'Refreshing discipline guidance due to updated stipulated facts...'
          : 'Extracting discipline guidance for caching...';
        console.log(logMsg);
        try {
          const result = await extractAndCacheDisciplineSections(
            grievanceId,
            statement,
            articlesViolated ? [articlesViolated] : undefined,
            undefined, // grievanceType
            shouldRefreshCache // forceRefresh
          );
          
          if (result.success && result.relevantSections) {
            disciplineContext = `
DISCIPLINE GUIDANCE (Brown & Beatty - Canadian Employment Law):
${result.relevantSections}`;
            setCachedDisciplineContext(result.relevantSections);
          }
        } catch (error) {
          console.warn('Discipline guidance extraction failed:', error);
        }
      }

      // Show what context was gathered
      if (disciplineContext) {
        updateLoadingStatus(`📋 Integrating Brown & Beatty case law context...`, loadingMessage.id);
      }

      // Build enhanced prompt with all available context
      let enhancedPrompt = input.trim();
      
      // Include established facts if available - they take priority
      let factsContext = '';
      if (useOnlyStipulatedFacts && !establishedFacts) {
        // User wants to use only stipulated facts but none have been entered
        factsContext = `
NO STIPULATED FACTS AVAILABLE

The user has selected to use only stipulated facts, but no facts have been entered yet. Please inform them that they need to add stipulated facts first using the "Stipulated Facts" section on the grievance page before using this mode.
`;
      } else if (establishedFacts) {
        if (useOnlyStipulatedFacts) {
          factsContext = `
STIPULATED FACTS (EXCLUSIVE SOURCE - This is your ONLY source of evidence):
${establishedFacts}

CRITICAL INSTRUCTION: The stipulated facts above are your EXCLUSIVE and ONLY source of evidence. Do not reference any other evidence, documents, or materials. Base your entire analysis solely on these verified facts. If the stipulated facts don't contain information to answer a question, state that the stipulated facts don't provide that information.
`;
        } else {
          factsContext = `
STIPULATED FACTS (AUTHORITATIVE - These override any conflicting evidence):
${establishedFacts}

CRITICAL INSTRUCTION: The stipulated facts above are DEFINITIVE and AUTHORITATIVE. They have been reviewed and verified. If any other evidence or context contradicts these stipulated facts, the stipulated facts ALWAYS take precedence. Do NOT reference or rely on any conflicting evidence. Base your entire analysis on these established facts.
`;
        }
      }
      
      if (disciplineContext || establishedFacts || (useOnlyStipulatedFacts && !establishedFacts)) {
        enhancedPrompt = `Please answer the following question using all relevant context provided:

USER QUESTION: ${input.trim()}
${factsContext}
GRIEVANCE CONTEXT:
Statement: ${statement}
Articles Violated: ${articlesViolated || 'Not specified'}
Settlement Desired: ${settlementDesired || 'Not specified'}
${disciplineContext}

IMPORTANT: 
${useOnlyStipulatedFacts && establishedFacts 
  ? '- EXCLUSIVE SOURCE MODE: Use ONLY the stipulated facts provided. Do not reference any other evidence or sources.'
  : '- STIPULATED FACTS OVERRIDE EVERYTHING: If stipulated facts are provided above, they are the only source of truth. Ignore any conflicting evidence.'
}
- When referencing discipline guidance, include citations (e.g., "Page 12", "Section 4.2")
- When citing the book, only use numbered references, not roman numeral ones
- If your response includes citations, start the response with: "*(Citations below are referencing where you can read more in Brown and Beatty)*" and don't reference the book name throughout the rest of the response
- Connect all reference material directly to this specific grievance situation
- Provide practical, actionable insights based on the available information
- Always write "Employee" instead of "EE" and "Employer" instead of "ER"

Please provide a comprehensive answer that ${useOnlyStipulatedFacts && establishedFacts ? 'uses only the stipulated facts provided' : 'prioritizes stipulated facts above all other sources'}.`;
      }

      // Build conversation history for LLM context
      // Get all messages except the current loading message, and exclude the initial assistant greeting
      const conversationHistory = messages
        .filter(msg => !msg.isLoading && msg.id !== '1') // Exclude initial greeting and loading messages
        .map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
          timestamp: msg.timestamp.toISOString()
        }));

      // Generate AI response with enhanced context
      updateLoadingStatus('🤖 Generating AI response...', loadingMessage.id);
      const response = await generateAIContent(
        'custom',
        {
          ...context,  // Always send full context - Claude needs this every time
          question: enhancedPrompt,
          conversationHistory  // This provides continuity, not context removal
        }
      );

      responseText = typeof response === 'string' ? response : 
                    response?.answer || 
                    JSON.stringify(response);

      // Replace loading message with actual response
      const finalLoadingMessage = loadingMessage;
      setMessages(prev => 
        prev.map(msg => 
          msg.isLoading 
            ? { ...msg, content: responseText, isLoading: false }
            : msg
        )
      );

      // Log the interaction to the database
      if (sessionId) {
        try {
          const responseTime = Math.abs(Date.now() - parseInt(userMessage.id));
          console.log('Logging grievance AI chat interaction:', {
            sessionId,
            messageId: finalLoadingMessage.id,
            userMessage: userMessage.content,
            aiResponse: responseText?.substring(0, 100) + '...', // Log preview
            responseTime
          });
          
          await logAiInteraction({
            sessionId,
            messageId: finalLoadingMessage.id,
            userMessage: userMessage.content,
            aiResponse: responseText,
            promptUsed: `Grievance AI chat with discipline caching. Has cached: ${!!cachedDisciplineContext}. Needs discipline: ${classification.needsDisciplineGuide}. Reasoning: ${classification.reasoning}`,
            modelUsed: AI_MODEL_CONFIG.MODEL_NAME,
            responseTime,
          });
          
          console.log('Grievance AI chat interaction logged successfully');
        } catch (error) {
          console.error('Error logging AI interaction:', error);
          console.error('Error details:', error instanceof Error ? error.message : String(error));
        }
      } else {
        console.warn('No sessionId available for logging grievance AI chat interaction');
      }

    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Replace loading message with error
      setMessages(prev => 
        prev.map(msg => 
          msg.isLoading 
            ? { 
                ...msg, 
                content: 'I apologize, but I encountered an error processing your question. Please try again.', 
                isLoading: false 
              }
            : msg
        )
      );

      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      toast({
        title: "Copied!",
        description: "Response copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleReaction = async (messageId: string, reaction: 'up' | 'down') => {
    const currentReaction = messageReactions[messageId];
    const newReaction = currentReaction === reaction ? null : reaction;
    
    setMessageReactions(prev => ({
      ...prev,
      [messageId]: newReaction
    }));
    
    // Save feedback to database (only if there's an actual feedback to save)
    if (sessionId && newReaction) {
      try {
        await updateAiInteractionFeedback({
          sessionId,
          messageId,
          feedback: newReaction === 'up' ? 'POSITIVE' : 'NEGATIVE',
        });
      } catch (error) {
        console.error('Error updating feedback:', error);
        toast({
          title: "Error",
          description: "Failed to save feedback",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div
      className="h-full max-h-full relative flex overflow-hidden"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 bg-slate-200 hover:bg-slate-400 cursor-col-resize transition-colors duration-150 z-10 group",
          isResizing && "bg-slate-400"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 w-3 cursor-col-resize" />
        <div className="absolute inset-y-0 -right-1 w-3 cursor-col-resize" />
      </div>
      
      <div className="h-full max-h-full flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-lg border-l border-gray-200 flex flex-col h-full max-h-full">
          {/* Header */}
          <div className="border-b border-gray-100 flex-shrink-0">
            <div className="px-3 py-2 bg-slate-600">
              <h3 className="text-xs font-medium text-white">💬 AI Helper</h3>
            </div>
          </div>

          {/* Messages - Scrollable area */}
          <div
            ref={messagesContainerRef}
            className="overflow-y-auto scroll-smooth p-2 flex-1 min-h-0 max-h-full"
          >
            <div className="space-y-1.5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-1",
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
                      "max-w-[90%] rounded-md px-2 py-1.5 text-xs leading-relaxed",
                      message.type === 'user'
                        ? 'bg-slate-500 text-white'
                        : 'bg-gray-100 text-gray-900'
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
                      <div className="text-xs leading-relaxed">
                        {message.type === 'assistant' ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-1 last:mb-0 text-xs leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="mb-1 pl-3 space-y-0.5 text-xs list-disc">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-1 pl-4 space-y-0.5 text-xs list-decimal">{children}</ol>,
                              li: ({ children, ...props }) => {
                                return <li className="text-xs leading-relaxed" {...props}>{children}</li>;
                              },
                              strong: ({ children }) => <strong className="font-bold text-xs text-gray-900">{children}</strong>,
                              em: ({ children }) => <em className="italic text-xs">{children}</em>,
                              h1: ({ children }) => <h1 className="text-sm font-bold mb-1 mt-1 first:mt-0 text-gray-900 border-b border-gray-200 pb-0.5">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-xs font-bold mb-1 mt-1 first:mt-0 text-gray-900">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-xs font-semibold mb-0.5 mt-1 first:mt-0 text-gray-800">{children}</h3>,
                              code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono border">{children}</code>,
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-400 pl-1.5 py-0.5 my-1 italic text-xs bg-gray-50 rounded-r">{children}</blockquote>,
                              // Table support for legal content
                              table: ({ children }) => <table className="w-full text-xs border-collapse border border-gray-300 my-1">{children}</table>,
                              th: ({ children }) => <th className="border border-gray-300 px-1 py-0.5 bg-gray-100 font-semibold text-left text-xs">{children}</th>,
                              td: ({ children }) => <td className="border border-gray-300 px-1 py-0.5 text-xs">{children}</td>,
                            }}
                          >
                            {String(message.content || '')}
                          </ReactMarkdown>
                        ) : (
                          <p className="whitespace-pre-wrap text-xs leading-relaxed">{String(message.content || '')}</p>
                        )}
                      </div>
                    )}
                    
                    {message.type === 'assistant' && !message.isLoading && message.id !== '1' && (
                      <div className="flex justify-end gap-0.5 mt-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReaction(message.id, 'up')}
                          className={`h-4 px-1 text-gray-400 hover:text-green-600 ${
                            messageReactions[message.id] === 'up' ? 'text-green-600' : ''
                          }`}
                        >
                          <ThumbsUp className="h-2 w-2" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReaction(message.id, 'down')}
                          className={`h-4 px-1 text-gray-400 hover:text-red-600 ${
                            messageReactions[message.id] === 'down' ? 'text-red-600' : ''
                          }`}
                        >
                          <ThumbsDown className="h-2 w-2" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className="h-4 px-1 text-gray-400 hover:text-gray-600"
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="h-2 w-2" />
                          ) : (
                            <Copy className="h-2 w-2" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {message.type === 'user' && (
                    <div className="flex-shrink-0 w-4 h-4 bg-slate-500 rounded-full flex items-center justify-center mt-0.5">
                      <User className="h-2 w-2 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area - Always visible at bottom */}
          <div className="p-2 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            <div className="flex gap-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything..."
                className="min-h-[28px] max-h-[60px] resize-none text-xs"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="px-2 h-7"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            {/* Evidence Mode Toggle - Always show to allow manual facts entry */}
            <div className="flex items-center justify-between mt-1 p-1.5 bg-blue-50 rounded border">
              <span className={`text-xs font-medium ${!useOnlyStipulatedFacts ? 'text-blue-600' : 'text-gray-500'}`}>
                All Evidence
              </span>
              <Switch
                id="evidence-mode"
                checked={useOnlyStipulatedFacts}
                onCheckedChange={setUseOnlyStipulatedFacts}
                className="scale-75"
              />
              <span className={`text-xs font-medium ${useOnlyStipulatedFacts ? 'text-blue-600' : 'text-gray-500'}`}>
                Facts Only
              </span>
            </div>
            
            {/* Quick prompts */}
            <div className="flex flex-wrap gap-1 mt-1">
              {[
                "Assess",
                "Missing Facts",
                "Summary",
                "Prepare"
              ].map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (prompt === "Prepare") {
                      handlePrepareStepMeeting();
                    } else {
                      setInput(prompt === "Assess" ? "Review this case and consider who has the strongest position. Then, provide a breakdown of the strengths of the case from the Employer and the Union perspective" :
                                           prompt === "Missing Facts" ? "What additional facts should be gathered for this case?" :
                                           "Summarize all the evidence in this grievance");
                    }
                  }}
                  disabled={isLoading}
                  className="h-5 text-xs px-1.5 py-0"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}