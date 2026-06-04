# Workbench Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `apps/web` into the single-surface Workbench defined by `docs/prototype`, with canvas-first editing, a block library, a type-safe parameter panel, test run modal, and collapsible run log.

**Architecture:** Keep the existing Vite React app and backend API contract, but replace the default UI hierarchy. Extract workflow view-model logic into testable modules, then render small focused components from that model.

**Tech Stack:** React 19, TypeScript, Vite, React Flow, lucide-react, Vitest.

---

### Task 1: View Model And Tests

**Files:**
- Create: `apps/web/src/workbenchModel.ts`
- Create: `apps/web/src/workbenchModel.test.ts`
- Modify: `apps/web/package.json`

- [x] Add Vitest test script and dev dependency.
- [x] Write failing tests for node semantic labels, source filtering, and reference value resolution.
- [x] Implement minimal view-model helpers to pass the tests.

### Task 2: Single Workbench UI

**Files:**
- Replace: `apps/web/src/App.tsx`
- Replace: `apps/web/src/styles.css`

- [x] Keep workflow loading, JSON upload, save operation submission, sample fallback, and test run calls.
- [x] Remove default dashboard, contract, trace, operation export, capability, and multi-tab app shell surfaces.
- [x] Render header, left block library, center canvas, right parameter panel, test run modal, and bottom run log.
- [x] Make source choices open from value cells and filter by expected type.

### Task 3: Verification

**Files:**
- Verify: `apps/web`

- [x] Run focused tests.
- [x] Run production build.
- [x] Start local dev server and inspect the redesigned UI in browser at desktop and mobile widths.
