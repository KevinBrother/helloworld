import fs from "node:fs";
import path from "node:path";

const root = new URL("..", import.meta.url);
const appSource = fs.readFileSync(path.join(root.pathname, "src/App.tsx"), "utf8");
const cssSource = fs.readFileSync(path.join(root.pathname, "src/styles.css"), "utf8");
const htmlSource = fs.readFileSync(path.join(root.pathname, "index.html"), "utf8");

const checks = [
  {
    name: "workbench shell has explicit product regions",
    pass:
      appSource.includes("workbench-shell") &&
      appSource.includes("WorkflowNavigator") &&
      appSource.includes("WorkspaceSurface") &&
      appSource.includes("NodeInspector") &&
      appSource.includes("TraceDock"),
  },
  {
    name: "editor mode distinguishes connected, sample, and loaded json states",
    pass:
      appSource.includes("Connected AST") &&
      appSource.includes("Sample Projection") &&
      appSource.includes("Loaded UI JSON") &&
      appSource.includes("mode-label"),
  },
  {
    name: "global actions expose availability and disabled reasons",
    pass:
      appSource.includes("ActionAvailability") &&
      appSource.includes("getActionAvailability") &&
      appSource.includes("disabledReason") &&
      appSource.includes("modeAllowsRun"),
  },
  {
    name: "navigator supports workflow, block, and issue tasks",
    pass: appSource.includes('"workflow"') && appSource.includes('"blocks"') && appSource.includes('"issues"'),
  },
  {
    name: "navigator scales with node filters and block catalog search",
    pass:
      appSource.includes("NodeKindFilter") &&
      appSource.includes("BlockCatalogSearch") &&
      appSource.includes("workflowCapacity") &&
      appSource.includes("filteredBlockCatalog"),
  },
  {
    name: "inspector is organized around node contract objects",
    pass:
      appSource.includes("Input Bindings") &&
      appSource.includes("Exposed Outputs") &&
      appSource.includes("Contract") &&
      appSource.includes("Capabilities"),
  },
  {
    name: "inspector shows binding status and field contract summaries",
    pass:
      appSource.includes("BindingStatusBadge") &&
      appSource.includes("FieldContractSummary") &&
      appSource.includes("contractFieldRows") &&
      appSource.includes("formatContractValue"),
  },
  {
    name: "inspector exposes disabled capability reasons explicitly",
    pass: appSource.includes("CapabilityStatus") && appSource.includes("capability.reason ??"),
  },
  {
    name: "trace dock exposes operations, run events, and raw state",
    pass: appSource.includes("Edit Operations") && appSource.includes("Run Events") && appSource.includes("Raw State"),
  },
  {
    name: "trace dock records operation status and timestamps",
    pass:
      appSource.includes("OperationTraceEntry") &&
      appSource.includes("recordedAt") &&
      appSource.includes("traceStatus") &&
      appSource.includes("formatTraceTime"),
  },
  {
    name: "responsive layout uses a single-task mobile surface",
    pass:
      cssSource.includes("@media (max-width: 760px)") &&
      cssSource.includes(".mobile-surface-switch") &&
      cssSource.includes("grid-template-columns: minmax(0, 1fr);"),
  },
  {
    name: "file upload is exposed as a focusable control",
    pass: !appSource.includes('<label className="icon-button file-button">') && !cssSource.includes(".file-button input {\n  display: none;"),
  },
  {
    name: "workflow canvas nodes stay keyboard focusable",
    pass: !appSource.includes("nodesFocusable={false}") && !appSource.includes("edgesFocusable={false}"),
  },
  {
    name: "service error state includes retry recovery",
    pass: appSource.includes("handleRetryWorkflowService") && appSource.includes("Retry connection"),
  },
  {
    name: "small interactive controls meet 44px touch target",
    pass:
      cssSource.includes("min-height: 44px") &&
      cssSource.includes(".flow-pane .react-flow__controls-button") &&
      /react-flow__controls-button\s*\{[\s\S]*min-width:\s*44px/.test(cssSource),
  },
  {
    name: "accent text uses high-contrast tokens",
    pass:
      /--accent:\s*oklch\([^)]+\)/.test(cssSource) &&
      /--accent-text:\s*oklch\([^)]+\)/.test(cssSource) &&
      !cssSource.includes("color: var(--accent);\n  font-size: 0.74rem"),
  },
  {
    name: "dark mode has real theme tokens",
    pass: /@media \(prefers-color-scheme: dark\)[\s\S]*--bg:/.test(cssSource) && !cssSource.includes("@media (prefers-color-scheme: dark) {\n  :root {\n    color-scheme: light;"),
  },
  {
    name: "document has app metadata",
    pass: htmlSource.includes('name="description"'),
  },
];

let failures = 0;

for (const check of checks) {
  if (check.pass) {
    console.log(`ok - ${check.name}`);
  } else {
    failures += 1;
    console.error(`not ok - ${check.name}`);
  }
}

if (failures > 0) {
  process.exit(1);
}
