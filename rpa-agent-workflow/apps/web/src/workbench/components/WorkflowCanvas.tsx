import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { GitFork, Maximize2, Minus, Plus } from "lucide-react";
import type { NodeRunState, NodeRunStateMap } from "../../runEvents";
import { buildCanvasLayout, getNodeIoLabel, type CanvasLayout, type InsertAnchor, type WorkbenchModel, type WorkbenchNode } from "../../workbenchModel";

type WorkflowCanvasProps = {
  model: WorkbenchModel;
  nodeRunStates: NodeRunStateMap;
  selectedId: string;
  onSelect: (id: string) => void;
  onInsertAtEdge?: (anchor: InsertAnchor) => void;
  onInsertBranch?: (nodeId: string, branchKind: "condition" | "parallel") => void;
};

const CANVAS_SCROLL_BUFFER = 192;
const CANVAS_FIT_MARGIN = 48;
const CANVAS_FIT_MIN_SCALE = 0.32;
const CANVAS_FIT_MAX_SCALE = 1;
const CANVAS_MANUAL_MIN_SCALE = 0.1;
const CANVAS_MANUAL_MAX_SCALE = 2;
const CANVAS_ZOOM_STEP = 0.05;

export function WorkflowCanvas({ model, nodeRunStates, selectedId, onSelect, onInsertAtEdge, onInsertBranch }: WorkflowCanvasProps) {
  const layout = buildCanvasLayout(model);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCenteredSignatureRef = useRef("");
  const lastFocusedSelectedIdRef = useRef("");
  const pendingScrollRef = useRef<{ mode: "center" } | { mode: "preserveCenter"; xRatio: number; yRatio: number } | { mode: "scrollTo"; left: number; top: number } | null>(null);
  const dragPanRef = useRef<{ pointerId: number; startClientX: number; startClientY: number; startScrollLeft: number; startScrollTop: number } | null>(null);
  const scaleRef = useRef(1);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const stage = useMemo(
    () => calculateCanvasStage(layout.width, layout.height, viewportSize.width, viewportSize.height, manualScale),
    [layout.width, layout.height, manualScale, viewportSize.height, viewportSize.width],
  );
  const fitScale = useMemo(
    () => calculateCanvasFitScale(layout.width, layout.height, viewportSize.width, viewportSize.height),
    [layout.width, layout.height, viewportSize.height, viewportSize.width],
  );
  const zoomPercent = Math.round(stage.scale * 100);
  const stageStyle = {
    "--canvas-buffer": `${stage.buffer}px`,
    "--canvas-layout-width": `${layout.width}px`,
    "--canvas-layout-height": `${layout.height}px`,
    "--canvas-offset-x": `${stage.offsetX}px`,
    "--canvas-offset-y": `${stage.offsetY}px`,
    "--canvas-scale": stage.scale,
    "--canvas-stage-height": `${stage.stageHeight}px`,
    "--canvas-stage-width": `${stage.stageWidth}px`,
  } as CSSProperties;

  useLayoutEffect(() => {
    scaleRef.current = stage.scale;
  }, [stage.scale]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateViewportSize = () => {
      setViewportSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateViewportSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewportSize);
      return () => window.removeEventListener("resize", updateViewportSize);
    }

    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || viewportSize.width <= 0 || viewportSize.height <= 0) return;

    const pendingScroll = pendingScrollRef.current;
    if (pendingScroll) {
      pendingScrollRef.current = null;
      if (pendingScroll.mode === "center") {
        element.scrollTo({
          left: Math.max(0, Math.round((stage.stageWidth - viewportSize.width) / 2)),
          top: Math.max(0, Math.round((stage.stageHeight - viewportSize.height) / 2)),
          behavior: "auto",
        });
        return;
      }

      if (pendingScroll.mode === "scrollTo") {
        element.scrollTo({
          left: pendingScroll.left,
          top: pendingScroll.top,
          behavior: "auto",
        });
        return;
      }

      element.scrollTo({
        left: Math.max(0, Math.round(stage.stageWidth * pendingScroll.xRatio - viewportSize.width / 2)),
        top: Math.max(0, Math.round(stage.stageHeight * pendingScroll.yRatio - viewportSize.height / 2)),
        behavior: "auto",
      });
      return;
    }

    const signature = `${layout.width}x${layout.height}:${viewportSize.width}x${viewportSize.height}`;
    if (lastCenteredSignatureRef.current === signature) return;
    lastCenteredSignatureRef.current = signature;

    element.scrollTo({
      left: Math.max(0, Math.round((stage.stageWidth - viewportSize.width) / 2)),
      top: Math.max(0, Math.round((stage.stageHeight - viewportSize.height) / 2)),
      behavior: "auto",
    });
  }, [layout.height, layout.width, stage.stageHeight, stage.stageWidth, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    if (lastFocusedSelectedIdRef.current === "") {
      lastFocusedSelectedIdRef.current = selectedId;
      return;
    }
    if (lastFocusedSelectedIdRef.current === selectedId) return;
    lastFocusedSelectedIdRef.current = selectedId;

    const selectedNode = layout.nodes.find((node) => node.role === "statement" && node.id === selectedId);
    if (!selectedNode) return;
    element.scrollTo({
      ...calculateSelectedNodeScrollPosition({
        node: selectedNode,
        stage,
        viewportHeight: viewportSize.height,
        viewportWidth: viewportSize.width,
      }),
      behavior: "smooth",
    });
  }, [layout.nodes, selectedId, stage, viewportSize.height, viewportSize.width]);

  const updateManualScale = (nextScale: number) => {
    const boundedScale = clampCanvasScale(nextScale);
    scaleRef.current = boundedScale;
    pendingScrollRef.current = getCurrentScrollCenter();
    setManualScale(boundedScale);
  };

  const zoomAtPoint = useCallback(
    (nextScale: number, pointerClientX: number, pointerClientY: number) => {
      const element = scrollRef.current;
      const boundedScale = clampCanvasScale(nextScale);
      scaleRef.current = boundedScale;
      const nextStage = calculateCanvasStage(layout.width, layout.height, viewportSize.width, viewportSize.height, boundedScale);
      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollPosition = calculateZoomScrollPosition({
          clientHeight: element.clientHeight,
          clientWidth: element.clientWidth,
          pointerClientX: pointerClientX - rect.left,
          pointerClientY: pointerClientY - rect.top,
          scrollLeft: element.scrollLeft,
          scrollTop: element.scrollTop,
          previousStage: stage,
          nextStage,
        });
        pendingScrollRef.current = {
          mode: "scrollTo",
          left: scrollPosition.left,
          top: scrollPosition.top,
        };
      }
      setManualScale(boundedScale);
    },
    [layout.height, layout.width, stage, viewportSize.height, viewportSize.width],
  );

  const getCurrentScrollCenter = () => {
    const element = scrollRef.current;
    if (!element || element.scrollWidth <= 0 || element.scrollHeight <= 0) {
      return { mode: "center" as const };
    }

    return {
      mode: "preserveCenter" as const,
      xRatio: (element.scrollLeft + element.clientWidth / 2) / element.scrollWidth,
      yRatio: (element.scrollTop + element.clientHeight / 2) / element.scrollHeight,
    };
  };

  const fitCanvas = () => {
    pendingScrollRef.current = { mode: "center" };
    setManualScale(null);
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      if (!shouldZoomCanvasFromWheel(event)) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      zoomAtPoint(calculateNextCanvasScale(scaleRef.current, direction), event.clientX, event.clientY);
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [stage.scale, zoomAtPoint]);

  const startDragPan = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button"))) return;
    const element = scrollRef.current;
    if (!element) return;

    dragPanRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: element.scrollLeft,
      startScrollTop: element.scrollTop,
    };
    element.setPointerCapture(event.pointerId);
    setIsPanning(true);
  };

  const dragPan = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragPanRef.current;
    const element = scrollRef.current;
    if (!drag || !element || drag.pointerId !== event.pointerId) return;

    element.scrollLeft = drag.startScrollLeft - (event.clientX - drag.startClientX);
    element.scrollTop = drag.startScrollTop - (event.clientY - drag.startClientY);
  };

  const stopDragPan = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragPanRef.current;
    const element = scrollRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragPanRef.current = null;
    if (element?.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
  };

  return (
    <section className="panel canvas-panel">
      <div className="canvas-zoom-controls" aria-label="画布缩放">
        <button aria-label="缩小画布" disabled={stage.scale <= CANVAS_MANUAL_MIN_SCALE} onClick={() => updateManualScale(calculateNextCanvasScale(scaleRef.current, -1))} title="缩小画布" type="button">
          <Minus size={16} />
        </button>
        <span className="canvas-zoom-value" aria-live="polite">{zoomPercent}%</span>
        <button aria-label="放大画布" disabled={stage.scale >= CANVAS_MANUAL_MAX_SCALE} onClick={() => updateManualScale(calculateNextCanvasScale(scaleRef.current, 1))} title="放大画布" type="button">
          <Plus size={16} />
        </button>
        <button aria-label="适配全量画布" disabled={manualScale === null || roundScale(stage.scale) === roundScale(fitScale)} onClick={fitCanvas} title="适配全量画布" type="button">
          <Maximize2 size={15} />
        </button>
      </div>
      <div className={`canvas-scroll ${isPanning ? "is-panning" : ""}`} onPointerCancel={stopDragPan} onPointerDown={startDragPan} onPointerMove={dragPan} onPointerUp={stopDragPan} ref={scrollRef}>
        <div className="workflow-stage" style={stageStyle}>
          <div className="workflow-zoom-shell">
            <div className="workflow-diagram" style={{ width: layout.width, minHeight: layout.height }} aria-label="流程画布">
              <svg className="workflow-links" viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" aria-hidden="true">
                {layout.edges.map((edge) => (
                  <path className="flow-link primary" d={getEdgePath(layout, edge.from, edge.to)} key={edge.id} />
                ))}
              </svg>

              {layout.edges.filter((edge) => !edge.anchor.position).map((edge) => {
                const point = getEdgeMidpoint(layout, edge.from, edge.to);
                if (!point) return null;
                return (
                  <button
                    aria-label={`在 ${edge.from} 和 ${edge.to} 之间新建节点`}
                    className="edge-insert-button"
                    key={`insert-${edge.id}`}
                    onClick={() => onInsertAtEdge?.(edge.anchor)}
                    style={{ left: point.x, top: point.y }}
                    type="button"
                  >
                    <Plus size={16} />
                  </button>
                );
              })}

              {layout.insertControls.map((control) => (
                <button
                  aria-label={control.label}
                  className={`edge-insert-button insert-control ${control.kind === "insertBranch" ? "branch-add" : ""}`}
                  key={control.id}
                  onClick={() => {
                    if (control.kind === "insertBranch" && control.nodeId && control.branchKind) {
                      onInsertBranch?.(control.nodeId, control.branchKind);
                      return;
                    }
                    if (control.anchor) {
                      onInsertAtEdge?.(control.anchor);
                    }
                  }}
                  style={{ left: control.x, top: control.y }}
                  title={control.label}
                  type="button"
                >
                  <Plus size={16} />
                  <span className="visually-hidden">{control.label}</span>
                </button>
              ))}

              {layout.nodes.map((layoutNode) => (
                layoutNode.role === "join" ? null :
                <div
                  className={`canvas-node-position role-${layoutNode.role}`}
                  key={layoutNode.id}
                  style={{
                    left: layoutNode.x - layoutNode.width / 2,
                    top: layoutNode.y,
                    width: layoutNode.width,
                  }}
                >
                  {layoutNode.role === "statement" ? (
                    <CanvasNode
                      node={layoutNode.node}
                      runState={layoutNode.node ? (nodeRunStates[layoutNode.node.id] ?? "idle") : "idle"}
                      selected={layoutNode.node ? selectedId === layoutNode.node.id : false}
                      onSelect={onSelect}
                    />
                  ) : (
                    <CanvasLayoutMarker role={layoutNode.role} label={layoutNode.label} />
                  )}
                </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function calculateCanvasStage(layoutWidth: number, layoutHeight: number, viewportWidth: number, viewportHeight: number, manualScale?: number | null) {
  const buffer = CANVAS_SCROLL_BUFFER;
  const scale = manualScale == null ? calculateCanvasFitScale(layoutWidth, layoutHeight, viewportWidth, viewportHeight) : clamp(manualScale, CANVAS_MANUAL_MIN_SCALE, CANVAS_MANUAL_MAX_SCALE);
  const scaledWidth = Math.round(layoutWidth * scale);
  const scaledHeight = Math.round(layoutHeight * scale);
  const stageWidth = Math.max(scaledWidth + buffer * 2, viewportWidth + buffer * 2);
  const stageHeight = Math.max(scaledHeight + buffer * 2, viewportHeight + buffer * 2);

  return {
    buffer,
    offsetX: Math.round((stageWidth - scaledWidth) / 2),
    offsetY: Math.round((stageHeight - scaledHeight) / 2),
    scale,
    scaledHeight,
    scaledWidth,
    stageHeight,
    stageWidth,
  };
}

export function shouldZoomCanvasFromWheel(event: { ctrlKey: boolean; metaKey: boolean }) {
  return event.ctrlKey || event.metaKey;
}

export function calculateNextCanvasScale(currentScale: number, direction: -1 | 1) {
  return clampCanvasScale(currentScale + direction * CANVAS_ZOOM_STEP);
}

type CanvasStage = ReturnType<typeof calculateCanvasStage>;

export function calculateSelectedNodeScrollPosition({
  node,
  stage,
  viewportHeight,
  viewportWidth,
}: {
  node: { x: number; y: number; width: number; height: number };
  stage: CanvasStage;
  viewportHeight: number;
  viewportWidth: number;
}) {
  return {
    left: Math.max(0, Math.round(stage.offsetX + (node.x + node.width / 2) * stage.scale - viewportWidth / 2)),
    top: Math.max(0, Math.round(stage.offsetY + (node.y + node.height / 2) * stage.scale - viewportHeight / 2)),
  };
}

export function calculateZoomScrollPosition({
  clientHeight,
  clientWidth,
  pointerClientX,
  pointerClientY,
  scrollLeft,
  scrollTop,
  previousStage,
  nextStage,
}: {
  clientHeight: number;
  clientWidth: number;
  pointerClientX: number;
  pointerClientY: number;
  scrollLeft: number;
  scrollTop: number;
  previousStage: CanvasStage;
  nextStage: CanvasStage;
}) {
  const xRatio = (scrollLeft + pointerClientX) / previousStage.stageWidth;
  const yRatio = (scrollTop + pointerClientY) / previousStage.stageHeight;

  return {
    left: Math.max(0, Math.round(nextStage.stageWidth * xRatio - pointerClientX)),
    top: Math.max(0, Math.round(nextStage.stageHeight * yRatio - pointerClientY)),
    xRatio: (Math.max(0, Math.round(nextStage.stageWidth * xRatio - pointerClientX)) + clientWidth / 2) / nextStage.stageWidth,
    yRatio: (Math.max(0, Math.round(nextStage.stageHeight * yRatio - pointerClientY)) + clientHeight / 2) / nextStage.stageHeight,
  };
}

function calculateCanvasFitScale(layoutWidth: number, layoutHeight: number, viewportWidth: number, viewportHeight: number) {
  if (layoutWidth <= 0 || layoutHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return 1;

  const fitWidth = Math.max(1, viewportWidth - CANVAS_FIT_MARGIN * 2) / layoutWidth;
  const fitHeight = Math.max(1, viewportHeight - CANVAS_FIT_MARGIN * 2) / layoutHeight;
  return clamp(Math.min(fitWidth, fitHeight, CANVAS_FIT_MAX_SCALE), CANVAS_FIT_MIN_SCALE, CANVAS_FIT_MAX_SCALE);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, roundScale(value)));
}

function clampCanvasScale(value: number) {
  return clamp(value, CANVAS_MANUAL_MIN_SCALE, CANVAS_MANUAL_MAX_SCALE);
}

function roundScale(value: number) {
  return Number(value.toFixed(3));
}

function getEdgePath(layout: CanvasLayout, fromId: string, toId: string) {
  const from = layout.nodes.find((node) => node.id === fromId);
  const to = layout.nodes.find((node) => node.id === toId);
  if (!from || !to) return "";

  const startX = from.x;
  const startY = from.y + from.height;
  const endX = to.x;
  const endY = to.y;

  if (startX === endX) {
    return `M${startX} ${startY} L${endX} ${endY}`;
  }

  if (to.role === "join") {
    return `M${startX} ${startY} L${startX} ${endY} L${endX} ${endY}`;
  }

  const midY = Math.round((startY + endY) / 2);
  return `M${startX} ${startY} L${startX} ${midY} L${endX} ${midY} L${endX} ${endY}`;
}

function getEdgeMidpoint(layout: CanvasLayout, fromId: string, toId: string) {
  const from = layout.nodes.find((node) => node.id === fromId);
  const to = layout.nodes.find((node) => node.id === toId);
  if (!from || !to) return null;

  const startX = from.x;
  const startY = from.y + from.height;
  const endX = to.x;
  const endY = to.y;

  if (startX === endX) {
    return { x: Math.round((startX + endX) / 2), y: Math.round((startY + endY) / 2) };
  }

  return { x: Math.round((startX + endX) / 2), y: Math.round((startY + endY) / 2) };
}

function CanvasLayoutMarker({ role, label }: { role: "branchHeader" | "join" | "emptyBranch"; label?: string }) {
  if (role === "join") {
    return null;
  }
  if (role === "emptyBranch") {
    return <div className="canvas-empty-branch">{label ?? "空分支"}</div>;
  }
  return <div className="canvas-branch-header">{label ?? "分支"}</div>;
}

function CanvasNode({ node, runState, selected, onSelect }: { node?: WorkbenchNode; runState: NodeRunState; selected: boolean; onSelect: (id: string) => void }) {
  if (!node) return null;
  const stateLabel = getRunStateLabel(runState);
  const isDecision = node.kind === "if";
  const isParallel = node.kind === "parallel";
  const branchCount = node.raw.branches?.length ?? 0;

  if (isDecision) {
    return (
      <button className={getCanvasNodeClassName(selected, runState, node.kind)} onClick={() => onSelect(node.id)}>
        <span className="decision-node-surface">{branchCount} 个分支条件</span>
      </button>
    );
  }

  if (isParallel) {
    return (
      <button aria-label="并行分叉" className={getCanvasNodeClassName(selected, runState, node.kind)} onClick={() => onSelect(node.id)} title="并行分叉">
        <span className="parallel-split-icon parallel-split-icon-upright" aria-hidden="true">
          <GitFork size={26} />
        </span>
        <span className="visually-hidden">并行分叉</span>
      </button>
    );
  }

  return (
    <button className={getCanvasNodeClassName(selected, runState, node.kind)} onClick={() => onSelect(node.id)}>
      <span>
        <span className="node-kind-row">
          <span className="node-kind">{getCanvasNodeKindLabel(node)}</span>
          {stateLabel ? <span className={`node-run-indicator ${runState}`}>{stateLabel}</span> : null}
        </span>
        <strong>{getDisplayNodeLabel(node)}</strong>
        <div className="node-io">
          {getNodeIoLabel(node).map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </span>
    </button>
  );
}

function getCanvasNodeClassName(selected: boolean, runState: NodeRunState, kind: string) {
  return ["canvas-node", kind === "if" ? "canvas-node-if" : "", kind === "parallel" ? "canvas-node-parallel" : "", selected ? "selected" : "", runState === "running" ? "run-running" : ""].filter(Boolean).join(" ");
}

function getCanvasNodeKindLabel(node: WorkbenchNode) {
  if (node.kind === "sequence" && node.order === 0) return "流程输入";
  return node.kind;
}

function getRunStateLabel(runState: NodeRunState) {
  if (runState === "running") return "运行中";
  return "";
}

function getDisplayNodeLabel(node: WorkbenchNode) {
  if (node.kind === "sequence" && node.order === 0) return "开始";
  if (node.kind === "return") return "返回结果";
  if (node.label === "Branch By Threshold") return "阈值分支";
  return node.label;
}
