import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VariableType = 'Numeric' | 'String';
export type MeasureLevel = 'Nominal' | 'Ordinal' | 'Scale';

export interface Variable {
  id: string;
  name: string;
  label: string;
  type: VariableType;
  measure: MeasureLevel;
}

export interface OutputItem {
  id: string;
  title: string;
  type: 'table' | 'text' | 'chart';
  content: any;
  timestamp: number;
  missingCount?: number;
  chartType?: 'bar' | 'scatter' | 'regression';
  chartData?: any[];
  chartLabels?: { x?: string; y?: string };
}

interface AppState {
  dataset: Record<string, string | number>[];
  variables: Variable[];
  outputs: OutputItem[];
  activeTab: 'data' | 'variable' | 'output';
  
  showTutorial: boolean;
  tutorialStep: number;
  
  setDataset: (data: Record<string, string | number>[]) => void;
  setVariables: (vars: Variable[]) => void;
  addOutput: (output: OutputItem) => void;
  clearOutputs: () => void;
  setActiveTab: (tab: 'data' | 'variable' | 'output') => void;
  updateDataCell: (rowIndex: number, columnId: string, value: string | number) => void;
  updateVariable: (index: number, field: string, value: any) => void;
  addComputedVariable: (name: string, operation: 'sum' | 'average', varsToCompute: string[]) => void;

  setShowTutorial: (show: boolean) => void;
  setTutorialStep: (step: number) => void;
  advanceTutorial: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      dataset: [],
      variables: [],
      outputs: [],
      activeTab: 'data',
      showTutorial: true,
      tutorialStep: 0,

      setDataset: (data) => set({ dataset: data }),
      setVariables: (vars) => set({ variables: vars }),
      addOutput: (output) => set((state) => ({ outputs: [...state.outputs, output], activeTab: 'output' })),
      clearOutputs: () => set({ outputs: [] }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      updateDataCell: (rowIndex, columnId, value) => set((state) => {
        const newData = [...state.dataset];
        newData[rowIndex] = { ...newData[rowIndex], [columnId]: value };
        return { dataset: newData };
      }),
      updateVariable: (index, field, value) => set((state) => {
        const newVars = [...state.variables];
        newVars[index] = { ...newVars[index], [field]: value };
        return { variables: newVars };
      }),
      addComputedVariable: (name, operation, varsToCompute) => set((state) => {
        const newVars = [...state.variables];
        newVars.push({
          id: `var_${Date.now()}_calc`,
          name,
          label: name,
          type: 'Numeric',
          measure: 'Scale'
        });

        const newDataset = state.dataset.map(row => {
          const vals = varsToCompute.map(v => Number(row[v])).filter(v => !isNaN(v));
          let res = 0;
          if (vals.length > 0) {
            const sum = vals.reduce((a, b) => a + b, 0);
            res = operation === 'average' ? sum / vals.length : sum;
          }
          return { ...row, [name]: res };
        });

        return { variables: newVars, dataset: newDataset };
      }),
      setShowTutorial: (show) => set({ showTutorial: show }),
      setTutorialStep: (step) => set({ tutorialStep: step }),
      advanceTutorial: () => set((state) => ({ tutorialStep: state.tutorialStep + 1 }))
    }),
    {
      name: 'statszy-storage', // name of item in the storage (must be unique)
      partialize: (state) => ({ showTutorial: state.showTutorial }), // only persist showTutorial
    }
  )
);
