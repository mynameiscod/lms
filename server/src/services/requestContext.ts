import { AsyncLocalStorage } from 'async_hooks';

/**
 * Which institute the current request (or job step) is working for, available anywhere below it
 * without passing it through every call. Set by tenantResolver for every resolved request, and by
 * runAsTenant() in background jobs.
 *
 * Used where code historically had no institute at hand — mainly the ~20 `new EmailService()`
 * singletons, which used to send every institute's mail as CodeBegun.
 */
const store = new AsyncLocalStorage<{ tenantId?: string }>();

export function runWithTenant<T>(tenantId: string | undefined, fn: () => T): T {
  return store.run({ tenantId: tenantId ? String(tenantId) : undefined }, fn);
}

/** The current institute, or undefined outside any request/job context. */
export function currentTenantId(): string | undefined {
  return store.getStore()?.tenantId;
}
