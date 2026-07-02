import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { AuditLog } from '../audit/audit-log.js';
import type { ConnectorContext, EnterpriseTool } from '../connectors/types.js';
import { allTools, connectors, configuredConnectors, enabledConnectors } from '../connectors/index.js';
import { evaluateToolPolicy } from '../security/policy.js';

export function createEnterpriseMcpServer(context: ConnectorContext, auditLog: AuditLog): McpServer {
  const server = new McpServer({ name: 'raeburnai-enterprise-mcp-server', version: '0.1.0' });
  server.resource('connectors', 'raeburnai://connectors', async () => ({ contents: [{ uri: 'raeburnai://connectors', mimeType: 'application/json', text: JSON.stringify(connectorStatus(context), null, 2) }] }));
  server.tool('enterprise.health', 'Return server health and available tools.', {}, async () => ({ content: [{ type: 'text', text: JSON.stringify({ status: 'ok', ...connectorStatus(context), tools: allTools(context).map((item) => item.name) }, null, 2) }] }));
  for (const item of allTools(context)) registerTool(server, item, context, auditLog);
  return server;
}

function connectorStatus(context: ConnectorContext) {
  return { connectors: connectors.map((connector) => ({ name: connector.name, displayName: connector.displayName, enabled: enabledConnectors(context).some((item) => item.name === connector.name), configured: connector.configured(context.config) })), configuredConnectors: configuredConnectors(context).map((item) => item.name) };
}

function registerTool(server: McpServer, enterpriseTool: EnterpriseTool, context: ConnectorContext, auditLog: AuditLog) {
  server.tool(enterpriseTool.name, enterpriseTool.description, enterpriseTool.inputSchema.shape, async (input: unknown) => {
    const policy = evaluateToolPolicy(context.config, enterpriseTool.name, enterpriseTool.risk);
    if (!policy.allowed || policy.approvalRequired) return { content: [{ type: 'text', text: policy.reason ?? 'Action requires review.' }], isError: true };
    const parsed = enterpriseTool.inputSchema.parse(input);
    const output = await enterpriseTool.run(parsed, context);
    auditLog.record({ tool: enterpriseTool.name, connector: enterpriseTool.connector, risk: enterpriseTool.risk, input: parsed, output, status: 'success' });
    return { content: [{ type: 'text', text: typeof output === 'string' ? output : JSON.stringify(output, null, 2) }] };
  });
}

export async function startStdioServer(server: McpServer) {
  await server.connect(new StdioServerTransport());
}
