'use server';

import { prisma } from '@/app/lib/db';
import { getRelevantReferenceContent, generateAIContent } from '@/app/actions/llm/analysis';

interface CachedDisciplineContext {
  grievanceId: string;
  relevantSections: string;
  topics: string[];
  extractedAt: Date;
  expiresAt: Date;
}

// Get cached discipline context for a grievance
export async function getCachedDisciplineContext(grievanceId: string): Promise<CachedDisciplineContext | null> {
  try {
    // Check if we have cached discipline context
    const cached = await prisma.grievanceDisciplineCache.findUnique({
      where: { grievanceId }
    });

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (cached.expiresAt < new Date()) {
      // Delete expired cache
      await prisma.grievanceDisciplineCache.delete({
        where: { grievanceId }
      });
      return null;
    }

    return {
      grievanceId: cached.grievanceId,
      relevantSections: cached.relevantSections,
      topics: cached.topics,
      extractedAt: cached.createdAt,
      expiresAt: cached.expiresAt
    };
  } catch (error) {
    console.error('Error getting cached discipline context:', error);
    return null;
  }
}

// Extract and cache relevant discipline sections
export async function extractAndCacheDisciplineSections(
  grievanceId: string,
  statement: string,
  articlesViolated?: string[],
  grievanceType?: string,
  forceRefresh = false
): Promise<{ success: boolean; relevantSections?: string; error?: string }> {
  try {
    // First check if we already have cached content (unless forcing refresh)
    const existing = await getCachedDisciplineContext(grievanceId);
    if (existing && !forceRefresh) {
      return {
        success: true,
        relevantSections: existing.relevantSections
      };
    }

    // If forcing refresh, delete existing cache first
    if (existing && forceRefresh) {
      console.log('Force refresh requested - deleting existing cache for grievance:', grievanceId);
      await prisma.grievanceDisciplineCache.delete({
        where: { grievanceId }
      });
    }

    // First, get the full discipline content using the existing function
    // This will trigger PDF processing
    const fullDisciplineContent = await getRelevantReferenceContent(
      statement,
      articlesViolated || []
    );

    if (!fullDisciplineContent) {
      console.log('No discipline content found for this grievance');
      return { 
        success: false, 
        error: 'No relevant discipline guidance found' 
      };
    }

    // Now extract ONLY the most relevant sections using AI
    const extractionPrompt = `You are analyzing discipline guidance from Brown & Beatty Canadian Employment Law.

GRIEVANCE DETAILS:
Statement: ${statement}
Type: ${grievanceType || 'Unknown'}
Articles Violated: ${articlesViolated?.join(', ') || 'Not specified'}

FULL DISCIPLINE GUIDANCE RETRIEVED:
${fullDisciplineContent}

TASK:
From the above discipline guidance, extract ONLY the sections that are MOST RELEVANT to this specific grievance. Focus on:
1. Sections that directly relate to the type of misconduct mentioned
2. Relevant precedents and case law that would apply
3. Key principles that govern this type of discipline
4. Procedural requirements that must be met

IMPORTANT:
- Keep only the most relevant 20-30% of the content
- Preserve case citations and legal references
- Maintain section headers and structure
- Remove generic or tangentially related content
- Focus on actionable guidance for this specific situation

Return the extracted relevant sections maintaining their original formatting.`;

    // Use AI to extract only the most relevant sections
    const response = await generateAIContent(
      'custom',
      {
        statement: statement,
        question: extractionPrompt,
        evidence: [],
        grievors: [],
        workInformation: {} as any
      }
    );

    const relevantSections = typeof response === 'string' ? response : response?.answer || '';

    if (!relevantSections) {
      return { 
        success: false, 
        error: 'Failed to extract relevant discipline sections' 
      };
    }

    // Extract topics/keywords from the sections for indexing
    const topicMatches: string[] = relevantSections.match(/\b(terminat|dismissal|suspend|discipline|warning|misconduct|insubordination|theft|dishonest|absent|performance|harassment|violence|safety)\w*/gi) || [];
    const topics: string[] = [...new Set(topicMatches.map((t: string) => t.toLowerCase()))];

    // Cache the extracted sections (expires in 30 days - discipline guidance doesn't change often)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Use upsert to handle the unique constraint issue
    await prisma.grievanceDisciplineCache.upsert({
      where: { grievanceId },
      update: {
        relevantSections,
        topics,
        expiresAt
      },
      create: {
        grievanceId,
        relevantSections,
        topics,
        expiresAt
      }
    });

    console.log(`Cached discipline sections for grievance ${grievanceId}:`, {
      originalLength: fullDisciplineContent.length,
      cachedLength: relevantSections.length,
      reductionPercent: Math.round((1 - relevantSections.length / fullDisciplineContent.length) * 100),
      topics,
      expiresAt
    });

    return { 
      success: true, 
      relevantSections 
    };
  } catch (error) {
    console.error('Error extracting and caching discipline sections:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Clear discipline cache for a grievance (useful when grievance is updated)
export async function clearDisciplineCache(grievanceId: string): Promise<boolean> {
  try {
    await prisma.grievanceDisciplineCache.delete({
      where: { grievanceId }
    });
    console.log('Cleared discipline cache for grievance:', grievanceId);
    return true;
  } catch (error) {
    console.error('Error clearing discipline cache:', error);
    return false;
  }
}

// Check if we should use discipline guidance for this grievance
export async function shouldUseDisciplineGuidance(statement: string, grievanceType?: string): Promise<boolean> {
  // Handle undefined or null statement
  if (!statement) {
    console.warn('No statement provided to shouldUseDisciplineGuidance');
    return false;
  }

  const disciplineKeywords = [
    'terminat', 'dismiss', 'discharge', 'fire',
    'suspend', 'discipline', 'warning', 'reprimand',
    'misconduct', 'insubordination', 'violation',
    'theft', 'dishonest', 'fraud',
    'absent', 'awol', 'attendance',
    'performance', 'incompeten',
    'harassment', 'discriminat', 'bullying',
    'violence', 'assault', 'threat',
    'safety', 'accident', 'injury',
    'intoxicat', 'impair', 'drug', 'alcohol'
  ];

  const lowerStatement = statement.toLowerCase();
  const lowerType = grievanceType?.toLowerCase() || '';

  return disciplineKeywords.some(keyword =>
    lowerStatement.includes(keyword) || lowerType.includes(keyword)
  );
}