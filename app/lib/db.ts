import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Configure logging based on environment variables
const logConfig = process.env.PRISMA_LOG_QUERIES === 'true' 
  ? [
      { emit: 'event' as const, level: 'query' as const },
      { emit: 'stdout' as const, level: 'error' as const },
      { emit: 'stdout' as const, level: 'warn' as const },
    ]
  : ['error' as const, 'warn' as const];

export const prisma = global.prisma || new PrismaClient({
  log: logConfig,
})

// Add query logging with timing only if explicitly enabled
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
  
  // Query event logging disabled for now due to TypeScript issues
  // if (process.env.PRISMA_LOG_QUERIES === 'true') {
  //   prisma.$on('query', (e) => {
  //     console.log(`[PRISMA] Query: ${e.query}`)
  //     console.log(`[PRISMA] Params: ${e.params}`)
  //     console.log(`[PRISMA] Duration: ${e.duration}ms`)
  //     console.log('---')
  //   })
  // }
}

// Export types for use in other files
export type { Prisma } from '@prisma/client' 