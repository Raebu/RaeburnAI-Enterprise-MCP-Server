# Changelog

All notable changes to this project will be documented in this file.

## 0.1.0 - 2026-07-02

### Added

- Initial production-oriented MCP server scaffold.
- Enterprise connector framework.
- Gmail, Calendar, GitHub, Slack, SharePoint, Salesforce, HubSpot, Notion, Google Drive and Supabase connectors.
- Typed environment configuration with Zod.
- Tool policy controls for allowlists, denylists and approval requirements.
- Audit logging with secret redaction.
- Output-size limiting for MCP tool responses.
- Dockerfile and Docker Compose example.
- GitHub Actions CI, CodeQL and Dependabot.
- Unit, integration and e2e startup tests.
- Standard RaeburnAI README structure, security policy, contribution guide and production checklist.

### Security

- Write/admin tools require human approval by default.
- Production mode refuses to start if write approval is disabled.
- Salesforce connector accepts read-only SOQL queries only.
- Supabase connector supports table allowlisting.
