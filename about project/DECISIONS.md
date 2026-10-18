# Architectural Decision Record (ADR)

## Decision 1: Standard Enterprise Security vs. Full Client-Side E2EE
- **Status**: Accepted
- **Context**: Evaluated End-to-End Encryption (E2EE) vs. Standard Enterprise Security (JWT + Bcrypt + RBAC + TLS).
- **Rationale**: Full client-side E2EE breaks MongoDB backend aggregation pipelines (`$group`, `$facet`) for trend analytics and prevents Phase 2 AI NLP analysis on daily journals. Standard enterprise security delivers industry-standard protection while keeping backend engineering capabilities fully functional.

## Decision 2: Standalone Full Mock Frontend First (Phase 1)
- **Status**: Accepted
- **Context**: Decided whether to build full frontend UI first or build full-stack sliced feature by feature.
- **Rationale**: Building the complete frontend with a mock API layer (`mockApi.js`) provides immediate visual confirmation of all screens, UI states, and user journeys. Replacing `mockApi.js` with Express backend endpoints in Phase 2 requires zero frontend component rewrites.

## Decision 3: Modular Psychometric Template Schema
- **Status**: Accepted
- **Context**: Hardcoding assessment questions vs. dynamic database templates.
- **Rationale**: Storing questionnaire templates (`AssessmentTemplate`) in MongoDB allows adding or modifying assessments (CAT-Q, ASRS, AQ-10) dynamically without frontend or backend code deployment.