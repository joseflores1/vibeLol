import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { prismaQueryInsights } from "@prisma/sqlcommenter-query-insights";
import { env } from "../config/env.js";

const adapter = new PrismaPg({ connectionString: env.databaseUrl });

// Prisma client singleton. Re-export this everywhere — never instantiate
// PrismaClient directly in services.
const prisma = new PrismaClient({
  adapter,
  comments: [prismaQueryInsights()],
});

export { prisma };
