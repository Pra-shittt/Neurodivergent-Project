# AI Coding Assistant Instructions (AGENTS.md)

Welcome! This repository houses the **Gender-Neutral Neurodiversity Portal (ASD & ADHD)**.

## Core Reference Files
Before proposing code changes or building backend steps, consult these context documents:
1. `PROJECT.md` - Product vision, roles, and core features.
2. `STACK.md` - Technology stack and library versions.
3. `CONVENTIONS.md` - Folder architecture, naming conventions, and API contract formats.
4. `DECISIONS.md` - Key architectural choices (e.g., standard security, mock API transition).
5. `TODO.md` - Step-by-step roadmap for current and upcoming tasks.

## Guidelines for AI Assistants
- Follow the **Phase 2 Backend Roadmap** outlined in `TODO.md` step-by-step.
- Do NOT rewrite or alter existing frontend React components when building backend routes; connect to `src/services/mockApi.js` interfaces seamlessly.
- Ensure all Express routes use the standard JSON response format: `{ "success": boolean, "data": ... }` or `{ "success": false, "error": ... }`.