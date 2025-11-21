import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { CoverPage } from './cover-page';
import { TableOfContents } from './table-of-contents';
import { formatSmartDate, formatSmartDateTime, formatPhoneNumber } from '@/lib/utils';
import { Evidence, Grievor, WorkInformation, getOrganizationTypeDisplay } from '@/app/lib/definitions';
import { PageSelections, GrievanceNote } from './print-grievance-modal';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: '30%',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  value: {
    width: '70%',
    fontSize: 10,
    color: '#1e293b',
  },
  paragraph: {
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.5,
    textAlign: 'justify',
    marginBottom: 8,
  },
  evidenceItem: {
    marginBottom: 12,
  },
  evidenceTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  evidenceDate: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
  },
  evidenceSummary: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.4,
  },
  noteItem: {
    marginBottom: 12,
  },
  noteHeader: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
  },
  noteContent: {
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
});

interface GrievanceDocumentProps {
  grievanceId: string;
  externalGrievanceId?: string | null;
  grievanceType: 'INDIVIDUAL' | 'GROUP' | 'POLICY';
  category?: string | null;
  status: string;
  filedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  statement?: string;
  articlesViolated?: string | null;
  settlementDesired?: string;
  grievors?: Grievor[];
  workInformation?: WorkInformation;
  evidence?: Evidence[];
  bargainingUnit: string;
  organizationName?: string;
  organizationType?: string | null;
  userTimezone?: string | null;
  logoUrl?: string;
  currentStep?: string | null;
  aiSummary?: string | null;
  establishedFacts?: string | null;
  collectiveAgreement?: {
    id: string;
    name: string;
    effectiveDate: Date;
    expiryDate: Date;
  } | null;
  notes?: GrievanceNote[];
  resolutionDetails?: {
    resolutionType?: string;
    resolutionDate?: string;
    outcomes?: string;
    details?: string;
  } | null;
  pageSelections?: PageSelections;
  pageOrder?: Array<keyof PageSelections>;
}

export function GrievanceDocument({
  grievanceId,
  externalGrievanceId,
  grievanceType,
  category,
  status,
  filedAt,
  createdAt,
  updatedAt,
  statement,
  articlesViolated,
  settlementDesired,
  grievors = [],
  workInformation,
  evidence = [],
  bargainingUnit,
  organizationName,
  organizationType,
  userTimezone,
  logoUrl,
  currentStep,
  aiSummary,
  establishedFacts,
  collectiveAgreement,
  notes = [],
  resolutionDetails,
  pageSelections,
  pageOrder,
}: GrievanceDocumentProps) {
  const documentType = grievanceType === 'POLICY' ? 'Policy Grievance' :
                       grievanceType === 'GROUP' ? 'Group Grievance' :
                       'Individual Grievance';

  // Use externalGrievanceId for display, fallback to grievanceId
  const displayGrievanceId = externalGrievanceId || grievanceId;

  // Default to showing all pages if no selections provided
  const selections = pageSelections || {
    coverPage: true,
    tableOfContents: false,
    organizationInfo: !!organizationName,
    grievanceDetails: true,
    workInfoStatement: true,
    aiSummary: !!aiSummary,
    evidenceTimeline: !!evidence && evidence.length > 0,
    collectiveAgreement: !!collectiveAgreement,
    notes: !!notes && notes.length > 0,
    resolution: !!resolutionDetails?.outcomes,
  };

  // Default page order
  const order = pageOrder || [
    'organizationInfo',
    'grievanceDetails',
    'workInfoStatement',
    'aiSummary',
    'evidenceTimeline',
    'collectiveAgreement',
    'notes',
    'resolution',
  ];

  // Helper function to render each page type
  const renderPage = (pageKey: keyof PageSelections) => {
    if (!selections[pageKey]) return null;

    switch (pageKey) {
      case 'organizationInfo':
        if (!organizationName) return null;
        return (
          <Page key="organizationInfo" size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Organization Information</Text>
              <Text style={styles.headerSubtitle}>Case #{displayGrievanceId}</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.row}>
                <Text style={styles.label}>Organization Name:</Text>
                <Text style={styles.value}>{organizationName}</Text>
              </View>

              {organizationType && (
                <View style={styles.row}>
                  <Text style={styles.label}>Organization Type:</Text>
                  <Text style={styles.value}>{getOrganizationTypeDisplay(organizationType as "HR" | "Union" | "LAW_FIRM")}</Text>
                </View>
              )}
            </View>
          </Page>
        );

      case 'grievanceDetails':
        return (
          <Page key="grievanceDetails" size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Grievance Details</Text>
              <Text style={styles.headerSubtitle}>Case #{displayGrievanceId}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Case Information</Text>

              <View style={styles.row}>
                <Text style={styles.label}>Type:</Text>
                <Text style={styles.value}>{documentType}</Text>
              </View>

              {category && (
                <View style={styles.row}>
                  <Text style={styles.label}>Category:</Text>
                  <Text style={styles.value}>{category}</Text>
                </View>
              )}

              <View style={styles.row}>
                <Text style={styles.label}>Status:</Text>
                <Text style={styles.value}>{status}</Text>
              </View>

              {currentStep && (
                <View style={styles.row}>
                  <Text style={styles.label}>Current Step:</Text>
                  <Text style={styles.value}>{currentStep}</Text>
                </View>
              )}

              <View style={styles.row}>
                <Text style={styles.label}>Filed Date:</Text>
                <Text style={styles.value}>{formatSmartDate(filedAt)}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Last Updated:</Text>
                <Text style={styles.value}>{formatSmartDateTime(updatedAt)}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Bargaining Unit:</Text>
                <Text style={styles.value}>{bargainingUnit}</Text>
              </View>
            </View>

            {grievors && grievors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Grievor Information</Text>
                {grievors.map((grievor, index) => (
                  <View key={index} style={{ marginBottom: 12 }}>
                    {grievors.length > 1 && (
                      <Text style={styles.subsectionTitle}>Grievor {index + 1}</Text>
                    )}

                    <View style={styles.row}>
                      <Text style={styles.label}>Name:</Text>
                      <Text style={styles.value}>
                        {grievor.firstName} {grievor.lastName}
                      </Text>
                    </View>

                    {grievor.memberNumber && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Member Number:</Text>
                        <Text style={styles.value}>{grievor.memberNumber}</Text>
                      </View>
                    )}

                    {grievor.email && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Email:</Text>
                        <Text style={styles.value}>{grievor.email}</Text>
                      </View>
                    )}

                    {grievor.phoneNumber && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Phone:</Text>
                        <Text style={styles.value}>{formatPhoneNumber(grievor.phoneNumber)}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.footer}>
              <Text render={({ pageNumber, totalPages }) => (
                `Page ${pageNumber} of ${totalPages}`
              )} fixed />
            </View>
          </Page>
        );

      case 'workInfoStatement':
        return (
          <Page key="workInfoStatement" size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Grievance Statement</Text>
              <Text style={styles.headerSubtitle}>Case #{displayGrievanceId}</Text>
            </View>

            {workInformation && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Work Information</Text>

                {workInformation.employer && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Employer:</Text>
                    <Text style={styles.value}>{workInformation.employer}</Text>
                  </View>
                )}

                {workInformation.jobTitle && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Job Title:</Text>
                    <Text style={styles.value}>{workInformation.jobTitle}</Text>
                  </View>
                )}

                {workInformation.supervisor && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Supervisor:</Text>
                    <Text style={styles.value}>{workInformation.supervisor}</Text>
                  </View>
                )}

                {workInformation.workLocation && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Work Location:</Text>
                    <Text style={styles.value}>{workInformation.workLocation}</Text>
                  </View>
                )}

                {workInformation.employmentStatus && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Employment Status:</Text>
                    <Text style={styles.value}>{workInformation.employmentStatus}</Text>
                  </View>
                )}
              </View>
            )}

            {statement && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Statement of Grievance</Text>
                <Text style={styles.paragraph}>{statement}</Text>
              </View>
            )}

            {articlesViolated && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Articles Violated</Text>
                <Text style={styles.paragraph}>{articlesViolated}</Text>
              </View>
            )}

            {settlementDesired && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Settlement Desired</Text>
                <Text style={styles.paragraph}>{settlementDesired}</Text>
              </View>
            )}

            <View style={styles.footer}>
              <Text render={({ pageNumber, totalPages }) => (
                `Page ${pageNumber} of ${totalPages}`
              )} fixed />
            </View>
          </Page>
        );

      case 'aiSummary':
        if (!aiSummary) return null;
        return (
          <Page key="aiSummary" size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>AI-Generated Summary</Text>
              <Text style={styles.headerSubtitle}>Case #{displayGrievanceId}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.paragraph}>{aiSummary}</Text>
            </View>

            <View style={styles.footer}>
              <Text render={({ pageNumber, totalPages }) => (
                `Page ${pageNumber} of ${totalPages}`
              )} fixed />
            </View>
          </Page>
        );

      case 'evidenceTimeline':
        if (!evidence || evidence.length === 0) return null;
        return (
          <Page key="evidenceTimeline" size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Evidence & Facts</Text>
              <Text style={styles.headerSubtitle}>Case #{displayGrievanceId}</Text>
            </View>

            {establishedFacts && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Established Facts</Text>
                <Text style={styles.paragraph}>{establishedFacts}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Evidence Timeline ({evidence.length} items)
              </Text>

              {evidence
                .sort((a, b) => {
                  const dateA = new Date(a.eventDate || a.date);
                  const dateB = new Date(b.eventDate || b.date);
                  return dateA.getTime() - dateB.getTime();
                })
                .map((item, index) => (
                  <View key={item.id} style={styles.evidenceItem}>
                    <Text style={styles.evidenceTitle}>
                      {index + 1}. {item.name}
                    </Text>
                    <Text style={styles.evidenceDate}>
                      Date: {formatSmartDate(new Date(item.eventDate || item.date))} • Type: {item.type}
                    </Text>
                    {item.summary && (
                      <Text style={styles.evidenceSummary}>{item.summary}</Text>
                    )}
                  </View>
                ))}
            </View>

            <View style={styles.footer}>
              <Text render={({ pageNumber, totalPages }) => (
                `Page ${pageNumber} of ${totalPages}`
              )} fixed />
            </View>
          </Page>
        );

      case 'collectiveAgreement':
        if (!collectiveAgreement) return null;
        return (
          <Page key="collectiveAgreement" size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Collective Agreement</Text>
              <Text style={styles.headerSubtitle}>Case #{displayGrievanceId}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Agreement Information</Text>

              <View style={styles.row}>
                <Text style={styles.label}>Agreement Name:</Text>
                <Text style={styles.value}>{collectiveAgreement.name}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Effective Date:</Text>
                <Text style={styles.value}>
                  {formatSmartDate(collectiveAgreement.effectiveDate)}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Expiry Date:</Text>
                <Text style={styles.value}>
                  {formatSmartDate(collectiveAgreement.expiryDate)}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Text render={({ pageNumber, totalPages }) => (
                `Page ${pageNumber} of ${totalPages}`
              )} fixed />
            </View>
          </Page>
        );

      case 'notes':
        if (!notes || notes.length === 0) return null;
        return (
          <Page key="notes" size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Internal Notes</Text>
              <Text style={styles.headerSubtitle}>Case #{displayGrievanceId}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Notes ({notes.length} entries)
              </Text>

              {notes
                .sort((a, b) => {
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((note, index) => (
                  <View key={note.id} style={styles.noteItem}>
                    <Text style={styles.noteHeader}>
                      {note.user.name || 'Unknown User'} • {formatSmartDateTime(note.createdAt)}
                      {new Date(note.updatedAt) > new Date(note.createdAt) && ' • (edited)'}
                    </Text>
                    <Text style={styles.noteContent}>{note.content}</Text>
                  </View>
                ))}
            </View>

            <View style={styles.footer}>
              <Text render={({ pageNumber, totalPages }) => (
                `Page ${pageNumber} of ${totalPages}`
              )} fixed />
            </View>
          </Page>
        );

      case 'resolution':
        if (!resolutionDetails || !resolutionDetails.outcomes) return null;
        return (
          <Page key="resolution" size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Resolution Details</Text>
              <Text style={styles.headerSubtitle}>Case #{displayGrievanceId}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resolution Information</Text>

              {resolutionDetails.resolutionType && (
                <View style={styles.row}>
                  <Text style={styles.label}>Resolution Type:</Text>
                  <Text style={styles.value}>
                    {resolutionDetails.resolutionType.replace(/_/g, ' ')}
                  </Text>
                </View>
              )}

              {resolutionDetails.resolutionDate && (
                <View style={styles.row}>
                  <Text style={styles.label}>Resolution Date:</Text>
                  <Text style={styles.value}>
                    {formatSmartDate(new Date(resolutionDetails.resolutionDate))}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Outcomes</Text>
              <Text style={styles.paragraph}>
                {resolutionDetails.outcomes || resolutionDetails.details}
              </Text>
            </View>

            <View style={styles.footer}>
              <Text render={({ pageNumber, totalPages }) => (
                `Page ${pageNumber} of ${totalPages}`
              )} fixed />
            </View>
          </Page>
        );

      default:
        return null;
    }
  };

  return (
    <Document>
      {/* Cover Page */}
      {selections.coverPage && (
        <CoverPage
          key="cover-page"
          title={`Case #${displayGrievanceId}`}
          documentType={documentType as any}
          date={filedAt}
          grievanceId={displayGrievanceId}
          bargainingUnit={bargainingUnit}
          userTimezone={userTimezone}
          logoUrl={logoUrl}
          organizationName={organizationName}
        />
      )}

      {/* Table of Contents */}
      {selections.tableOfContents && (
        <TableOfContents
          key="table-of-contents"
          grievanceId={displayGrievanceId}
          pageSelections={selections}
          pageOrder={order}
          hasOrganizationInfo={!!organizationName}
          hasAiSummary={!!aiSummary}
          hasEvidence={!!evidence && evidence.length > 0}
          hasCollectiveAgreement={!!collectiveAgreement}
          hasNotes={!!notes && notes.length > 0}
          hasResolution={!!resolutionDetails?.outcomes}
        />
      )}

      {/* Render pages in the specified order */}
      {order.map(pageKey => renderPage(pageKey))}
    </Document>
  );
}
