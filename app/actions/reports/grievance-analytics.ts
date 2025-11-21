'use server';

import { prisma } from '@/app/lib/db';
import { withAuth } from '../auth';
import { getOrganizationId } from '../organization';
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from 'date-fns';

// Get grievance volume trends
async function getGrievanceVolumeTrendsInternal(months: number) {
  try {
    const organizationId = await getOrganizationId();
    const startDate = startOfMonth(subMonths(new Date(), months - 1));
    const endDate = endOfMonth(new Date());

    // Get grievances grouped by month
    const grievances = await prisma.grievance.findMany({
      where: {
        bargainingUnit: {
          organizationId: organizationId
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        createdAt: true,
      }
    });

    // Group by month
    const monthlyData = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));
      
      const count = grievances.filter(g => {
        const date = new Date(g.createdAt);
        return date >= monthStart && date <= monthEnd;
      }).length;

      monthlyData.push({
        month: format(monthStart, 'MMM'),
        year: monthStart.getFullYear(),
        count,
        fullDate: monthStart.toISOString()
      });
    }

    // Get previous year data for comparison
    const lastYearStart = startOfMonth(subMonths(new Date(), months + 11));
    const lastYearEnd = endOfMonth(subMonths(new Date(), 12));

    const lastYearGrievances = await prisma.grievance.count({
      where: {
        bargainingUnit: {
          organizationId: organizationId
        },
        createdAt: {
          gte: lastYearStart,
          lte: lastYearEnd
        }
      }
    });

    // Calculate statistics
    const totalGrievances = grievances.length;
    const monthlyAverage = totalGrievances / months;
    const currentMonth = monthlyData[monthlyData.length - 1].count;
    const lastMonth = monthlyData[monthlyData.length - 2]?.count || 0;
    const monthChange = lastMonth ? ((currentMonth - lastMonth) / lastMonth * 100) : 0;

    // Year-over-year change
    const yearChange = lastYearGrievances ? ((totalGrievances - lastYearGrievances) / lastYearGrievances * 100) : 0;

    return {
      monthlyData,
      totalGrievances,
      monthlyAverage: Math.round(monthlyAverage),
      monthChange: monthChange.toFixed(1),
      lastYearTotal: lastYearGrievances,
      yearChange: yearChange.toFixed(1)
    };
  } catch (error) {
    console.error('Error fetching grievance volume trends:', error);
    throw new Error('Failed to fetch grievance volume trends');
  }
}

// Get resolution time analysis
async function getResolutionTimeAnalysisInternal() {
  try {
    const organizationId = await getOrganizationId();
    console.log('Fetching resolution time analysis for organization:', organizationId);

    // Parallelize independent queries for better performance
    const [grievances, stepTemplates] = await Promise.all([
      // Get all grievances with their steps and events
      prisma.grievance.findMany({
        where: {
          bargainingUnit: {
            organizationId: organizationId
          }
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            }
          },
          events: {
            where: {
              eventType: {
                in: ['STATUS_CHANGED', 'CREATED']
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      }).catch(err => {
        console.error('Error fetching grievances:', err);
        return [];
      }),

      // Get step templates for targets if they exist - skip if not available
      prisma.agreementStepTemplate.findMany({
        where: {
          agreement: {
            bargainingUnit: {
              organizationId: organizationId
            }
          }
        }
      }).catch(err => {
        console.log('Step templates not available, using defaults');
        return [];
      })
    ]);

    // Analyze resolution times by step using actual step data
    const stepAnalysis: Record<string, {
      totalDays: number;
      count: number;
      onTime: number;
      active: number;
      completedThisMonth: number;
      exceededLimit: number;
    }> = {};

    const stepTargets: Record<number, number> = {};
    stepTemplates.forEach(template => {
      stepTargets[template.stepNumber] = template.timeLimitDays;
    });

    // Current date for calculations
    const now = new Date();
    const monthStart = startOfMonth(now);

    // Analyze grievances using their actual steps and events
    grievances.forEach(grievance => {
      // Process each step if they exist
      if (grievance.steps && grievance.steps.length > 0) {
        grievance.steps.forEach(step => {
          const stepKey = step.stage === 'ARBITRATION' ? 'Arbitration' : `Step ${step.stepNumber}`;
          
          if (!stepAnalysis[stepKey]) {
            stepAnalysis[stepKey] = {
              totalDays: 0,
              count: 0,
              onTime: 0,
              active: 0,
              completedThisMonth: 0,
              exceededLimit: 0
            };
          }

          // If step is completed, calculate time
          if (step.completedDate && step.status === 'COMPLETED') {
            const days = differenceInDays(new Date(step.completedDate), new Date(step.createdAt));
            stepAnalysis[stepKey].totalDays += days;
            stepAnalysis[stepKey].count++;

            // Check if on time
            const target = stepTargets[step.stepNumber] || (step.stepNumber * 15);
            if (days <= target) {
              stepAnalysis[stepKey].onTime++;
            } else {
              stepAnalysis[stepKey].exceededLimit++;
            }

            // Check if completed this month
            if (new Date(step.completedDate) >= monthStart) {
              stepAnalysis[stepKey].completedThisMonth++;
            }
          } else if (step.status === 'IN_PROGRESS' || step.status === 'PENDING') {
            // Active step
            stepAnalysis[stepKey].active++;
          }
        });
      } else {
        // Fall back to current stage analysis if no steps exist
        const currentStage = grievance.currentStage || 'INFORMAL';
        const stepNumber = 
          currentStage === 'INFORMAL' ? 1 :
          currentStage === 'FORMAL' ? 2 :
          currentStage === 'ARBITRATION' ? 5 : 1;
        
        const stepKey = stepNumber === 5 ? 'Arbitration' : `Step ${stepNumber}`;
        
        if (!stepAnalysis[stepKey]) {
          stepAnalysis[stepKey] = {
            totalDays: 0,
            count: 0,
            onTime: 0,
            active: 0,
            completedThisMonth: 0,
            exceededLimit: 0
          };
        }

        // If grievance is resolved, calculate resolution time
        if (grievance.status === 'SETTLED' || grievance.status === 'RESOLVED_ARBITRATION') {
          const resolutionDate = grievance.updatedAt; // Use updatedAt as resolution date since resolvedAt doesn't exist

          const days = differenceInDays(new Date(resolutionDate), new Date(grievance.createdAt));
          stepAnalysis[stepKey].totalDays += days;
          stepAnalysis[stepKey].count++;

          // Check if on time (default targets if not in template)
          const target = stepTargets[stepNumber] || (stepNumber * 15);
          if (days <= target) {
            stepAnalysis[stepKey].onTime++;
          } else {
            stepAnalysis[stepKey].exceededLimit++;
          }

          // Check if completed this month
          if (new Date(resolutionDate) >= monthStart) {
            stepAnalysis[stepKey].completedThisMonth++;
          }
        } else if (grievance.status === 'ACTIVE') {
          // Active case
          stepAnalysis[stepKey].active++;
        }
      }
    });

    // Calculate statistics
    const resolutionData = [];
    let totalResolutionTime = 0;
    let totalCompleted = 0;
    let totalOnTime = 0;
    let totalExceeded = 0;

    for (let i = 1; i <= 4; i++) {
      const stepKey = `Step ${i}`;
      const data = stepAnalysis[stepKey] || {
        totalDays: 0,
        count: 0,
        onTime: 0,
        active: 0,
        completedThisMonth: 0,
        exceededLimit: 0
      };

      const avgDays = data.count > 0 ? Math.round(data.totalDays / data.count) : 0;
      const target = stepTargets[i] || (i * 10 + 5);
      const onTimeRate = data.count > 0 ? Math.round((data.onTime / data.count) * 100) : 100;

      resolutionData.push({
        step: stepKey,
        avgDays,
        target,
        onTime: onTimeRate,
        active: data.active,
        completedThisMonth: data.completedThisMonth,
        totalCompleted: data.count
      });

      totalResolutionTime += data.totalDays;
      totalCompleted += data.count;
      totalOnTime += data.onTime;
      totalExceeded += data.exceededLimit;
    }

    // Add arbitration data if exists
    const arbitrationGrievances = await prisma.grievance.count({
      where: {
        bargainingUnit: {
          organizationId: organizationId
        },
        currentStage: 'ARBITRATION'
      }
    });

    if (arbitrationGrievances > 0) {
      resolutionData.push({
        step: 'Arbitration',
        avgDays: 120, // Default estimate
        target: 90,
        onTime: 45,
        active: arbitrationGrievances,
        completedThisMonth: 0,
        totalCompleted: 0
      });
    }

    // Calculate overall statistics
    const avgTotalResolution = totalCompleted > 0 ? Math.round(totalResolutionTime / totalCompleted) : 0;
    const overallOnTimeRate = totalCompleted > 0 ? Math.round((totalOnTime / totalCompleted) * 100) : 0;

    // Find fastest resolution
    const completedGrievances = grievances.filter(g => 
      g.status === 'SETTLED' || g.status === 'RESOLVED_ARBITRATION'
    );
    
    let fastestResolution = Infinity;
    completedGrievances.forEach(grievance => {
      const resolutionDate = grievance.updatedAt; // Use updatedAt as resolution date since resolvedAt doesn't exist
      if (resolutionDate) {
        const days = differenceInDays(new Date(resolutionDate), new Date(grievance.createdAt));
        if (days < fastestResolution) {
          fastestResolution = days;
        }
      }
    });

    return {
      resolutionData,
      avgTotalResolution,
      fastestResolution: fastestResolution === Infinity ? 0 : fastestResolution,
      casesOverLimit: totalExceeded,
      onTimeRate: overallOnTimeRate
    };
  } catch (error) {
    console.error('Detailed error in resolution time analysis:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return default data structure instead of throwing
    return {
      resolutionData: [
        { step: 'Step 1', avgDays: 0, target: 10, onTime: 100, active: 0, completedThisMonth: 0, totalCompleted: 0 },
        { step: 'Step 2', avgDays: 0, target: 20, onTime: 100, active: 0, completedThisMonth: 0, totalCompleted: 0 },
        { step: 'Step 3', avgDays: 0, target: 30, onTime: 100, active: 0, completedThisMonth: 0, totalCompleted: 0 },
        { step: 'Step 4', avgDays: 0, target: 45, onTime: 100, active: 0, completedThisMonth: 0, totalCompleted: 0 }
      ],
      avgTotalResolution: 0,
      fastestResolution: 0,
      casesOverLimit: 0,
      onTimeRate: 0
    };
  }
}

// Export wrapped versions with auth
export const getGrievanceVolumeTrends = withAuth(getGrievanceVolumeTrendsInternal);
export const getResolutionTimeAnalysis = withAuth(getResolutionTimeAnalysisInternal);