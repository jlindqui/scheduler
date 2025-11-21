import { Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { formatSmartDate } from '@/lib/utils';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const styles = StyleSheet.create({
  page: {
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    marginBottom: 40,
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    objectFit: 'contain',
  },
  titleSection: {
    marginTop: 40,
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 8,
  },
  divider: {
    width: 200,
    height: 2,
    backgroundColor: '#cbd5e1',
    marginVertical: 30,
  },
  infoSection: {
    marginTop: 20,
    display: 'flex',
    alignItems: 'center',
  },
  infoRow: {
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 12,
    color: '#1e293b',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 60,
    right: 60,
    display: 'flex',
    alignItems: 'center',
    fontSize: 10,
    color: '#94a3b8',
  },
});

interface CoverPageProps {
  title: string;
  documentType: 'Grievance' | 'Complaint' | 'Incident' | 'Book of Documents';
  date: Date;
  grievanceId?: string;
  bargainingUnit?: string;
  userTimezone?: string | null;
  logoUrl?: string;
  organizationName?: string;
}

export function CoverPage({
  title,
  documentType,
  date,
  grievanceId,
  bargainingUnit,
  userTimezone,
  logoUrl,
  organizationName,
}: CoverPageProps) {
  // Format the current date/time in the user's timezone
  const generatedDateText = userTimezone
    ? formatInTimeZone(new Date(), userTimezone, "MMM d, yyyy 'at' h:mm a")
    : format(new Date(), "MMM d, yyyy 'at' h:mm a");
  return (
    <Page size="A4" style={styles.page}>
      {/* Logo */}
      {logoUrl && (
        <View style={styles.logoContainer}>
          <Image src={logoUrl} style={styles.logo} />
        </View>
      )}

      {/* Main Title Section */}
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>{title}</Text>
        <Text style={styles.subtitle}>{documentType}</Text>
      </View>

      <View style={styles.divider} />

      {/* Information Section */}
      <View style={styles.infoSection}>
        {bargainingUnit && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bargaining Unit:</Text>
            <Text style={styles.infoValue}>{bargainingUnit}</Text>
          </View>
        )}

        {grievanceId && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Case Number:</Text>
            <Text style={styles.infoValue}>{grievanceId}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{formatSmartDate(date)}</Text>
        </View>

        {organizationName && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Organization:</Text>
            <Text style={styles.infoValue}>{organizationName}</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Generated on {generatedDateText}</Text>
      </View>
    </Page>
  );
}
