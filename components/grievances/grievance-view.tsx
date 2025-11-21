"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatSmartDate } from "@/lib/utils";
import {
  Grievor,
  GrievanceListItem,
  Evidence,
  Agreement,
  GrievanceStepOutcome,
  GrievanceDetail,
  getSessionOrganizationType,
  AgreementStepTemplate,
  EstablishedFacts,
} from "@/app/lib/definitions";
import {
  GrievanceStep,
  GrievanceStatus,
} from "@prisma/client";
import GrievanceAnalysisSidebar from "@/components/grievances/grievance-analysis-sidebar";
import GrievanceAIChat from "@/components/grievances/grievance-ai-chat";
import { updateGrievanceCost } from "@/app/actions/grievances";
import { Notification } from "@/components/ui/notification";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import TimelineModal from "@/app/ui/product/agreements/timeline-modal";

import WithdrawalForm from "@/components/grievances/withdrawal-form";
import SettlementForm from "@/components/grievances/settlement-form";
import NextStepForm from "@/components/grievances/next-step-form";
import CostManagementModal from "@/components/grievances/cost-management-modal";
import PrecedentTab from "@/components/grievances/tabs/precedent-tab";
import NotesTab from "@/components/grievances/tabs/notes-tab";
import { GrievanceNote } from "@/components/grievances/grievance-notes";
import EvidenceTab from "@/components/grievances/tabs/evidence-tab";
import EmailsTab from "@/components/grievances/tabs/emails-tab";
import AgreementTab from "@/components/grievances/tabs/agreement-tab";
import DecisionsTab from "@/components/grievances/tabs/decisions-tab";
import OverviewTab from "@/components/grievances/tabs/overview-tab";
import { useSession } from "@/lib/auth/use-auth-session";
import { useAuthWithViewMode } from "@/app/hooks/useAuth";
import { PrintGrievanceModal } from "@/components/pdf/print-grievance-modal";
import { storageClient } from "@/app/client/services/storage-client";

interface GrievanceViewProps {
  id: string;
  grievance: GrievanceDetail;
  grievanceDetails: GrievanceListItem;
  evidence: Evidence[];
  agreements: Agreement[];
  currentAgreement: Agreement | null;
  records: GrievanceStepOutcome[];
  currentStep?: GrievanceStep | null;
  availableSteps?: AgreementStepTemplate[];
  aiSummary?: string | null;
  assessment?: string | null;
  assessmentGeneratedAt?: Date | null;
  initialEstablishedFacts?: EstablishedFacts | null;
  initialNotes?: GrievanceNote[];
}

// Helper functions to safely parse JSON fields
function parseGrievors(grievors: any): Grievor[] {
  if (!grievors) return [];
  if (Array.isArray(grievors)) return grievors as Grievor[];
  if (typeof grievors === "string") {
    try {
      return JSON.parse(grievors) as Grievor[];
    } catch {
      return [];
    }
  }
  return [];
}

function parseWorkInformation(workInformation: any) {
  if (!workInformation) return {
    employer: "",
    supervisor: "",
    jobTitle: "",
    workLocation: "",
    employmentStatus: "",
  };
  if (typeof workInformation === "object") return workInformation;
  if (typeof workInformation === "string") {
    try {
      return JSON.parse(workInformation);
    } catch {
      return {
        employer: "",
        supervisor: "",
        jobTitle: "",
        workLocation: "",
        employmentStatus: "",
      };
    }
  }
  return workInformation;
}


export default function GrievanceView({
  id,
  grievance,
  grievanceDetails,
  evidence,
  agreements,
  currentAgreement,
  records,
  currentStep,
  availableSteps,
  aiSummary,
  assessment,
  assessmentGeneratedAt,
  initialEstablishedFacts,
  initialNotes,
}: GrievanceViewProps) {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { isSuperAdmin: effectiveIsSuperAdmin } = useAuthWithViewMode();

  // URL-based tab state
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'overview';
  });

  // Parse JSON fields from the grievance
  const grievors = parseGrievors(grievance.report?.grievors);
  const workInformation = parseWorkInformation(grievance.report?.workInformation);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [showSavedAITools, setShowSavedAITools] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(384); // Shared width state
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [showNextStepForm, setShowNextStepForm] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printModalNotes, setPrintModalNotes] = useState<any[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  // Local state for optimistic updates
  const [localGrievanceDetails, setLocalGrievanceDetails] =
    useState(grievanceDetails);

  // Add back the getOrganizationType function
  const getOrganizationType = () => {
    const sessionOrgType = getSessionOrganizationType(session);
    switch (sessionOrgType) {
      case "HR":
        return "hr";
      case "Union":
        return "union";
      case "LAW_FIRM":
        return "hr";
      default:
        return "union";
    }
  };

  // Function for components expecting uppercase format
  const getOrganizationTypeUppercase = () => {
    const sessionOrgType = getSessionOrganizationType(session);
    switch (sessionOrgType) {
      case "HR":
        return "HR";
      case "Union":
        return "Union";
      case "LAW_FIRM":
        return "LAW_FIRM";
      default:
        return "Union";
    }
  };

  const handleCostUpdate = async (
    field: "estimatedCost" | "actualCost",
    value: number | null
  ) => {
    try {
      // Optimistic update - immediately update the UI
      setLocalGrievanceDetails((prev) => ({
        ...prev,
        [field]: value,
      }));

      await updateGrievanceCost(id, field, value);
      setNotificationMessage(
        `${field === "estimatedCost" ? "Estimated" : "Actual"} cost updated successfully`
      );
      setShowNotification(true);
    } catch (error) {
      console.error("Failed to update cost:", error);
      setNotificationMessage("Failed to update cost");
      setShowNotification(true);
      // Revert optimistic update on error by resetting to original props
      setLocalGrievanceDetails(grievanceDetails);
    }
  };



  // Update local state when props change
  React.useEffect(() => {
    setLocalGrievanceDetails(grievanceDetails);
  }, [grievanceDetails]);

  // Update active tab from URL changes
  React.useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', value);
    window.history.pushState(null, '', `?${params.toString()}`);
  };

  // Load bargaining unit logo
  React.useEffect(() => {
    const loadLogo = async () => {
      if (grievanceDetails.bargainingUnit.logoFilename) {
        try {
          const url = await storageClient.getDownloadUrl('agreement', grievanceDetails.bargainingUnit.logoFilename);
          setLogoUrl(url);
        } catch (error) {
          console.error('Error loading bargaining unit logo:', error);
        }
      }
    };
    loadLogo();
  }, [grievanceDetails.bargainingUnit.logoFilename]);


  return (
    <main className="flex min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="flex flex-1">
        <div className="flex-1 w-full">
          <div className="space-y-6 px-8 py-6">
            {/* Back button */}
            <div className="mb-4">
              <Link
                href="/product/grievances"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                <span className="font-medium text-sm">Back to Grievances</span>
              </Link>
            </div>

            {/* Tabs for different sections */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="agreement">Collective Agreement</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="precedent">Precedent</TabsTrigger>
                <TabsTrigger value="decisions">CanLII Precedent (Beta)</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                <OverviewTab
                  grievanceId={id}
                  grievance={grievance}
                  grievanceDetails={grievanceDetails}
                  agreements={agreements}
                  currentAgreement={currentAgreement}
                  currentStep={currentStep}
                  availableSteps={availableSteps}
                  aiSummary={aiSummary}
                  assessment={assessment}
                  assessmentGeneratedAt={assessmentGeneratedAt}
                  effectiveIsSuperAdmin={effectiveIsSuperAdmin}
                  onTimelineModalOpen={() => setIsTimelineModalOpen(true)}
                  onWithdrawalFormOpen={() => setShowWithdrawalForm(true)}
                  onSettlementFormOpen={() => setShowSettlementForm(true)}
                  onNextStepFormOpen={() => setShowNextStepForm(true)}
                  onCostModalOpen={() => setShowCostModal(true)}
                  onPrintModalOpen={(notes) => {
                    setPrintModalNotes(notes);
                    setShowPrintModal(true);
                  }}
                  onShowNotification={(message) => {
                    setNotificationMessage(message);
                    setShowNotification(true);
                  }}
                />
              </TabsContent>

              {/* Evidence Tab */}
              <TabsContent value="evidence" className="space-y-6 mt-6">
                <EvidenceTab
                  grievance={{ ...grievance, evidence }}
                  statement={grievance.report?.statement ?? ""}
                  grievors={grievors}
                  workInformation={workInformation}
                  articlesViolated={grievance.report?.articlesViolated ?? undefined}
                  settlementDesired={grievance.report?.settlementDesired ?? undefined}
                  initialEstablishedFacts={initialEstablishedFacts}
                  grievanceType={grievance.category ?? undefined}
                  onShowNotification={(message) => {
                    setNotificationMessage(message);
                    setShowNotification(true);
                  }}
                />
              </TabsContent>

              {/* Precedent Tab - Similar Grievances */}
              <TabsContent value="precedent" className="space-y-6 mt-6">
                <PrecedentTab grievanceId={id} />
              </TabsContent>

              {/* Decisions Tab */}
              <TabsContent value="decisions" className="space-y-6 mt-6">
                <DecisionsTab
                  initialEstablishedFacts={initialEstablishedFacts}
                  statement={grievance.report?.statement || ''}
                  category={grievance.category || ''}
                  articlesViolated={grievance.report?.articlesViolated || ''}
                  onShowNotification={(message) => {
                    setNotificationMessage(message);
                    setShowNotification(true);
                  }}
                />
              </TabsContent>

              {/* Collective Agreement Tab */}
              <TabsContent value="agreement" className="space-y-6 mt-6">
                <AgreementTab currentAgreement={currentAgreement} />
              </TabsContent>

              {/* Emails Tab */}
              <TabsContent value="emails" className="space-y-6 mt-6">
                <EmailsTab
                  grievanceId={id}
                  statement={grievance.report?.statement ?? ""}
                  grievors={grievors}
                  workInformation={workInformation}
                  articlesViolated={grievance.report?.articlesViolated ?? ""}
                  settlementDesired={grievance.report?.settlementDesired ?? ""}
                  organizationType={getOrganizationTypeUppercase()}
                  currentStatus={grievanceDetails.status}
                  establishedFacts={initialEstablishedFacts?.facts || null}
                  userName={session?.user?.name}
                  externalGrievanceId={grievance.externalGrievanceId}
                  currentStep={currentStep}
                  availableSteps={availableSteps}
                />
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="space-y-6 mt-6">
                <NotesTab grievanceId={id} initialNotes={initialNotes} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Conditional Rendering */}
        {showSavedAITools ? (
          <GrievanceAnalysisSidebar
            statement={grievance.report?.statement ?? ""}
            agreementId={currentAgreement?.id ?? ""}
            grievors={grievors}
            workInformation={workInformation}
            grievanceId={id}
            currentStatus={grievanceDetails.status as GrievanceStatus}
            grievanceType={
              grievance.type.toLowerCase() as "individual" | "group" | "policy"
            }
            organizationType={getOrganizationType()}
            onCopyToStatement={() => {}}
            onCopyToSettlement={() => {}}
            evidence={evidence}
            articlesViolated={grievance.report?.articlesViolated ?? ""}
            settlementDesired={grievance.report?.settlementDesired ?? ""}
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            onSwitchToAI={() => setShowSavedAITools(false)}
          />
        ) : (
          <div className="sticky top-0 flex" style={{ height: 'calc(100vh - 2rem)' }}>
            <GrievanceAIChat
              grievanceId={id}
              statement={grievance.report?.statement ?? ""}
              evidence={evidence}
              grievors={grievors}
              workInformation={workInformation}
              agreementId={currentAgreement?.id}
              articlesViolated={grievance.report?.articlesViolated ?? ""}
              settlementDesired={grievance.report?.settlementDesired ?? ""}
              organizationType={getOrganizationTypeUppercase()}
              className="h-full"
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onSwitchToEmails={() => setShowSavedAITools(true)}
            />
          </div>
        )}
      </div>

      {/* Timeline Modal */}
      {currentAgreement && (
        <TimelineModal
          isOpen={isTimelineModalOpen}
          onClose={() => setIsTimelineModalOpen(false)}
          steps={(availableSteps || []).map(step => ({
            ...step,
            name: step.name ?? undefined,
            notes: step.notes ?? undefined
          }))}
          title={`${grievance.type.charAt(0).toUpperCase() + grievance.type.slice(1).toLowerCase()} Timeline`}
          currentStep={currentStep}
          showProgress={true}
          records={records}
        />
      )}

      {showNotification && (
        <Notification
          message={notificationMessage}
          onClose={() => setShowNotification(false)}
        />
      )}

      {/* Withdrawal Form Modal */}
      {showWithdrawalForm && (
        <WithdrawalForm
          grievanceId={id}
          onClose={() => setShowWithdrawalForm(false)}
        />
      )}

      {/* Settlement Form Modal */}
      {showSettlementForm && (
        <SettlementForm
          grievanceId={id}
          onClose={() => setShowSettlementForm(false)}
        />
      )}

      {/* Next Step Form Modal */}
      {currentStep && availableSteps && (
        <NextStepForm
          open={showNextStepForm}
          grievanceId={id}
          currentStepNumber={currentStep.stepNumber}
          currentStepStage={currentStep.stage}
          availableSteps={availableSteps.map((step) => ({
            stepNumber: step.stepNumber,
            description: step.description,
            name: step.name ?? undefined,
          }))}
          onClose={() => setShowNextStepForm(false)}
        />
      )}

      {/* Cost Management Modal */}
      {showCostModal && (
        <CostManagementModal
          isOpen={showCostModal}
          onClose={() => setShowCostModal(false)}
          estimatedCost={localGrievanceDetails.estimatedCost ?? null}
          actualCost={localGrievanceDetails.actualCost ?? null}
          onCostUpdate={handleCostUpdate}
        />
      )}

      {/* Print Grievance Modal */}
      {showPrintModal && (
        <PrintGrievanceModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          grievanceId={id}
          externalGrievanceId={grievance.externalGrievanceId}
          grievanceType={grievance.type}
          category={grievance.category}
          status={grievanceDetails.status}
          filedAt={grievance.filedAt || grievance.createdAt}
          createdAt={grievance.createdAt}
          updatedAt={grievance.updatedAt}
          statement={grievance.report?.statement}
          articlesViolated={grievance.report?.articlesViolated}
          settlementDesired={grievance.report?.settlementDesired}
          grievors={grievors}
          workInformation={workInformation}
          evidence={evidence}
          bargainingUnit={grievanceDetails.bargainingUnit.name}
          organizationName={session?.user?.organization?.name}
          organizationType={session?.user?.organization?.organizationType}
          userTimezone={session?.user?.timezone}
          logoUrl={logoUrl}
          currentStep={grievanceDetails.currentStep}
          aiSummary={aiSummary ?? undefined}
          establishedFacts={initialEstablishedFacts?.facts ?? undefined}
          collectiveAgreement={currentAgreement ? {
            id: currentAgreement.id,
            name: currentAgreement.name,
            effectiveDate: currentAgreement.effectiveDate,
            expiryDate: currentAgreement.expiryDate,
          } : undefined}
          notes={printModalNotes}
          resolutionDetails={grievanceDetails.resolutionDetails ?? undefined}
        />
      )}
    </main>
  );
}
