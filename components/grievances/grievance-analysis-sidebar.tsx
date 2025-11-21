"use client";

import { useState, useRef, useEffect } from "react";
import {
  getAgreementResponse,
  processAgreementGrievanceInfo,
} from "@/app/actions/agreements";
import {
  generateAIContent,
  assessIssueRisk,
} from "@/app/actions/llm/analysis";
import {
  createAiChatSession,
  logAiInteraction,
} from "@/app/actions/ai-tracking";
import { AI_MODEL_CONFIG } from "@/app/actions/llm/models";
import { Button } from "@/components/ui/button";
import { Loader2, Copy } from "lucide-react";
import {
  AgreementSearchResult,
  WorkInformation,
  Grievor,
  Evidence,
} from "@/app/lib/definitions";
import { updateGrievanceField } from "@/app/actions/grievances";
import { extractEvidencePdfContent } from "@/app/actions/evidence";
import { useRouter } from "next/navigation";
import { merriweather } from "@/app/ui/fonts";
import factSchemas from "@/app/lib/fact-schemas.json";
import { analyzeIssueStatementForArticles } from "@/app/actions/llm/agreement-actions";
import { GrievanceStatus } from "@prisma/client";
import { useSession } from "@/lib/auth/use-auth-session";

interface ProcessedGrievanceInfo {
  filingPeriod: string;
  description: string;
  steps: Array<{
    stepNumber: number;
    description: string;
    timeLimit: string;
    requiredParticipants: string[];
    requiredDocuments: string[];
    notes?: string;
  }>;
}

interface GrievanceAnalysisSidebarProps {
  statement: string;
  agreementId: string;
  grievors: Grievor[];
  workInformation: WorkInformation;
  grievanceId: string;
  currentStatus: string;
  grievanceType: "individual" | "group" | "policy";
  organizationType?: "union" | "hr";
  onCopyToStatement: (text: string) => void;
  onCopyToSettlement: (text: string) => void;
  evidence?: Evidence[];
  articlesViolated?: string;
  settlementDesired?: string;
  width?: number;
  onWidthChange?: (width: number) => void;
  onSwitchToAI?: () => void;
}

// Configuration for button visibility based on status and organization type
const getButtonVisibility = (status: string) => {
  const config = {
    // Union-specific buttons
    "help-refine-statement": {
      union: status === "ACTIVE",
      hr: false,
    },
    // Universal buttons (available to both)
    "assess-risk": {
      union: true,
      hr: true,
    },
    "analyze-articles": {
      union: true,
      hr: false,
    },
    "find-violated-articles": {
      union: false,
      hr: true,
    },
    "process-info": {
      union: true,
      hr: true,
    },
    // Email generation (available based on organization and status)
    "email-generation": {
      union: status === "ACTIVE",
      hr: status === "ACTIVE",
    },
  };

  return config;
};

// Email type configurations
type EmailType = {
  id: string;
  label: string;
  description: string;
  aiType: string;
  colorScheme: "blue" | "green" | "red";
};

const getAvailableEmailTypes = (
  organizationType: string,
  status: string
): EmailType[] => {
  const emailTypes: Record<string, EmailType[]> = {
    union: [
      {
        id: "grievor-response",
        label: "Grievor Response Email",
        description:
          "Professional email explaining the decision not to proceed with the grievance",
        aiType: "email",
        colorScheme: "blue",
      },
    ],
    hr: [
      {
        id: "hr-allow",
        label: "HR Decision: Allow Grievance",
        description:
          "Professional email from HR to union allowing the grievance to proceed",
        aiType: "hr-allow",
        colorScheme: "green",
      },
      {
        id: "hr-deny",
        label: "HR Decision: Deny Grievance",
        description:
          "Professional email from HR to union denying the grievance",
        aiType: "hr-deny",
        colorScheme: "red",
      },
      {
        id: "hr-clarify-articles",
        label: "Clarify Violated Articles",
        description:
          "Professional email from HR requesting clarification on which specific articles were violated",
        aiType: "hr-clarify-articles",
        colorScheme: "blue",
      },
    ],
  };

  return emailTypes[organizationType] || [];
};

export default function GrievanceAnalysisSidebar({
  statement,
  agreementId,
  grievors,
  workInformation,
  grievanceId,
  currentStatus,
  grievanceType,
  organizationType = "union",
  onCopyToStatement,
  onCopyToSettlement,
  evidence = [],
  articlesViolated = "",
  settlementDesired = "",
  width: externalWidth,
  onWidthChange,
  onSwitchToAI,
}: GrievanceAnalysisSidebarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedArticles, setSuggestedArticles] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<AgreementSearchResult[]>(
    []
  );
  const [analysis, setAnalysis] = useState<string>("");
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [statementImprovement, setStatementImprovement] = useState<{
    suggestions: string;
    newStatement: string;
    settlement: string;
  } | null>(null);
  const [activeMode, setActiveMode] = useState<
    | "statement"
    | "risk"
    | "articles"
    | "process"
    | "filing"
    | "custom"
    | "email"
    | "hr-allow"
    | "hr-deny"
    | "hr-clarify-articles"
    | "facts"
    | "missing-facts"
    | string
    | null
  >(null);
  const [editedStatement, setEditedStatement] = useState<string>("");
  const [editedSettlement, setEditedSettlement] = useState<string>("");
  const [grievanceInfo, setGrievanceInfo] =
    useState<ProcessedGrievanceInfo | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<{
    informationConsidered: string;
    riskFactors: string[];
    potentialOutcome: string;
  } | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [customAnswer, setCustomAnswer] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const width = externalWidth || 384;
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(40);
  const router = useRouter();
  const [emailResponse, setEmailResponse] = useState<{
    reasons: string[];
    emailContent: string;
  } | null>(null);
  const [hrEmailResponse, setHrEmailResponse] = useState<{
    decision: "allow" | "deny";
    reasons: string[];
    emailContent: string;
  } | null>(null);
  const { data: session } = useSession();

  // Remove tab management - only emails now

  // Email generation state
  const [selectedEmailType, setSelectedEmailType] = useState<string>("");
  const [emailInstructions, setEmailInstructions] = useState<string>("");
  const [currentEmailResponse, setCurrentEmailResponse] = useState<{
    type: string;
    response: {
      reasons: string[];
      emailContent: string;
      decision?: "allow" | "deny";
    };
  } | null>(null);
  const [violatedArticlesResults, setViolatedArticlesResults] = useState<
    AgreementSearchResult[]
  >([]);
  const [statementOfFacts, setStatementOfFacts] = useState<string | null>(null);

  // Add this new state
  const [missingFactsAnalysis, setMissingFactsAnalysis] = useState<{
    availableFacts: Array<{
      fact: string;
      value: string;
      context?: string;
      sources: string[];
      hasConflicts: boolean;
      conflictExplanation?: string;
    }>;
    missingFacts: string[];
  } | null>(null);

  // Check if we have ALL the required data loaded properly
  const isDataLoaded = !!(
    (currentStatus &&
      organizationType &&
      grievanceId &&
      agreementId &&
      // Ensure organization type is not just the default prop value
      organizationType !== "union") ||
    (organizationType === "union" && session?.user?.organization)
  );

  // Only get button visibility if data is loaded
  const buttonVisibility = isDataLoaded
    ? getButtonVisibility(currentStatus)
    : {
        "help-refine-statement": { union: false, hr: false },
        "assess-risk": { union: false, hr: false },
        "analyze-articles": { union: false, hr: false },
        "find-violated-articles": { union: false, hr: false },
        "process-info": { union: false, hr: false },
        "email-generation": { union: false, hr: false },
      };
  const availableEmailTypes: EmailType[] = isDataLoaded
    ? getAvailableEmailTypes(organizationType, currentStatus)
    : [];

  // Improved resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection while dragging
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;

    // Add event listeners to window for better drag handling
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Add a class to body to prevent text selection during drag
    document.body.classList.add("cursor-col-resize", "select-none");
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;

    // Calculate new width from the right edge
    const newWidth = window.innerWidth - e.clientX;
    // Min width: 280px, Max width: 60% of screen
    const minWidth = 280;
    const maxWidth = window.innerWidth * 0.6;
    const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      onWidthChange?.(constrainedWidth);
    });
  };

  const handleMouseUp = () => {
    if (!isResizing.current) return;

    isResizing.current = false;
    // Remove event listeners
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    // Remove cursor class
    document.body.classList.remove("cursor-col-resize", "select-none");
  };

  useEffect(() => {
    // Initialize AI chat session only if one doesn't already exist
    const initializeSession = async () => {

      if (sessionId) {
        return;
      }

      try {
        const result = await createAiChatSession({
          chatType: "GRIEVANCE_ANALYSIS",
          contextId: grievanceId,
          contextType: "grievance",
        });

        if (result.success && result.sessionId) {
          setSessionId(result.sessionId);
        } else {
          console.error("Failed to create AI chat session:", result.error);
        }
      } catch (error) {
        console.error("Error initializing AI chat session:", error);
      }
    };

    initializeSession();

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("cursor-col-resize", "select-none");
    };
  }, [grievanceId, sessionId]);

  // Helper function to log AI interactions
  const logInteraction = async (
    prompt: string,
    response: string,
    action: string
  ) => {
    if (sessionId) {
      try {
        const startTime = Date.now();
        await logAiInteraction({
          sessionId,
          messageId: `${Date.now()}-${action}`,
          userMessage: prompt,
          aiResponse: response,
          promptUsed: `Grievance analysis: ${action}`,
          modelUsed: AI_MODEL_CONFIG.MODEL_NAME,
          responseTime: Date.now() - startTime,
        });
        console.log(`Logged ${action} interaction successfully`);
      } catch (error) {
        console.error(`Error logging ${action} interaction:`, error);
      }
    }
  };

  // Width is now controlled externally - no need to sync

  const handleAnalyzeArticles = async () => {
    setIsLoading(true);
    setActiveMode("articles");
    try {
      // First get suggested articles
      const articles = await analyzeIssueStatementForArticles(statement);
      setSuggestedArticles(articles);
      setSearchResults([]);
      setAnalysis("");
      setSelectedArticle(null);
      setStatementImprovement(null);

      // Log the interaction
      await logInteraction(
        `Analyze grievance statement for articles: "${statement}"`,
        `Suggested articles: ${articles.join(", ")}`,
        "analyze-articles"
      );
    } catch (error) {
      console.error("Failed to analyze grievance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArticleClick = async (article: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setSelectedArticle(article);
    try {
      const question = `Based on this grievance statement and the specific article "${article}", provide a detailed analysis with the following structure:

1. Relevant Agreement Text:
   - Quote the specific sections of the article that are most relevant
   - Include the exact wording from the agreement

2. Factual Analysis:
   - List the specific facts from the grievance statement that relate to these sections
   - Use direct quotes from the statement where possible

3. Potential Violation:
   - Explain how the facts might violate the quoted agreement sections
   - Focus on the specific language of the agreement
   - Avoid speculation or interpretation beyond what's directly stated

4. Supporting Evidence:
   - Quote any additional agreement sections that provide context
   - Include any relevant definitions or interpretations from the agreement

Please use direct quotes from both the agreement and the grievance statement to support your analysis.

Grievance Statement:
${statement}`;

      const result = await getAgreementResponse(question, agreementId);
      setSearchResults(result.searchResults);
      setAnalysis(result.llmAnswer);
    } catch (error) {
      console.error("Failed to analyze article:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImproveStatement = async () => {
    setIsLoading(true);
    setActiveMode("statement");
    try {
      const processedEvidence = await processEvidenceForLLM(evidence || []);
      const result = await generateAIContent("statement", {
        grievors: grievors.map((g) => ({
          firstName: g.firstName,
          lastName: g.lastName,
        })),
        workInformation,
        statement,
        evidence: processedEvidence,
      });

      if (
        result &&
        "suggestions" in result &&
        "newStatement" in result &&
        "settlement" in result
      ) {
        const { suggestions, newStatement, settlement } = result;
        setStatementImprovement({
          suggestions: typeof suggestions === "string" ? suggestions : "",
          newStatement: typeof newStatement === "string" ? newStatement : "",
          settlement: typeof settlement === "string" ? settlement : "",
        });
        setEditedStatement(
          typeof newStatement === "string" ? newStatement : ""
        );
        setEditedSettlement(typeof settlement === "string" ? settlement : "");
      } else {
        setStatementImprovement(null);
        setEditedStatement("");
        setEditedSettlement("");
      }
      setSearchResults([]);
      setAnalysis("");
      setSuggestedArticles([]);
      setSelectedArticle(null);
    } catch (error) {
      console.error("Failed to improve statement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeProcess = async () => {
    setIsLoading(true);
    setActiveMode("process");
    try {
      const result = await processAgreementGrievanceInfo(agreementId);
      // Use the correct grievance type from the result
      const processInfo = {
        filingPeriod: result.filingPeriod,
        steps: result[`${grievanceType}Grievance`].steps,
        description: result[`${grievanceType}Grievance`].description,
      } as ProcessedGrievanceInfo;
      setGrievanceInfo(processInfo);
      setSearchResults([]);
      setAnalysis("");
      setSuggestedArticles([]);
      setSelectedArticle(null);
      setStatementImprovement(null);
    } catch (error) {
      console.error("Failed to analyze process:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessFilingInfo = async () => {
    setIsLoading(true);
    setActiveMode("filing");
    try {
      const result = await processAgreementGrievanceInfo(agreementId);
      // Use the correct grievance type from the result
      const processInfo = {
        filingPeriod: result.filingPeriod,
        steps: result[`${grievanceType}Grievance`].steps,
        description: result[`${grievanceType}Grievance`].description,
      } as ProcessedGrievanceInfo;
      setGrievanceInfo(processInfo);
      setSearchResults([]);
      setAnalysis("");
      setSuggestedArticles([]);
      setSelectedArticle(null);
      setStatementImprovement(null);
    } catch (error) {
      console.error("Failed to process filing info:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to extract PDF content
  const extractPdfContent = async (
    evidenceItem: Evidence
  ): Promise<string | null> => {
    if (
      evidenceItem.type !== "File" ||
      !evidenceItem.source?.toLowerCase().endsWith(".pdf")
    ) {
      return (
        evidenceItem.content ||
        evidenceItem.text ||
        evidenceItem.fileContent ||
        null
      );
    }

    try {
      return await extractEvidencePdfContent(evidenceItem.id);
    } catch (error) {
      console.error("Error extracting PDF content:", error);
      return null;
    }
  };

  // Helper function to process evidence with PDF extraction
  const processEvidenceForLLM = async (evidenceArray: Evidence[]) => {
    const processedEvidence = await Promise.all(
      evidenceArray.map(async (e) => {
        const content = await extractPdfContent(e);
        return {
          name: e.name,
          summary: e.summary,
          content: content,
          facts: e.facts,
        };
      })
    );
    return processedEvidence;
  };

  const handleAssessRisk = async () => {
    setIsLoading(true);
    setActiveMode("risk");
    try {
      const processedEvidence = await processEvidenceForLLM(evidence);
      const result = await assessIssueRisk({
        statement,
        articlesViolated: articlesViolated ? [articlesViolated] : [],
        settlementDesired,
        evidence: processedEvidence,
        grievors,
        workInformation,
      });
      setRiskAssessment(result);
      setSearchResults([]);
      setAnalysis("");
      setSuggestedArticles([]);
      setSelectedArticle(null);
      setStatementImprovement(null);

      // Log the interaction
      await logInteraction(
        `Risk assessment for grievance: "${statement}"`,
        `Risk factors: ${result.riskFactors.join(", ")}. Potential outcome: ${result.potentialOutcome}`,
        "risk-assessment"
      );
    } catch (error) {
      console.error("Failed to assess risk:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToField = (
    field: "statement" | "settlementDesired",
    value: string
  ) => {
    if (field === "statement") {
      onCopyToStatement(value);
    } else if (field === "settlementDesired") {
      onCopyToSettlement(value);
    }
  };

  const handleSaveField = async (
    field: "statement" | "settlementDesired",
    value: string
  ) => {
    try {
      await updateGrievanceField(grievanceId, field, value);
      router.refresh();
    } catch (error) {
      console.error("Failed to save field:", error);
    }
  };

  const handleCustomQuestion = async () => {
    if (!customQuestion.trim()) return;

    setIsLoading(true);
    setActiveMode("custom");
    try {
      const processedEvidence = await processEvidenceForLLM(evidence);
      const response = await generateAIContent("custom", {
        grievors,
        workInformation,
        question: customQuestion,
        statement,
        articlesViolated: articlesViolated ? [articlesViolated] : [],
        settlementDesired,
        evidence: processedEvidence,
      });

      if (response.answer) {
        setCustomAnswer(response.answer);
        // Log the interaction
        await logInteraction(
          customQuestion,
          response.answer,
          "custom-question"
        );
      } else {
        setCustomAnswer(
          "Sorry, I was unable to generate an answer. Please try rephrasing your question."
        );
      }
    } catch (error) {
      console.error("Error generating answer:", error);
      setCustomAnswer(
        "Sorry, I encountered an error while processing your question. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Email generation handlers for the new component
  const handleGenerateGrievorEmail = async (instructions: string) => {
    setActiveMode("email");
    try {
      const processedEvidence = await processEvidenceForLLM(evidence);
      const result = await generateAIContent("email", {
        grievors,
        workInformation,
        statement,
        articlesViolated: articlesViolated ? [articlesViolated] : [],
        settlementDesired,
        evidence: processedEvidence,
      });

      if (result.emailResponse) {
        setEmailResponse(result.emailResponse);
      } else {
        setEmailResponse({
          reasons: ["Unable to generate specific reasons at this time."],
          emailContent: "Unable to generate email content. Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to generate email response:", error);
      setEmailResponse({
        reasons: ["An error occurred while generating the response."],
        emailContent:
          "Unable to generate email content due to an error. Please try again.",
      });
    }
  };

  const handleGenerateHREmail = async (
    decision: "allow" | "deny",
    instructions: string
  ) => {
    setActiveMode(decision === "allow" ? "hr-allow" : "hr-deny");
    try {
      const result = await generateAIContent(
        decision === "allow" ? "hr-allow" : "hr-deny",
        {
          grievors: grievors.map((g) => ({
            firstName: g.firstName,
            lastName: g.lastName,
          })),
          workInformation,
          statement,
          articlesViolated: articlesViolated ? [articlesViolated] : [],
          settlementDesired,
          evidence: (evidence || []).map((e) => ({
            name: e.name,
            summary: e.summary,
            content: e.content || e.text || e.fileContent || null,
            facts: e.facts,
          })),
          hrRepName: session?.user?.name || "HR Representative",
          hrInstructions: instructions || undefined,
        }
      );

      if (result.hrEmailResponse) {
        setHrEmailResponse({
          ...result.hrEmailResponse,
          decision,
        });
      } else {
        setHrEmailResponse({
          decision,
          reasons: ["Unable to generate specific reasons at this time."],
          emailContent: "Unable to generate email content. Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to generate HR email response:", error);
      setHrEmailResponse({
        decision,
        reasons: ["An error occurred while generating the response."],
        emailContent:
          "Unable to generate email content due to an error. Please try again.",
      });
    }
  };

  // Unified email generation handler
  const handleGenerateEmail = async (
    emailTypeId: string,
    instructions: string
  ) => {
    const emailType = availableEmailTypes.find((et) => et.id === emailTypeId);
    if (!emailType) return;

    setIsLoading(true);
    const mode = emailType.aiType as
      | "email"
      | "hr-allow"
      | "hr-deny"
      | "hr-clarify-articles";
    setActiveMode(mode);

    try {
      const processedEvidence = await processEvidenceForLLM(evidence || []);

      let result;

      if (mode === "hr-clarify-articles") {
        // Handle article clarification email
        const clarificationPrompt = `As an HR representative, write a professional email to the union requesting clarification on the specific articles that were allegedly violated in this grievance. The email should be neutral and focused solely on gathering more information to better understand the grievance.

Context:
- Grievance statement: ${statement}
- Articles mentioned as violated: ${articlesViolated || "Not clearly specified"}
- HR representative: ${session?.user?.name || "HR Representative"}

Additional instructions: ${instructions || "Request specific clarification on which articles were violated and how."}

The email should:
1. Be professional and neutral in tone
2. Request specific clarification on which articles were violated
3. Ask for details on how these articles were allegedly violated
4. NOT make any decisions about allowing or denying the grievance
5. Focus purely on information gathering`;

        result = await generateAIContent("custom", {
          grievors,
          workInformation,
          statement,
          articlesViolated: articlesViolated ? [articlesViolated] : [],
          settlementDesired,
          evidence: processedEvidence,
          question: clarificationPrompt,
        });

        if (result.answer) {
          setCurrentEmailResponse({
            type: emailTypeId,
            response: {
              reasons: ["Requesting clarification on violated articles"],
              emailContent: result.answer,
            },
          });
        }
      } else {
        // Handle all other email types
        result = await generateAIContent(mode, {
          grievors,
          workInformation,
          statement,
          articlesViolated: articlesViolated ? [articlesViolated] : [],
          settlementDesired,
          evidence: processedEvidence,
          hrRepName: session?.user?.name || "HR Representative",
          hrInstructions: instructions || undefined,
        });

        // Handle the response based on the email type
        if (
          mode === "email" &&
          "emailResponse" in result &&
          result.emailResponse
        ) {
          const { reasons, emailContent } = result.emailResponse;
          setCurrentEmailResponse({
            type: emailTypeId,
            response: {
              reasons: Array.isArray(reasons)
                ? reasons
                : ["Unable to generate specific reasons"],
              emailContent:
                typeof emailContent === "string"
                  ? emailContent
                  : "Unable to generate email content",
            },
          });
        } else if (
          (mode === "hr-allow" || mode === "hr-deny") &&
          "hrEmailResponse" in result &&
          result.hrEmailResponse
        ) {
          const { reasons, emailContent } = result.hrEmailResponse;
          setCurrentEmailResponse({
            type: emailTypeId,
            response: {
              reasons: Array.isArray(reasons)
                ? reasons
                : ["Unable to generate specific reasons"],
              emailContent:
                typeof emailContent === "string"
                  ? emailContent
                  : "Unable to generate email content",
              decision: mode === "hr-allow" ? "allow" : "deny",
            },
          });
        } else {
          throw new Error("Invalid response format from email generation");
        }
      }
    } catch (error) {
      console.error("Failed to generate email:", error);
      setCurrentEmailResponse({
        type: emailTypeId,
        response: {
          reasons: ["An error occurred while generating the response."],
          emailContent:
            "Unable to generate email content due to an error. Please try again.",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindViolatedArticles = async () => {
    if (!articlesViolated.trim()) {
      return;
    }

    setIsLoading(true);
    setActiveMode("find-violated-articles");
    try {
      // Use the exact same question format that works on the agreement page
      const question = `What does ${articlesViolated} say?`;
      const formattingPrompt =
        "Please return an itemized list such that a legal representative could use this to understand the violation. Use bullets within each section with the section number and title. Don't add any other text but also don't cut any text off. Don't start with 'Here is the list of sections that were violated:' or anything like that. Just return the list.";

      const result = await getAgreementResponse(
        question,
        agreementId,
        formattingPrompt
      );
      setViolatedArticlesResults(result.searchResults);
      setAnalysis(result.llmAnswer);
      setSuggestedArticles([]);
      setSelectedArticle(null);
      setStatementImprovement(null);
    } catch (error) {
      console.error("Failed to find violated articles:", error);
      setAnalysis(
        "Unable to search for violated articles. Please try again or check if the article references are clear."
      );
      setViolatedArticlesResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStatementOfFacts = async () => {
    setIsLoading(true);
    setActiveMode("facts");
    try {
      const processedEvidence = await processEvidenceForLLM(evidence);
      const result = await generateAIContent("statement-of-facts", {
        grievors,
        workInformation,
        statement,
        articlesViolated: articlesViolated ? [articlesViolated] : [],
        settlementDesired,
        evidence: processedEvidence,
      });

      if (result.statementOfFacts) {
        setStatementOfFacts(result.statementOfFacts);
      } else {
        setStatementOfFacts(
          "Unable to generate statement of facts. Please try again."
        );
      }
    } catch (error) {
      console.error("Failed to generate statement of facts:", error);
      setStatementOfFacts(
        "An error occurred while generating the statement of facts. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentifyMissingFacts = async () => {
    setIsLoading(true);
    setActiveMode("missing-facts");
    try {
      // Get the absenteeism facts schema
      const absenteeismFacts = Object.entries(
        factSchemas.absenteeism.facts
      ).map(([key, value]) => ({
        key,
        display: value.display,
        question: value.question,
      }));

      // First collect all facts and their contexts from evidence
      const factContexts: Record<
        string,
        Array<{
          value: string;
          context?: string;
          source: string;
        }>
      > = {};

      // Process each piece of evidence to get its facts
      for (const ev of evidence) {
        if (ev.facts && ev.facts.size > 0) {
          const factsObj = Object.fromEntries(ev.facts);

          Object.entries(factsObj).forEach(([key, value]) => {
            if (!key.endsWith("_context") && value !== "NA") {
              const factDisplay = absenteeismFacts.find(
                (f) => f.key === key
              )?.display;
              if (factDisplay) {
                if (!factContexts[factDisplay]) {
                  factContexts[factDisplay] = [];
                }
                factContexts[factDisplay].push({
                  value: value as string,
                  context: factsObj[`${key}_context`] || undefined,
                  source: ev.name,
                });
              }
            }
          });
        }
      }

      // Use LLM to analyze contexts and select the best one for each fact
      const analyzedFacts: Array<{
        fact: string;
        value: string;
        context?: string;
        sources: string[];
        hasConflicts: boolean;
        conflictExplanation?: string;
      }> = [];

      // Process each fact's contexts
      for (const [fact, contexts] of Object.entries(factContexts)) {
        if (contexts.length > 0) {
          // If we have multiple contexts, use LLM to analyze them
          if (contexts.length > 1) {
            const prompt = `Analyze the following contexts for the fact "${fact}" and determine the best context to use. If there are conflicts, note them.

Contexts from different sources:
${contexts
  .map(
    (c, i) => `
Source ${i + 1} (${c.source}):
Value: ${c.value}
Context: ${c.context || "No context provided"}
`
  )
  .join("\n")}

You must return a valid JSON object with the following structure:
{
  "bestValue": "The most reliable value from the sources (Yes/No/NA)",
  "bestContext": "The most complete and reliable context from the sources",
  "hasConflicts": true/false,
  "conflictExplanation": "Explanation of any conflicts found, or null if none"
}

Important: 
- Return ONLY the JSON object, no markdown formatting
- Ensure all fields are present
- Use the most reliable source for bestValue and bestContext
- If sources conflict, set hasConflicts to true and explain in conflictExplanation`;

            try {
              const result = await generateAIContent("custom", {
                question: prompt,
                grievors,
                workInformation,
                statement,
                articlesViolated: articlesViolated ? [articlesViolated] : [],
                settlementDesired,
                evidence: [],
              });

              if (result.answer) {
                // Extract JSON from markdown code block if present
                const jsonMatch = result.answer.match(
                  /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
                );
                const jsonStr = jsonMatch ? jsonMatch[1] : result.answer;

                // Additional validation for empty or malformed responses
                if (
                  !jsonStr ||
                  jsonStr.trim() === "" ||
                  jsonStr.trim() === "{}"
                ) {
                  throw new Error("Empty or invalid JSON response from LLM");
                }

                try {
                  const analysis = JSON.parse(jsonStr);

                  // Validate that the analysis object has the required properties
                  if (
                    !analysis ||
                    typeof analysis !== "object" ||
                    Object.keys(analysis).length === 0
                  ) {
                    throw new Error("Empty or invalid analysis object");
                  }

                  // Ensure required fields exist with fallbacks
                  const bestValue = analysis.bestValue || contexts[0].value;
                  const bestContext =
                    analysis.bestContext ||
                    contexts[0].context ||
                    "No context available";
                  const hasConflicts = analysis.hasConflicts || false;
                  const conflictExplanation =
                    analysis.conflictExplanation || null;

                  analyzedFacts.push({
                    fact,
                    value: bestValue,
                    context: bestContext,
                    sources: contexts.map((c) => c.source),
                    hasConflicts,
                    conflictExplanation,
                  });
                } catch (parseError) {
                  console.error("Error parsing LLM response for fact:", fact, {
                    originalResponse: result.answer,
                    extractedJson: jsonStr,
                    error: parseError,
                  });
                  // Fallback to using the first context if parsing fails
                  analyzedFacts.push({
                    fact,
                    value: contexts[0].value,
                    context: contexts[0].context || "No context available",
                    sources: contexts.map((c) => c.source),
                    hasConflicts: true,
                    conflictExplanation:
                      "Error parsing context analysis - showing first available context",
                  });
                }
              } else {
                // Handle case where LLM returns no answer
                throw new Error("No response received from LLM");
              }
            } catch (error) {
              console.error("Error analyzing contexts for fact:", fact, error);
              // Fallback to using the first context if LLM analysis fails
              analyzedFacts.push({
                fact,
                value: contexts[0].value,
                context: contexts[0].context || "No context available",
                sources: contexts.map((c) => c.source),
                hasConflicts: true,
                conflictExplanation:
                  "Error analyzing contexts - showing first available context",
              });
            }
          } else {
            // If only one context, use it directly
            analyzedFacts.push({
              fact,
              value: contexts[0].value,
              context: contexts[0].context,
              sources: [contexts[0].source],
              hasConflicts: false,
            });
          }
        }
      }

      // Find missing facts by comparing against schema
      const missingFacts = absenteeismFacts
        .filter((fact) => !analyzedFacts.some((af) => af.fact === fact.display))
        .map((fact) => fact.display);

      setMissingFactsAnalysis({
        availableFacts: analyzedFacts,
        missingFacts,
      });

      setSearchResults([]);
      setAnalysis("");
      setSuggestedArticles([]);
      setSelectedArticle(null);
      setStatementImprovement(null);
    } catch (error) {
      console.error("Failed to identify missing facts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canUseAnalysis = () => {
    if (!currentStatus) return false;

    switch (organizationType) {
      case "union":
        return currentStatus === ("ACTIVE" as GrievanceStatus);
      case "hr":
        return currentStatus === ("ACTIVE" as GrievanceStatus);
      default:
        return false;
    }
  };

  // Component JSX starts here
  return (
    <div
      ref={sidebarRef}
      className="h-full relative flex"
      style={{ width: `${width}px` }}
    >
      {/* Drag handle on the left side */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 hover:bg-slate-400 cursor-col-resize transition-colors duration-150 z-10 group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 w-3 cursor-col-resize" />
        <div className="absolute inset-y-0 -right-1 w-3 cursor-col-resize" />
      </div>

      <div className="h-full px-6 py-4 flex-1 flex flex-col">
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col h-full">
          {/* Header with tabs */}
          <div className="border-b border-gray-100">
            <div className="flex">
              <button
                onClick={() => onSwitchToAI?.()}
                className="flex-1 px-3 py-2 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 border-b border-gray-300 transition-colors"
              >
                💬 AI Assistant
              </button>
              <button
                onClick={() => onWidthChange?.(width)} // Trigger to stay on current tab
                className="flex-1 px-3 py-2 text-xs font-semibold bg-slate-600 text-white border-b-2 border-slate-700 shadow-sm"
              >
                📧 Draft Emails
              </button>
            </div>
            <div className="px-3 py-2 bg-slate-50">
              <p className="text-xs text-gray-600">
                Generate professional emails for grievance communication
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-3" style={{ height: "600px" }}>
            {!agreementId ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Agreement Required
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Please choose a collective agreement to enable AI features
                  </p>
                </div>
              </div>
            ) : !isDataLoaded ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Loading...
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Preparing AI assistant
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Email Content */}
                <div className="p-3 flex-1">
                  {/* Email Generation */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Email Type
                        </label>
                        <select
                          value={selectedEmailType || ""}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setSelectedEmailType(e.target.value || "")
                          }
                          className="w-full text-xs border-gray-200 rounded focus:ring-slate-500 focus:border-slate-500"
                        >
                          <option value="">Choose email type...</option>
                          {availableEmailTypes.map((emailType) => (
                            <option key={emailType.id} value={emailType.id}>
                              {emailType.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedEmailType && (
                        <>
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <p className="text-xs text-slate-700">
                              {
                                availableEmailTypes.find(
                                  (et) => et.id === selectedEmailType
                                )?.description
                              }
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Additional Instructions (Optional)
                            </label>
                            <textarea
                              value={emailInstructions || ""}
                              onChange={(
                                e: React.ChangeEvent<HTMLTextAreaElement>
                              ) => setEmailInstructions(e.target.value || "")}
                              placeholder="Optional instructions for email generation..."
                              className="w-full h-16 p-2 text-xs border border-gray-200 rounded focus:ring-slate-500 focus:border-slate-500 resize-none"
                            />
                          </div>

                          <Button
                            onClick={() =>
                              handleGenerateEmail(
                                selectedEmailType,
                                emailInstructions
                              )
                            }
                            disabled={isLoading}
                            size="sm"
                            className="w-full h-8 text-xs"
                          >
                            {isLoading ? (
                              <div className="flex items-center gap-1.5">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="text-xs">Generating...</span>
                              </div>
                            ) : (
                              <span className="text-xs">{`Generate ${availableEmailTypes.find((et) => et.id === selectedEmailType)?.label}`}</span>
                            )}
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Email Results */}
                    {currentEmailResponse && (
                      <div className="mt-4 space-y-2">
                        <div className="bg-gray-50 p-2 rounded border border-gray-200">
                          <h3 className="text-xs font-medium text-gray-700">
                            {availableEmailTypes.find(
                              (et) => et.id === currentEmailResponse.type
                            )?.label || "Generated Email"}
                          </h3>
                        </div>

                        {currentEmailResponse.response.reasons && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-1">
                              Key Points
                            </h4>
                            <div className="bg-white p-2 rounded border border-gray-200">
                              <ul
                                className={`list-disc list-inside space-y-1 text-xs text-gray-700 whitespace-pre-wrap ${merriweather.className}`}
                              >
                                {currentEmailResponse.response.reasons.map(
                                  (reason: string, index: number) => (
                                    <li key={index}>{reason}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-xs font-medium text-gray-700">
                              Email Content
                            </h4>
                            <Button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  currentEmailResponse.response.emailContent
                                );
                              }}
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1 h-6 px-2 text-xs"
                            >
                              <Copy className="h-2.5 w-2.5" />
                              <span className="text-xs">Copy</span>
                            </Button>
                          </div>
                          <div className="bg-white p-2 rounded border border-gray-200">
                            <div
                              className={`prose prose-sm max-w-none text-xs text-gray-700 whitespace-pre-wrap leading-relaxed ${merriweather.className}`}
                            >
                              {currentEmailResponse.response.emailContent}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
