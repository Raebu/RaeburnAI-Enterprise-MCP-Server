import { describe, expect, it } from 'vitest';
import { AuditLog } from '../../src/audit/audit-log.js';
import { createEnterpriseMcpServer } from '../../src/mcp/server.js';
import { loadConfig } from '../../src/config.js';
import { createLogger } from '../../src/logger.js';

describe('MCP server startup', () => {
  it('creates the server with no configured enterprise credentials', () => {
    const config = loadConfig({ LOG_LEVEL: 'silent' });
    const logger = createLogger(config);
    const server = createEnterpriseMcpServer({ config, logger }, new AuditLog(logger, true, true));
    expect(server).toBeDefined();
  });
});
