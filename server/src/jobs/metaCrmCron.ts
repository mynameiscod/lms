import { loadAll, getPlatformOwnerTenant, getCredential } from '../services/settingsService';
import { processDueMetaEvents } from '../services/metaCrmEventService';
import { syncRecentSpend, tenantsWithAdAccount, istDay } from '../services/metaAdSpendService';

/**
 * Meta CRM events + ad spend. Runs in the job-runner process only (see server.ts).
 *  - every minute: send due CRM conversion events (retries with backoff live in the service);
 *  - once a night (after 02:00 IST): re-pull the last 3 days of ad spend for every institute
 *    with an ad account saved (Meta revises recent days).
 */
const INTERVAL_MS = 60_000;
const SPEND_HOUR_IST = 2;

export function startMetaCrmScheduler(): void {
  let running = false;
  let lastSpendDay = '';

  const nightlySpend = async () => {
    const now = new Date();
    const hourIst = new Date(now.getTime() + 330 * 60_000).getUTCHours();
    const today = istDay(now);
    if (hourIst < SPEND_HOUR_IST || lastSpendDay === today) return;
    lastSpendDay = today;
    const tenants = new Set(await tenantsWithAdAccount());
    const owner = getPlatformOwnerTenant();
    if (owner && getCredential('META_AD_ACCOUNT_ID', owner)) tenants.add(owner);
    for (const tenantId of tenants) {
      try {
        const r = await syncRecentSpend(tenantId, 3);
        console.log(`[META-SPEND] ${tenantId}: ${r.rows} row(s) for ${r.from}…${r.to}`);
      } catch (err: any) {
        console.error(`[META-SPEND] ${tenantId}: ${err?.message}`);
      }
    }
  };

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await loadAll();
      await processDueMetaEvents();
      await nightlySpend();
    } catch (err: any) {
      console.error('[META-CRM-CRON] Error:', err?.message);
    } finally {
      running = false;
    }
  };
  setInterval(tick, INTERVAL_MS);
  setTimeout(tick, 30_000);
  console.log('📈 Meta CRM events + nightly ad spend scheduled');
}
