import type { AppConfig } from '../config.js';

export type ToolRisk = 'read' | 'write' | 'admin';

export interface ToolPolicyDecision {
  allowed: boolean;
  approvalRequired: boolean;
  reason?: string;
}

function matchesPattern(pattern: string, toolName: string): boolean {
  if (pattern === toolName) return true;
  if (pattern.endsWith('.*')) return toolName.startsWith(pattern.slice(0, -1));
  return false;
}

function listMatches(patterns: string[], toolName: string): boolean {
  return patterns.some((pattern) => matchesPattern(pattern, toolName));
}

export function evaluateToolPolicy(config: AppConfig, toolName: string, risk: ToolRisk): ToolPolicyDecision {
  if (listMatches(config.DENIED_TOOLS, toolName)) {
    return { allowed: false, approvalRequired: false, reason: `Tool ${toolName} is explicitly denied.` };
  }

  if (config.ALLOWED_TOOLS.length > 0 && !listMatches(config.ALLOWED_TOOLS, toolName)) {
    return { allowed: false, approvalRequired: false, reason: `Tool ${toolName} is not in ALLOWED_TOOLS.` };
  }

  return {
    allowed: true,
    approvalRequired: config.REQUIRE_APPROVAL_FOR_WRITES && risk !== 'read'
  };
}

export function maskSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskSecrets);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      if (/token|secret|password|key|authorization|cookie|credential/i.test(key)) return [key, '[redacted]'];
      return [key, maskSecrets(item)];
    })
  );
}

export function limitToolResult(value: string, maxBytes: number): string {
  const bytes = Buffer.byteLength(value, 'utf8');
  if (bytes <= maxBytes) return value;
  return `${value.slice(0, maxBytes)}\n...[truncated ${bytes - maxBytes} bytes]`;
}
