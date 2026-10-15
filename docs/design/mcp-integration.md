# CodeBegun MCP development

This branch adds a read-only MCP JSON-RPC endpoint at POST /mcp, authenticated using the existing LMS JWT middleware. The existing Roles screen now includes MCP permissions. Tools cover Outpero call summaries, call history, aggregate leads, and student counts. Every data query is tenant-scoped.

This is NOT ready for production or ChatGPT connector registration. OAuth 2.1, PKCE, audience checks, durable audit logs, security tests, and expanded record-level authorization remain outstanding. No tests have been run. Do not deploy before completing those tasks.

To test locally, authenticate as a user whose custom role includes mcp_connect and a domain permission, then POST JSON-RPC method tools/list to /mcp. Verify that a user without mcp_connect is denied and that records from another tenant are never returned.
