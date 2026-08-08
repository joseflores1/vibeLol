import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { prismaQueryInsights } from "@prisma/sqlcommenter-query-insights";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Prisma client singleton. Re-export this everywhere — never instantiate
// PrismaClient directly in services.
const prisma = new PrismaClient({
  adapter,
  comments: [prismaQueryInsights()],
});

export { prisma };