import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatSmartDateTime } from '@/lib/utils';

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
  paragraph: {
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.6,
    textAlign: 'justify',
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
  },
  value: {
    fontSize: 10,
    color: '#1e293b',
    marginBottom: 12,
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

export interface PageSelections {
  coverPage: boolean;
  scenarioDescription: boolean;
  relevantProvisions: boolean;
  assessment: boolean;
}

interface ScenarioDocumentProps {
  scenario: string;
  agreementName: string;
  relevantAgreementSections: string;
  analysis: string;
  generatedDate: Date;
  pageSelections?: PageSelections;
}

export function ScenarioDocument({
  scenario,
  agreementName,
  relevantAgreementSections,
  analysis,
  generatedDate,
  pageSelections = {
    coverPage: true,
    scenarioDescription: true,
    relevantProvisions: true,
    assessment: true,
  },
}: ScenarioDocumentProps) {
  // Helper to clean markdown formatting for PDF
  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code blocks
      .replace(/^[-*+]\s/gm, '• '); // Convert list markers to bullets
  };

  return (
    <Document>
      {/* Cover Page */}
      {pageSelections.coverPage && (
      <Page size="A4" style={styles.page}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 }}>
            Rough Justice
          </Text>
          <Text style={{ fontSize: 16, color: '#475569', marginBottom: 32 }}>
            Scenario Analysis Report
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            Generated: {formatSmartDateTime(generatedDate)}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b' }}>
            Agreement: {agreementName}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Rough Justice - Scenario Analysis Report</Text>
        </View>
      </Page>
      )}

      {/* Scenario Description Page */}
      {pageSelections.scenarioDescription && (
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scenario Description</Text>
          <Text style={styles.headerSubtitle}>{formatSmartDateTime(generatedDate)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Collective Agreement:</Text>
          <Text style={styles.value}>{agreementName}</Text>

          <Text style={styles.label}>Scenario:</Text>
          <Text style={styles.paragraph}>{scenario}</Text>
        </View>

        <View style={styles.footer}>
          <Text render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} fixed />
        </View>
      </Page>
      )}

      {/* Relevant Agreement Provisions Page */}
      {pageSelections.relevantProvisions && relevantAgreementSections && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Relevant Agreement Provisions</Text>
            <Text style={styles.headerSubtitle}>{agreementName}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.paragraph}>
              {cleanMarkdown(relevantAgreementSections)}
            </Text>
          </View>

          <View style={styles.footer}>
            <Text render={({ pageNumber, totalPages }) => (
              `Page ${pageNumber} of ${totalPages}`
            )} fixed />
          </View>
        </Page>
      )}

      {/* Assessment Page */}
      {pageSelections.assessment && analysis && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Assessment</Text>
            <Text style={styles.headerSubtitle}>Analysis and Recommendations</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.paragraph}>
              {cleanMarkdown(analysis)}
            </Text>
          </View>

          <View style={styles.footer}>
            <Text render={({ pageNumber, totalPages }) => (
              `Page ${pageNumber} of ${totalPages}`
            )} fixed />
          </View>
        </Page>
      )}
    </Document>
  );
}
