"use client"
import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ----------------------------------------------------------------------
// Custom Nodes
// ----------------------------------------------------------------------

const baseNodeStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '16px',
  minWidth: '200px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
};

const titleStyle = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: '8px',
};

const AgentNode = ({ data }: { data: any }) => (
  <div style={{ ...baseNodeStyle, borderTop: '4px solid var(--accent)' }}>
    <Handle type="target" position={Position.Top} />
    <div style={{ ...titleStyle, color: 'var(--accent)' }}>LLM Agent</div>
    <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>{data.label}</div>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const SystemPromptNode = ({ data }: { data: any }) => (
  <div style={{ ...baseNodeStyle, borderTop: '4px solid #10b981' }}>
    <div style={{ ...titleStyle, color: '#10b981' }}>System Prompt</div>
    <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>{data.label}</div>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const EvaluatorNode = ({ data }: { data: any }) => (
  <div style={{ ...baseNodeStyle, borderTop: '4px solid #f59e0b' }}>
    <Handle type="target" position={Position.Top} />
    <div style={{ ...titleStyle, color: '#f59e0b' }}>Evaluator</div>
    <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>{data.label}</div>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const nodeTypes = {
  agent: AgentNode,
  systemPrompt: SystemPromptNode,
  evaluator: EvaluatorNode,
};

// ----------------------------------------------------------------------
// Initial Canvas Data
// ----------------------------------------------------------------------

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'systemPrompt',
    position: { x: 250, y: 50 },
    data: { label: '9-Pillar Base Instructions' },
  },
  {
    id: '2',
    type: 'agent',
    position: { x: 100, y: 200 },
    data: { label: 'Creative Drafter' },
  },
  {
    id: '3',
    type: 'agent',
    position: { x: 400, y: 200 },
    data: { label: 'Logical Critic' },
  },
  {
    id: '4',
    type: 'evaluator',
    position: { x: 250, y: 350 },
    data: { label: 'Synthesizer & Formatter' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-4', source: '3', target: '4' },
];

export default function ArchitectureCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      
      {/* Canvas Toolbar */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
        background: 'var(--surface)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '4px' }}>
          Nodes
        </div>
        <button 
          onClick={() => addNode('systemPrompt', 'New Prompt')}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
        >
          + System Prompt
        </button>
        <button 
          onClick={() => addNode('agent', 'New Agent')}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
        >
          + LLM Agent
        </button>
        <button 
          onClick={() => addNode('evaluator', 'New Evaluator')}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
        >
          + Evaluator
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap zoomable pannable />
        <Background color="var(--border)" gap={16} />
      </ReactFlow>
    </div>
  );
}
