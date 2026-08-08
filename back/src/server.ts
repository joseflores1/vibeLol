import { app } from './app.js';
import { env } from './config/env.js';
import { ddragonClient } from './ddragon/client.js';

// Eagerly fetch Data Dragon static data (champions, items, spells) before
// starting the server. This takes ~1-2s on first boot (fetches ~200KB from
// the Data Dragon CDN) and ensures /api/v1/static/* endpoints work
// immediately. Refreshes hourly via refreshIfNeeded().
await ddragonClient.init();
// Hourly version check — refetches all data if Data Dragon bumped versions.
setInterval(() => { void ddragonClient.refreshIfNeeded(); }, 60 * 60 * 1000);

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});