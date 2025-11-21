'use server';

import { prisma } from '@/app/lib/db';
import { withAuth } from './auth';
import { getOrganizationId } from './organization';
import { getAgreementResponse } from './agreements';
import { revalidatePath } from 'next/cache';

// Internal implementation to extract and save collective agreement articles
async function extractAndSaveArticlesInternal(grievanceId: string, agreementId: string) {
  const organizationId = await getOrganizationId();
  
  try {
    // Get the grievance with report to find violated articles
    const grievance = await prisma.grievance.findFirst({
      where: {
        id: grievanceId,
        organizationId
      },
      include: {
        report: true
      }
    });

    if (!grievance) {
      throw new Error('Grievance not found');
    }

    if (!grievance.report?.articlesViolated || grievance.report.articlesViolated.trim() === '') {
      throw new Error('No articles specified in grievance');
    }

    // Parse the articles string to extract individual article numbers
    // Handle formats like: "1, 2, 5, 6, 7, 8" or "Article 1, Article 2.3, 5.1"
    const articlePattern = /(?:article\s*)?(\d+(?:\.\d+)?)/gi;
    const matches = grievance.report.articlesViolated.match(articlePattern);
    
    if (!matches || matches.length === 0) {
      throw new Error('No article numbers found in articlesViolated field');
    }

    // Extract clean article numbers
    const articleNumbers = matches.map(match => {
      const numberMatch = match.match(/\d+(?:\.\d+)?/);
      return numberMatch ? numberMatch[0] : null;
    }).filter(Boolean) as string[];

    console.log('Searching for articles:', articleNumbers);

    // Search for each article individually in the collective agreement
    const articleResults: Array<{
      articleNumber: string;
      content: string;
      searchResults: any[];
    }> = [];

    for (const articleNum of articleNumbers) {
      try {
        const searchQuery = `Article ${articleNum}`;
        console.log(`Searching collective agreement for: ${searchQuery}`);
        
        const response = await getAgreementResponse(
          `Find Article ${articleNum} in the collective agreement. Return ONLY the exact text of Article ${articleNum} without any interpretation, summary, or additional commentary. Just the article text itself. IMPORTANT: Exclude any table of contents entries - only return the actual article content.`, 
          agreementId
        );
        
        if (response && response.llmAnswer) {
          // Use the LLM's filtered response directly
          articleResults.push({
            articleNumber: articleNum,
            content: response.llmAnswer,
            searchResults: []
          });
        }
      } catch (error) {
        console.error(`Error searching for Article ${articleNum}:`, error);
        // Continue with other articles even if one fails
      }
    }

    if (articleResults.length === 0) {
      throw new Error('No articles could be retrieved from the collective agreement');
    }

    // Format the results for storage - just the article text, no commentary
    const formattedContent = articleResults.map(result => {
      return `## Article ${result.articleNumber}\n\n${result.content}`;
    }).join('\n\n---\n\n');

    // Check if we already have saved articles for this grievance
    const existingArticles = await prisma.grievanceArticles.findUnique({
      where: {
        grievanceId
      }
    });

    if (existingArticles) {
      // Update existing record
      await prisma.grievanceArticles.update({
        where: {
          grievanceId
        },
        data: {
          articleNumbers: articleNumbers,
          content: formattedContent,
          lastUpdated: new Date()
        }
      });
    } else {
      // Create new record
      await prisma.grievanceArticles.create({
        data: {
          grievanceId,
          agreementId,
          articleNumbers: articleNumbers,
          content: formattedContent
        }
      });
    }

    // Revalidate the grievance page
    revalidatePath(`/product/grievances/${grievanceId}`);

    return {
      success: true,
      articlesFound: articleNumbers.length,
      articles: articleNumbers
    };

  } catch (error) {
    console.error('Error extracting and saving articles:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to extract collective agreement articles');
  }
}

// Internal implementation to fetch saved articles
async function fetchSavedArticlesInternal(grievanceId: string) {
  const organizationId = await getOrganizationId();
  
  try {
    const savedArticles = await prisma.grievanceArticles.findFirst({
      where: {
        grievanceId
      }
    });

    return savedArticles;
  } catch (error) {
    console.error('Error fetching saved articles:', error);
    return null;
  }
}

// Export wrapped versions
export const extractAndSaveArticles = withAuth(extractAndSaveArticlesInternal);
export const fetchSavedArticles = withAuth(fetchSavedArticlesInternal);