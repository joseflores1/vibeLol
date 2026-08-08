import { z } from 'zod';

// Param schema for routes that resolve a Riot ID (gameName#tagLine).
// Both halves are required; Riot IDs are case-sensitive.
export const riotIdParamSchema = z.object({
  gameName: z.string().min(1),
  tagLine: z.string().min(1),
});

// Types inferred from the schemas, reused as the service input types
// so validation and business logic never drift apart.
export type RiotIdParam = z.infer<typeof riotIdParamSchema>;