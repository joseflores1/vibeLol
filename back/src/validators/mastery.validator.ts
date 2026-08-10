import { z } from 'zod';

// Champion ID param path — numeric string from the URL.
export const championIdParamSchema = z.object({
  championId: z.coerce.number().int().min(0),
});

export type ChampionIdParam = z.infer<typeof championIdParamSchema>;