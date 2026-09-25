import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import { useEffect, useMemo, useRef } from 'react';
import type { KnowledgeForest, KnowledgePointPerformance, Subject } from '@408os/domain';

interface KnowledgeGraphProps {
  forest: KnowledgeForest;
  performance: readonly KnowledgePointPerformance[];
  subject: Subject;
  selectedId: string | null;
  onSelect: (knowledgePointId: string) => void;
}

const subjectColors: Record<Subject, string> = {
  'data-structures': '#3ecf8e',
  'computer-organization': '#f26d54',
  'operating-systems': '#e5b04a',
  'computer-networks': '#7aa5f0',
};

function evidenceColor(value: KnowledgePointPerformance | undefined, subject: Subject): string {
  if (value?.performance === null || value?.performance === undefined) return '#39443d';
  if (value.performance < 0.5) return '#e8573f';
  if (value.performance < 0.8) return '#e5b04a';
  return subjectColors[subject];
}

export function KnowledgeGraph({ forest, performance, subject, selectedId, onSelect }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);

  const graphData = useMemo(() => {
    const performanceById = new Map(performance.map((entry) => [entry.knowledgePointId, entry]));
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

    for (const node of subjectNodes) {
      const metric = performanceById.get(node.point.id);
      const questionLabel = node.questionIds.length === 1
        ? `Q${node.questionIds[0]!.slice(-2)}`
        : `${node.questionIds.length} 题`;
      elements.push({
        data: {
          id: node.point.id,
          label: node.point.parentId ? questionLabel : node.point.name,
          color: evidenceColor(metric, subject),
          root: node.point.parentId ? 0 : 1,
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
  }, [forest, performance, subject]);

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
            width: 48,
            height: 34,
            shape: 'round-rectangle',
            'background-color': 'data(color)',
            'border-color': '#0a0e0c',
            'border-width': 2,
            color: '#0c110e',
            label: 'data(label)',
            'font-family': 'Inter, Segoe UI, Microsoft YaHei, sans-serif',
            'font-size': 9,
            'font-weight': 700,
            'text-valign': 'center',
            'text-margin-y': 0,
            'text-wrap': 'wrap',
            'text-max-width': '84px',
          },
        },
        {
          selector: 'node[root = 1]',
          style: {
            width: 126,
            height: 42,
            color: '#0c110e',
            'background-color': subjectColors[subject],
            'font-size': 10,
            'text-valign': 'center',
            'text-margin-y': 0,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#edf3ee',
            'border-width': 4,
            'overlay-color': subjectColors[subject],
            'overlay-opacity': 0.1,
            'overlay-padding': 7,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.25,
            'line-color': '#46524b',
            'target-arrow-color': '#46524b',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
      ],
      layout: {
        name: 'concentric',
        padding: 54,
        startAngle: -Math.PI / 2,
        sweep: Math.PI * 2,
        clockwise: true,
        equidistant: false,
        minNodeSpacing: 48,
        concentric: (node) => 100 - Number(node.data('depth')),
        levelWidth: () => 1,
        avoidOverlap: true,
      },
    });

    graph.on('tap', 'node', (event) => onSelect(event.target.id()));
    const observer = new ResizeObserver(() => {
      graph.resize();
      graph.fit(undefined, 28);
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
      graph.animate({ center: { eles: target }, duration: 180 });
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
