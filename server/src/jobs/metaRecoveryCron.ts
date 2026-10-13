import { syncConnectedMetaSources } from '../services/metaRecoveryService';
export function startMetaRecoveryScheduler() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await syncConnectedMetaSources(); } catch (e: any) { console.error('[META-RECOVERY]', e.message); } finally { running = false; }
  };
  setTimeout(tick, 20000);
  setInterval(tick, 5 * 60000);
  console.log('Meta recovery sync scheduled every 5 minutes');
}
