import type { Request, Response } from 'express';
import { ddragonClient } from '../ddragon/client.js';

// HTTP layer for static Data Dragon metadata (champions, items, spells,
// version). These are in-memory datasets cached by the DdragonClient
// singleton on startup. No Riot API, no DB, no caching concerns — these
// endpoints just read from the singleton and shape the response.
export const staticController = {
  // GET /api/v1/static/version
  async getVersion(_req: Request, res: Response) {
    res.json({ success: true, data: { version: ddragonClient.getVersion() } });
  },

  // GET /api/v1/static/champions
  async getChampions(_req: Request, res: Response) {
    const version = ddragonClient.getVersion();
    const champions = Array.from(ddragonClient.getChampions().values());
    res.json({ success: true, data: { version, champions } });
  },

  // GET /api/v1/static/items
  async getItems(_req: Request, res: Response) {
    const version = ddragonClient.getVersion();
    const items = Array.from(ddragonClient.getItems().values());
    res.json({ success: true, data: { version, items } });
  },

  // GET /api/v1/static/spells
  async getSpells(_req: Request, res: Response) {
    const version = ddragonClient.getVersion();
    const spells = Array.from(ddragonClient.getSpells().values());
    res.json({ success: true, data: { version, spells } });
  },
};