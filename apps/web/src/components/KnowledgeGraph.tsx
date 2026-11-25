import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import { useEffect, useMemo, useRef } from 'react';
import type { KnowledgeForest, Subject } from '@408os/domain';
import type { ConceptState } from '../app/concept-register';

interface KnowledgeGraphProps {
  forest: KnowledgeForest;
  /** Concept states for leaf nodes; a leaf without an entry is drawn as not started. */
  states: ReadonlyMap<string, ConceptState>;
  subject: Subject;
  selectedId: string | null;
  onSelect: (knowledgePointId: string) => void;
}

/*
 * The graph always sits on the dark exhibit canvas, so it uses the night palette directly
 * (Cytoscape draws to <canvas> and cannot read CSS custom properties). Values mirror the
 * night tokens in styles/tokens.css. States are told apart by fill geometry and border style,
 * the same vocabulary as the concept register, never by hue alone.
 */
const NIGHT = {
  ink: '#D6D6D0',
  inkStrong: '#ECECE7',
  muted: '#A3A39C',
  paper: '#1E1E1C',
  paper2: '#262624',
  off: '#2C2C2A',
  lit: '#9EC22E',
  line: '#4A4A45',
} as const;

const GRAPH_FONT = '"PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", system-ui, sans-serif';

/*
 * Cytoscape sizes labels in graph units, so fitting a large subject would shrink them below
 * readable size. Labels are counter-scaled against the zoom so they stay at the design size
 * on screen; above 1x zoom they grow naturally.
 */
const LABEL_PX = 13;
const ROOT_LABEL_PX = 15;

export function KnowledgeGraph({ forest, states, subject, selectedId, onSelect }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);

  const graphData = useMemo(() => {
    const subjectNodes = forest.nodes.filter((node) => node.point.subject === subject);
    const subjectNodeById = new Map(subjectNodes.map((node) => [node.point.id, node]));
    const included = new Set(subjectNodes.map((node) => node.point.id));
    const elements: ElementDefinition[] = [];
    const depthById = new Map<string, number>();
    const depthOf = (id: string): number => {
      const existing = depthById.get(id);
      if (existing !== undefined) return existing;
      const parentId = subjectNodeById.get(id)?.point.parentId;
      const depth = parentId && included.has(parentId) ? depthOf(parentId) + 1 : 0;
      depthById.set(id, depth);
      return depth;
    };

    // Radial tree: leaves take evenly spaced angular slots in tree order, each parent sits at the
    // angular centre of its children, and depth sets the ring. Siblings therefore never share a spot,
    // unlike a concentric layout, whose 2π sweep puts the first and last node of a ring together.
    const childrenOf = (id: string) => (subjectNodeById.get(id)?.childIds ?? []).filter((childId) => included.has(childId));
    const roots = subjectNodes.filter((node) => depthOf(node.point.id) === 0).map((node) => node.point.id);
    const leafOrder: string[] = [];
    const collect = (id: string) => {
      const children = childrenOf(id);
      if (!children.length) leafOrder.push(id);
      children.forEach(collect);
    };
    roots.forEach(collect);
    const slots = Math.max(leafOrder.length, 1);
    const angleById = new Map<string, number>();
    leafOrder.forEach((id, index) => angleById.set(id, -Math.PI / 2 + (index * 2 * Math.PI) / slots));
    const angleOf = (id: string): number => {
      const known = angleById.get(id);
      if (known !== undefined) return known;
      const childAngles = childrenOf(id).map(angleOf);
      const angle = childAngles.length ? childAngles.reduce((sum, value) => sum + value, 0) / childAngles.length : -Math.PI / 2;
      angleById.set(id, angle);
      return angle;
    };
    // Ring spacing grows with the leaf count so neighbouring labels keep about 70 units apart.
    const leafRadius = Math.max(220, (slots * 70) / (2 * Math.PI));
    const maxDepth = Math.max(1, ...subjectNodes.map((node) => depthOf(node.point.id)));
    const positionOf = (id: string) => {
      const depth = depthOf(id);
      if (depth === 0) return { x: 0, y: 0 };
      const radius = (leafRadius * depth) / maxDepth;
      const angle = angleOf(id);
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    };

    for (const node of subjectNodes) {
      const questionLabel = node.questionIds.length === 1
        ? `Q${node.questionIds[0]!.slice(-2)}`
        : `${node.questionIds.length} 题`;
      elements.push({
        position: positionOf(node.point.id),
        data: {
          id: node.point.id,
          label: node.point.parentId ? questionLabel : node.point.name,
          kind: !node.point.parentId ? 'root' : node.childIds.length ? 'group' : 'leaf',
          state: node.childIds.length ? 'none' : states.get(node.point.id) ?? 'unstarted',
          depth: depthOf(node.point.id),
        },
      });
      if (node.point.parentId && included.has(node.point.parentId)) {
        elements.push({
          data: {
            id: `${node.point.parentId}->${node.point.id}`,
            source: node.point.parentId,
            target: node.point.id,
          },
        });
      }
    }
    return elements;
  }, [forest, states, subject]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const graph = cytoscape({
      container,
      elements: graphData,
      minZoom: 0.45,
      maxZoom: 2.4,
      wheelSensitivity: 0.18,
      style: [
        {
          selector: 'node',
          style: {
            width: 30,
            height: 30,
            shape: 'round-rectangle',
            'background-color': NIGHT.off,
            'border-color': NIGHT.muted,
            'border-width': 1.5,
            color: NIGHT.ink,
            label: 'data(label)',
            'font-family': GRAPH_FONT,
            'font-size': () => LABEL_PX / Math.min(1, graphRef.current?.zoom() ?? 1),
            'font-weight': 600,
            // Labels sit under the node on the canvas itself, so their contrast never depends on the fill.
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-wrap': 'wrap',
            'text-max-width': '96px',
          },
        },
        { selector: 'node[state = "practicing"]', style: { 'background-color': NIGHT.paper, 'border-color': NIGHT.inkStrong, 'border-style': 'dashed' } },
        {
          selector: 'node[state = "consolidating"]',
          style: {
            'border-color': NIGHT.inkStrong,
            'background-fill': 'linear-gradient',
            'background-gradient-direction': 'to-top',
            'background-gradient-stop-colors': [NIGHT.lit, NIGHT.lit, NIGHT.paper, NIGHT.paper],
            'background-gradient-stop-positions': ['0%', '50%', '50%', '100%'],
          },
        },
        { selector: 'node[state = "stable"]', style: { 'background-color': NIGHT.lit, 'border-color': NIGHT.inkStrong } },
        {
          selector: 'node[kind = "group"]',
          style: { width: 40, height: 26, 'background-color': NIGHT.paper2, 'border-color': NIGHT.muted, color: NIGHT.muted },
        },
        {
          selector: 'node[kind = "root"]',
          style: {
            width: 'label',
            height: 40,
            'padding-left': '16px',
            'padding-right': '16px',
            'background-color': NIGHT.paper2,
            'border-color': NIGHT.inkStrong,
            color: NIGHT.inkStrong,
            'font-size': () => ROOT_LABEL_PX / Math.min(1, graphRef.current?.zoom() ?? 1),
            'font-weight': 700,
            'text-valign': 'center',
            'text-margin-y': 0,
            'text-max-width': '200px',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': NIGHT.inkStrong,
            'border-width': 3,
            'border-style': 'solid',
            'underlay-color': NIGHT.inkStrong,
            'underlay-opacity': 0.18,
            'underlay-padding': 6,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.25,
            'line-color': NIGHT.line,
            'target-arrow-color': NIGHT.line,
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            'curve-style': 'bezier',
          },
        },
      ],
      layout: { name: 'preset', fit: true, padding: 32 },
    });

    graph.on('tap', 'node', (event) => onSelect(event.target.id()));
    let zoomBucket = graph.zoom();
    graph.on('zoom', () => {
      // Re-evaluate the label mappers only when the zoom has moved enough to matter.
      if (Math.abs(graph.zoom() - zoomBucket) / zoomBucket < 0.04) return;
      zoomBucket = graph.zoom();
      graph.style().update();
    });
    const observer = new ResizeObserver(() => {
      graph.resize();
      graph.fit(undefined, 32);
      zoomBucket = graph.zoom();
      graph.style().update();
    });
    observer.observe(container);
    graphRef.current = graph;
    return () => {
      observer.disconnect();
      graph.destroy();
      graphRef.current = null;
    };
  }, [graphData, onSelect, subject]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.$(':selected').unselect();
    if (!selectedId) return;
    const target = graph.getElementById(selectedId);
    if (target.nonempty()) {
      target.select();
      // Keep the whole subject in view; only pan when the selection is outside the visible area.
      const box = target.renderedBoundingBox({ includeLabels: true });
      const margin = 24;
      const outside = box.x1 < margin || box.y1 < margin || box.x2 > graph.width() - margin || box.y2 > graph.height() - margin;
      if (outside) graph.animate({ center: { eles: target }, duration: 180 });
    }
  }, [selectedId, graphData]);

  return (
    <div
      ref={containerRef}
      className="knowledge-graph-canvas"
      role="img"
      aria-label="当前科目的知识点与题目证据关系图"
    />
  );
}
