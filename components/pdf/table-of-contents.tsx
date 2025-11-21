import { Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { PageSelections } from './print-grievance-modal';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  tocContainer: {
    marginTop: 20,
  },
  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'dotted',
  },
  tocLabel: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  tocDescription: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  tocPage: {
    fontSize: 12,
    color: '#475569',
    fontWeight: 'bold',
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

interface TableOfContentsProps {
  grievanceId: string;
  pageSelections: PageSelections;
  pageOrder: Array<keyof PageSelections>;
  hasOrganizationInfo?: boolean;
  hasAiSummary: boolean;
  hasEvidence: boolean;
  hasCollectiveAgreement: boolean;
  hasNotes: boolean;
  hasResolution: boolean;
}

export function TableOfContents({
  grievanceId,
  pageSelections,
  pageOrder,
  hasOrganizationInfo,
  hasAiSummary,
  hasEvidence,
  hasCollectiveAgreement,
  hasNotes,
  hasResolution,
}: TableOfContentsProps) {
  // Calculate page numbers based on selections
  let currentPage = 1;
  const pages: Array<{ label: string; description: string; pageNumber: number }> = [];

  // Cover page is always first if included
  if (pageSelections.coverPage) {
    currentPage++;
  }

  // Table of contents is always page 2 (or 1 if no cover page)
  const tocPageNumber = currentPage;
  currentPage++;

  // Helper to get page labels and descriptions
  const getPageInfo = (key: keyof PageSelections) => {
    const info: Record<keyof PageSelections, { label: string; description: string }> = {
      coverPage: { label: 'Cover Page', description: 'Cover page' },
      tableOfContents: { label: 'Table of Contents', description: 'Table of contents' },
      organizationInfo: { label: 'Organization Information', description: 'Organization name and type' },
      grievanceDetails: { label: 'Grievance Details', description: 'Case information and grievor details' },
      workInfoStatement: { label: 'Grievance Statement', description: 'Work information and statement of grievance' },
      aiSummary: { label: 'AI-Generated Summary', description: 'AI-powered analysis and case summary' },
      evidenceTimeline: { label: 'Evidence & Facts', description: 'Established facts and chronological listing of evidence' },
      collectiveAgreement: { label: 'Collective Agreement', description: 'Collective agreement information' },
      notes: { label: 'Internal Notes', description: 'Internal notes from team members' },
      resolution: { label: 'Resolution Details', description: 'Resolution information and outcomes' },
    };
    return info[key];
  };

  // Add selected pages in the specified order
  pageOrder.forEach(pageKey => {
    // Check if the page is selected and has content
    if (!pageSelections[pageKey]) return;

    if (pageKey === 'organizationInfo' && !hasOrganizationInfo) return;
    if (pageKey === 'aiSummary' && !hasAiSummary) return;
    if (pageKey === 'evidenceTimeline' && !hasEvidence) return;
    if (pageKey === 'collectiveAgreement' && !hasCollectiveAgreement) return;
    if (pageKey === 'notes' && !hasNotes) return;
    if (pageKey === 'resolution' && !hasResolution) return;

    const info = getPageInfo(pageKey);
    pages.push({
      label: info.label,
      description: info.description,
      pageNumber: currentPage,
    });
    currentPage++;
  });

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Table of Contents</Text>
        <Text style={styles.subtitle}>Case #{grievanceId}</Text>
      </View>

      {/* Table of Contents Items */}
      <View style={styles.tocContainer}>
        {pages.map((page, index) => (
          <View key={index} style={styles.tocItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tocLabel}>{page.label}</Text>
              <Text style={styles.tocDescription}>{page.description}</Text>
            </View>
            <Text style={styles.tocPage}>{page.pageNumber}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{tocPageNumber}</Text>
      </View>
    </Page>
  );
}
