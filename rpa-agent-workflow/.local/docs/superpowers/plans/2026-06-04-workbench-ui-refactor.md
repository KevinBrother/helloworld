# Workbench UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current visual editor into an engineering-grade workflow workbench with clear mode state, scalable navigation, node contract inspection, traceability, and responsive task views.

**Architecture:** Keep the API/data contracts intact and refactor the React surface around five product regions: global header, navigator, workspace, inspector, and trace dock. The first implementation keeps logic in the web app while establishing explicit UI sections and state names that can be split into files in the next pass.

**Tech Stack:** React 19, TypeScript, Vite, @xyflow/react, lucide-react, CSS custom properties.

---

### Task 1: Regression Checks

**Files:**
- Modify: `apps/web/scripts/ui-regression.mjs`

- [x] Add checks for explicit editor modes, workbench shell regions, trace dock, responsive mobile tabs, and contract-first inspector labels.
- [x] Run `node apps/web/scripts/ui-regression.mjs` and verify it fails before implementation.

### Task 2: Workbench Structure

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] Replace the current header/status/workspace hierarchy with a workbench shell.
- [ ] Add explicit editor mode labels: `Connected AST`, `Sample Projection`, and `Loaded UI JSON`.
- [ ] Add navigator tabs for Workflow, Blocks, and Issues.
- [ ] Add workspace views for Canvas, Outline, and Contract.
- [ ] Add inspector panels for Inputs, Outputs, Contract, and Actions.
- [ ] Add a trace dock for Edit Operations, Run Events, and Raw state.

### Task 3: Responsive Visual System

**Files:**
- Modify: `apps/web/src/styles.css`

- [ ] Replace decorative background-heavy styling with an operational workbench theme.
- [ ] Define stable desktop columns and a single-pane mobile layout.
- [ ] Add mobile view switching so narrow screens show one task surface at a time.
- [ ] Ensure primary controls retain 44px touch targets and visible focus states.

### Task 4: Verification

**Files:**
- Verify: `apps/web/scripts/ui-regression.mjs`
- Verify: `apps/web/src/App.tsx`
- Verify: `apps/web/src/styles.css`

- [ ] Run `node apps/web/scripts/ui-regression.mjs`.
- [ ] Run `pnpm build:web`.
- [ ] Start `pnpm --dir apps/web dev --host 127.0.0.1`.
- [ ] Inspect desktop and narrow layouts in browser.
