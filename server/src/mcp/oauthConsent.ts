import { McpIdentity } from './identity';
import { McpClient, McpError, parseScopes } from './oauthPolicy';
import { canUseTool, tools } from './tools';

/** A new, explicit consent choice for clients still requesting only connection
 * access. Never apply this offer to an existing grant or a refresh request. */
export function readConsentOffer(identity: McpIdentity, client: McpClient, requested: string[]) {
  if (requested.some(scope => !['mcp_connect', 'offline_access'].includes(scope))) return [];
  const reads = [...new Set(tools.filter(tool => canUseTool(identity, client.scopes, tool)).map(tool => tool.scope))];
  if (!reads.length) return [];
  return ['mcp_connect', ...reads, ...(client.scopes.includes('offline_access') ? ['offline_access'] : [])];
}

/** Use only the server-stored offer shown at login, and recheck current access.
 * Newly added permissions must never expand what the user saw on that page. */
export function acceptReadConsent(offered: unknown, identity: McpIdentity, client: McpClient, requested: string[]) {
  const current = readConsentOffer(identity, client, requested);
  if (!Array.isArray(offered) || offered.length < 2 || !offered.includes('mcp_connect') ||
      !offered.some(scope => scope !== 'mcp_connect' && scope !== 'offline_access') ||
      !offered.every(scope => typeof scope === 'string' && current.includes(scope))) throw new McpError('invalid_scope', 403);
  return parseScopes(offered.join(' '), client).join(' ');
}
