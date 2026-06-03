# Product

## Register

product

## Users

Engineers and workflow builders who need to define, inspect, validate, execute, and debug RPA workflows from a contract-first model. They work locally, need reliable feedback while editing, and care about whether UI projections, AST data, block manifests, generated code, and runtime behavior agree.

## Product Purpose

RPA Agent Workflow is an engineering-first workflow system for contract-first RPA automation. It defines canonical AST, block, UI node, and edit-operation contracts; validates and compiles workflows; executes them through local runtimes; and provides a visual editor that projects the workflow into inspectable, editable nodes. Success means changes are traceable from UI action to edit operation to AST update, and execution results can be trusted without treating the interface as a demo.

## Brand Personality

Engineering-grade, traceable, and quietly efficient. The product voice should be direct, specific, and operational: it names the object being edited, the contract being checked, and the runtime state that changed. It should feel like a serious development tool for people who need to reason about workflow behavior under real constraints.

## Anti-references

This must not look or sound like a toy demo, a marketing landing page, or a decorative AI workflow SaaS interface. Avoid vague claims, ornamental workflow diagrams, oversized promotional hero sections, decorative motion, and UI patterns that hide state behind visual flourish. Do not weaken engineering decisions with ambiguous language; state what the system does and what the user can trust.

## Design Principles

1. Contract first: make schemas, AST nodes, block manifests, edit operations, diagnostics, and runtime results visible as first-class product objects.
2. Trace every change: every user action should map to a concrete operation and an observable state transition.
3. Scale without drama: new block types and large workflows must fit the same interaction model without special-case UI behavior.
4. Prefer operational clarity: dense information is acceptable when it helps users compare, debug, or decide.
5. Earn trust locally: failures, unavailable services, sample data, and execution results must be explicit rather than implied.

## Accessibility & Inclusion

Target WCAG AA for text contrast and interaction states. The interface must support keyboard operation, visible focus states, meaningful labels, reduced-motion preferences, and color-independent status communication. Motion should communicate state changes only, with reduced-motion alternatives.
