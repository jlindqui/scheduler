'use server';

import { prisma } from '@/app/lib/db';
import { generateAIContent } from '@/app/actions/llm/analysis';
import { getCachedDisciplineContext, extractAndCacheDisciplineSections } from '@/app/actions/grievance-discipline-cache';
import { extractEvidencePdfContent } from '@/app/actions/evidence';
import { indexGrievance } from '@/app/actions/grievances/grievance-search';
import type { Evidence, Grievor, WorkInformation, EstablishedFacts } from '@/app/lib/definitions';

// Get established facts for a grievance
export async function getEstablishedFacts(grievanceId: string): Promise<EstablishedFacts | null> {
  try {
    const facts = await prisma.grievanceEstablishedFacts.findUnique({
      where: { grievanceId }
    });

    if (!facts) {
      return null;
    }

    return {
      id: facts.id,
      grievanceId: facts.grievanceId,
      facts: facts.facts,
      createdAt: facts.createdAt,
      updatedAt: facts.updatedAt
    };
  } catch (error) {
    console.error('Error getting established facts:', error);
    return null;
  }
}

// Process evidence for AI analysis
async function processEvidenceForFacts(evidenceArray: Evidence[]) {
  const processedEvidence = await Promise.all(
    evidenceArray.map(async (e) => {
      let content = '';
      
      if (e.type === 'File') {
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
}

// Extract and store established facts
export async function extractEstablishedFacts(
  grievanceId: string,
  statement: string,
  evidence: Evidence[],
  grievors: Grievor[],
  workInformation: WorkInformation,
  articlesViolated?: string,
  settlementDesired?: string,
  grievanceType?: string
): Promise<{ success: boolean; facts?: EstablishedFacts; error?: string }> {
  try {
    // Check if we already have established facts
    const existing = await getEstablishedFacts(grievanceId);
    if (existing) {
      console.log('Established facts already exist for grievance:', grievanceId);
      return { 
        success: true, 
        facts: existing 
      };
    }

    console.log('Extracting established facts for grievance:', grievanceId);

    // Get discipline context - try cache first, then extract if needed
    let disciplineContent = '';
    const cachedDisciplineContext = await getCachedDisciplineContext(grievanceId);

    if (cachedDisciplineContext) {
      console.log('Using cached discipline context for facts extraction');
      disciplineContent = cachedDisciplineContext.relevantSections;
    } else {
      // Only extract discipline guidance if this is actually a discipline-related grievance
      const { shouldUseDisciplineGuidance } = await import('./grievance-discipline-cache');
      const isDisciplineCase = await shouldUseDisciplineGuidance(statement, grievanceType);

      if (isDisciplineCase) {
        console.log('Discipline-related grievance detected, extracting discipline guidance for facts analysis...');

        // Extract and cache discipline sections
        const result = await extractAndCacheDisciplineSections(
          grievanceId,
          statement,
          articlesViolated ? [articlesViolated] : undefined
        );

        if (!result.success || !result.relevantSections) {
          return {
            success: false,
            error: result.error || 'Failed to extract discipline guidance from PDF'
          };
        }

        disciplineContent = result.relevantSections;
      } else {
        console.log('Non-discipline grievance, skipping discipline guidance extraction');
        disciplineContent = 'Not applicable - this grievance does not appear to be discipline-related.';
      }
    }
    
    if (!disciplineContent) {
      return {
        success: false,
        error: 'No discipline guidance content available'
      };
    }

    // Process evidence
    const processedEvidence = await processEvidenceForFacts(evidence);

    // Build prompt for extracting established facts
    const extractionPrompt = `You are analyzing a grievance case to extract established facts based on legal precedents from discipline guidance.

GRIEVANCE DETAILS:
Statement: ${statement}
Articles Violated: ${articlesViolated || 'Not specified'}
Settlement Desired: ${settlementDesired || 'Not specified'}

GRIEVORS:
${grievors.map(g => `- ${g.firstName} ${g.lastName}`).join('\n')}

WORK INFORMATION:
Job Title: ${workInformation.jobTitle || 'Not specified'}
Work Location: ${workInformation.workLocation || 'Not specified'}
Employer: ${workInformation.employer || 'Not specified'}
Supervisor: ${workInformation.supervisor || 'Not specified'}
Employment Status: ${workInformation.employmentStatus || 'Not specified'}

EVIDENCE:
${processedEvidence.map(e => `
Evidence: ${e.name}
Summary: ${e.summary}
Content: ${e.content?.substring(0, 500)}...
`).join('\n')}

DISCIPLINE GUIDANCE (Brown & Beatty):
${disciplineContent}

TASK:
Analyze the evidence in this specific case against the discipline guidance. Focus purely on factual findings:

1. **Key Issues**: What specific aspects of this case are addressed by the guidance?
2. **Timeline**: What is the chronological sequence of events based on the evidence?
3. **Evidence Analysis**: What does the evidence show in relation to the standards in the guidance?
4. **Factual Findings**: How do the facts of THIS case align with or deviate from the guidance standards?
5. **Missing Information**: What key facts are required by the guidance but not provided in the evidence?

FORMAT YOUR RESPONSE AS:

## Key Issues
- [Key aspects of this specific case addressed by guidance with citation]
- [How guidance applies to the particular circumstances here with citation]
- [Whether proper procedures were followed in this case with citation]
- [Any procedural gaps or compliance issues with citation]

## Timeline of Events
- [Date/Time]: [Event description based on evidence]
- [Date/Time]: [Event description based on evidence]
- [Continue chronologically through all documented events]

## Evidence-Based Issues
- [Specific fact from evidence analyzed against guidance standards with citation]
- [What the evidence shows or fails to show per guidance with citation]

## Additional Required Facts
- [Key facts that the guidance indicates are pertinent but are missing from the evidence with citation]
- [Information that would be needed to fully assess the case per guidance standards with citation]
- [Procedural elements that should be documented but are not evident with citation]

IMPORTANT:
- DO NOT include a title or header at the beginning - start directly with "## Key Issues"
- Focus on factual analysis only, not case strength or weaknesses
- Analyze what the evidence shows in relation to guidance standards
- Connect the actual facts of this case to the guidance principles
- Include specific citations (page numbers, section numbers)
- Be objective and factual rather than evaluative
- For missing facts, identify what the guidance says should be present but isn't`;

    // Use AI to extract established facts
    const response = await generateAIContent(
      'custom',
      {
        statement: statement,
        question: extractionPrompt,
        evidence: processedEvidence,
        grievors: grievors,
        workInformation: workInformation
      }
    );

    const extractedFacts = typeof response === 'string' ? response : response?.answer || '';

    if (!extractedFacts) {
      return { 
        success: false, 
        error: 'Failed to extract established facts' 
      };
    }

    // Store the established facts
    const storedFacts = await prisma.grievanceEstablishedFacts.create({
      data: {
        grievanceId,
        facts: extractedFacts,
        precedents: [] // Keeping empty array for now - field will be removed in future migration
      }
    });

    console.log(`Stored established facts for grievance ${grievanceId}:`, {
      factsLength: extractedFacts.length
    });

    // Index grievance for semantic search after facts are stored
    try {
      await indexGrievance(grievanceId);
    } catch (error) {
      console.error("Failed to index grievance for search:", error);
    }

    const result: EstablishedFacts = {
      id: storedFacts.id,
      grievanceId: storedFacts.grievanceId,
      facts: storedFacts.facts,
      createdAt: storedFacts.createdAt,
      updatedAt: storedFacts.updatedAt
    };

    return {
      success: true,
      facts: result
    };
  } catch (error) {
    console.error('Error extracting established facts:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Update established facts (re-extract)
export async function updateEstablishedFacts(
  grievanceId: string,
  statement: string,
  evidence: Evidence[],
  grievors: Grievor[],
  workInformation: WorkInformation,
  articlesViolated?: string,
  settlementDesired?: string,
  grievanceType?: string
): Promise<{ success: boolean; facts?: EstablishedFacts; error?: string }> {
  try {
    // Delete existing facts
    await prisma.grievanceEstablishedFacts.delete({
      where: { grievanceId }
    });

    // Extract new facts
    return await extractEstablishedFacts(
      grievanceId,
      statement,
      evidence,
      grievors,
      workInformation,
      articlesViolated,
      settlementDesired,
      grievanceType
    );
  } catch (error) {
    console.error('Error updating established facts:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Save manually edited facts
export async function saveEditedFacts(
  grievanceId: string,
  editedFacts: string
): Promise<{ success: boolean; facts?: EstablishedFacts; error?: string }> {
  try {
    // Use upsert to create or update the facts with the manually edited content
    const updatedFacts = await prisma.grievanceEstablishedFacts.upsert({
      where: { grievanceId },
      update: {
        facts: editedFacts,
        updatedAt: new Date()
      },
      create: {
        grievanceId,
        facts: editedFacts,
        precedents: [] // Keeping empty array for now - field will be removed in future migration
      }
    });

    console.log('Saved manually edited facts for grievance:', grievanceId);

    // Index grievance for semantic search after facts update
    try {
      await indexGrievance(grievanceId);
    } catch (error) {
      console.error("Failed to index grievance for search:", error);
    }

    const result: EstablishedFacts = {
      id: updatedFacts.id,
      grievanceId: updatedFacts.grievanceId,
      facts: updatedFacts.facts,
      createdAt: updatedFacts.createdAt,
      updatedAt: updatedFacts.updatedAt
    };

    return {
      success: true,
      facts: result
    };
  } catch (error) {
    console.error('Error saving edited facts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Delete established facts
export async function deleteEstablishedFacts(grievanceId: string): Promise<boolean> {
  try {
    await prisma.grievanceEstablishedFacts.delete({
      where: { grievanceId }
    });
    console.log('Deleted established facts for grievance:', grievanceId);
    return true;
  } catch (error) {
    console.error('Error deleting established facts:', error);
    return false;
  }
}