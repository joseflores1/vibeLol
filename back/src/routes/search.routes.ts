import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';

// Search routes. Mounted under /api/v1/search by the root router. Reads
// only from the cached Account table — never calls Riot.
const router = Router();

router.get('/suggest', searchController.getSuggestions);

export { router as searchRoutes };
