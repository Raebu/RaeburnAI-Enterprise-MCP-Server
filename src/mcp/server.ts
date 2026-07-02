import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ZodError } from 'zod';
import type { AuditLog } from '../audit/audit-log.js';
import type { ConnectorContext, EnterpriseTool } from '../connectors/types.js';
import { allTools, connectors, configuredConnectors, enabledConnectors } from '../connectors/index.js';
import { evaluateToolPolicy, limitToolResult } from '../security/policy.js';

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
    const startedAt = Date.now();
    const policy = evaluateToolPolicy(context.config, enterpriseTool.name, enterpriseTool.risk);
    if (!policy.allowed || policy.approvalRequired) {
      auditLog.record({ tool: enterpriseTool.name, connector: enterpriseTool.connector, risk: enterpriseTool.risk, input, status: policy.allowed ? 'approval_required' : 'blocked', reason: policy.reason, durationMs: Date.now() - startedAt });
      return { content: [{ type: 'text', text: policy.reason ?? 'Action requires review.' }], isError: true };
    }

    try {
      const parsed = enterpriseTool.inputSchema.parse(input);
      const output = await enterpriseTool.run(parsed, context);
      const text = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
      auditLog.record({ tool: enterpriseTool.name, connector: enterpriseTool.connector, risk: enterpriseTool.risk, input: parsed, output, status: 'success', durationMs: Date.now() - startedAt });
      return { content: [{ type: 'text', text: limitToolResult(text, context.config.MAX_TOOL_RESULT_BYTES) }] };
    } catch (error) {
      const message = error instanceof ZodError ? error.issues.map((issue) => issue.message).join('; ') : error instanceof Error ? error.message : 'Unknown tool error';
      context.logger.warn({ tool: enterpriseTool.name, error: message }, 'mcp_tool_error');
      auditLog.record({ tool: enterpriseTool.name, connector: enterpriseTool.connector, risk: enterpriseTool.risk, input, status: 'error', reason: message, durationMs: Date.now() - startedAt });
      return { content: [{ type: 'text', text: message }], isError: true };
    }
  });
}

export async function startStdioServer(server: McpServer) {
  await server.connect(new StdioServerTransport());
}
