import { Router } from 'express';
import { staticController } from '../controllers/static.controller.js';

// Routes for static Data Dragon metadata (champions, items, spells, version).
// Mounted under /api/v1/static by the root router. These endpoints read
// from the DdragonClient singleton (in-memory, populated on startup).
const router = Router();

router.get('/version', staticController.getVersion);
router.get('/champions', staticController.getChampions);
router.get('/items', staticController.getItems);
router.get('/spells', staticController.getSpells);
router.get('/runes', staticController.getRunes);
router.get('/queues', staticController.getQueues);

export { router as staticRoutes };
