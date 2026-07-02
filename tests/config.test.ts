import { describe, expect, it } from 'vitest';
import { evaluateToolPolicy } from '../src/security/policy.js';
import { isConnectorEnabled, loadConfig } from '../src/config.js';

describe('configuration', () => {
  it('loads defaults safely', () => {
    const config = loadConfig({});
    expect(config.NODE_ENV).toBe('development');
    expect(config.REQUIRE_APPROVAL_FOR_WRITES).toBe(true);
    expect(config.AUDIT_LOG_ENABLED).toBe(true);
  });

  it('parses enabled connectors from CSV', () => {
    const config = loadConfig({ ENABLED_CONNECTORS: 'github, slack' });
    expect(isConnectorEnabled(config, 'github')).toBe(true);
    expect(isConnectorEnabled(config, 'gmail')).toBe(false);
  });
});

describe('tool policy', () => {
  it('requires review for write tools by default', () => {
    const config = loadConfig({});
    expect(evaluateToolPolicy(config, 'slack.post_message', 'write')).toMatchObject({ allowed: true, approvalRequired: true });
  });

  it('blocks denied tools', () => {
    const config = loadConfig({ DENIED_TOOLS: 'github.create_issue' });
    expect(evaluateToolPolicy(config, 'github.create_issue', 'write').allowed).toBe(false);
  });
});
