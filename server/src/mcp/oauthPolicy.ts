import { registeredRedirect } from './oauthSecurity';

export const SCOPE_LABELS: Record<string, string> = {
  mcp_connect: 'Connect to CodeBegun',
  mcp_students_read: 'Read permitted student profiles',
  mcp_batches_read: 'Read permitted batches',
  mcp_attendance_read: 'Read permitted attendance',
  mcp_assessments_read: 'Read permitted exam results',
  mcp_finance_read: 'Read permitted fees and balances',
  mcp_placements_read: 'Read permitted placement outcomes',
  mcp_leads_read: 'Read permitted CRM leads',
  mcp_calls_read: 'Read permitted Outpero call metadata and summaries',
  offline_access: 'Stay connected for up to 30 days (revocable at any time)',
};

export interface McpClient {
  id: string;
  name: string;
  redirectUris: string[];
  scopes: string[];
  applicationType: 'web' | 'native';
  tokenEndpointAuthMethod: 'none' | 'client_secret_basic';
  secretHash?: string;
}

export class McpError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}

/** Static pre-registration only. No caller-supplied URLs are fetched. */
export function mcpConfig() {
  const issuer = process.env.MCP_ISSUER_URL || '';
  const resource = process.env.MCP_RESOURCE_URL || '';
  let origin: URL;
  try {
    origin = new URL(issuer);
    const local = process.env.NODE_ENV !== 'production' && origin.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
    if ((!local && origin.protocol !== 'https:') || origin.origin !== issuer || resource !== `${issuer}/mcp`) throw Error();
  } catch { throw new McpError('mcp_not_configured', 503); }
  let clients: McpClient[];
  try {
    clients = JSON.parse(process.env.MCP_OAUTH_CLIENTS || '[]');
    if (!Array.isArray(clients) || !clients.length) throw Error();
    const ids = new Set<string>();
    for (const client of clients) {
      if (!client || typeof client.id !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(client.id) || ids.has(client.id) ||
          typeof client.name !== 'string' || !client.name.trim() || client.name.length > 100 ||
          !['web', 'native'].includes(client.applicationType) ||
          !['none', 'client_secret_basic'].includes(client.tokenEndpointAuthMethod) ||
          !Array.isArray(client.redirectUris) || !client.redirectUris.length || client.redirectUris.length > 10 ||
          !client.redirectUris.every(uri => typeof uri === 'string' && uri.length <= 2048 && !uri.includes('*') &&
            registeredRedirect(uri, [uri]) && (client.applicationType === 'native' || uri.startsWith('https://'))) ||
          !Array.isArray(client.scopes) || !client.scopes.includes('mcp_connect') ||
          !client.scopes.every(s => Object.prototype.hasOwnProperty.call(SCOPE_LABELS, s)) ||
          (client.tokenEndpointAuthMethod === 'client_secret_basic' && !/^[a-f0-9]{64}$/.test(client.secretHash || '')) ||
          (client.tokenEndpointAuthMethod === 'none' && client.secretHash)) throw Error();
      ids.add(client.id);
    }
  } catch { throw new McpError('mcp_not_configured', 503); }
  const origins = [issuer, ...(process.env.MCP_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean)];
  for (const value of origins) {
    try {
      const url = new URL(value);
      if (url.origin !== value || (url.protocol !== 'https:' && value !== issuer)) throw Error();
    } catch { throw new McpError('mcp_not_configured', 503); }
  }
  return { issuer, resource, clients, origins, secure: origin.protocol === 'https:', host: origin.host };
}

export function registeredClient(id: unknown): McpClient {
  const client = typeof id === 'string' && mcpConfig().clients.find(c => c.id === id);
  if (!client) throw new McpError('invalid_client', 401);
  return client;
}

export function parseScopes(value: unknown, client: McpClient): string[] {
  if (typeof value !== 'string' || value.length > 1000 || !/^[\x21-\x7e]+(?: [\x21-\x7e]+)*$/.test(value)) throw new McpError('invalid_scope');
  const scopes = [...new Set(value.split(' '))];
  if (!scopes.includes('mcp_connect') || !scopes.every(s => client.scopes.includes(s) && Object.prototype.hasOwnProperty.call(SCOPE_LABELS, s))) throw new McpError('invalid_scope');
  return scopes;
}

/** Express's parsed arrays/objects are never valid OAuth scalar parameters. */
export function scalarParameters(value: unknown, allowed: readonly string[]): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new McpError('invalid_request');
  const entries = Object.entries(value);
  if (entries.some(([k, v]) => !allowed.includes(k) || typeof v !== 'string' || v.length > 4096)) throw new McpError('invalid_request');
  return Object.fromEntries(entries) as Record<string, string>;
}
