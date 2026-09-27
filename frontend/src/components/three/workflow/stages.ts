// Workflow stage data — kept three-free so any page can import it
// without pulling the 3D chunk.
export interface WorkflowStage {
  key: string;
  title: string;
  icon: string;
  color: string;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  { key: 'ask', title: 'ASK', icon: '🌱', color: '#39ff88' },
  { key: 'analyze', title: 'ANALYZE', icon: '🔬', color: '#22d3ee' },
  { key: 'identify', title: 'IDENTIFY', icon: '🦠', color: '#a855f7' },
  { key: 'guide', title: 'GUIDE', icon: '📋', color: '#ffb020' },
  { key: 'act', title: 'ACT', icon: '🌾', color: '#39ff88' },
];
