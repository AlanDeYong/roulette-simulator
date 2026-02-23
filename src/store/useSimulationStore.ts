import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SimulationState, SimulationConfig, Strategy, SpinResult, SimulationMetrics, SavedStrategy } from '../types';
import { FSNode, VirtualFileSystem } from '../lib/FileSystem';

interface SimulationStore extends SimulationState {
  setConfig: (config: Partial<SimulationConfig>) => void;
  setStrategyCode: (code: string) => void;
  setStrategy: (strategy: Strategy) => void;
  setStatus: (status: SimulationState['status']) => void;
  resetSimulation: () => void;
  addSpinResult: (result: SpinResult) => void;
  setBulkResults: (spins: SpinResult[]) => void;

  // Strategy Management
  saveStrategy: (name: string, description?: string) => void;
  loadStrategy: (id: string) => void;
  deleteStrategy: (id: string) => void;
  duplicateStrategy: (id: string) => void;

  // File System
  fsNodes: Record<string, FSNode>;
  currentFileId: string | null;
  setFSNodes: (nodes: Record<string, FSNode>) => void;
  setCurrentFileId: (id: string | null) => void;
  syncWithServer: () => Promise<void>;

  // Data Import
  setImportedData: (data: number[]) => void;
  importedFileName: string | null;
  setImportedFileName: (name: string | null) => void;

  // Result Caching
  cachedResults: Record<string, { spins: SpinResult[], metrics: SimulationMetrics, zoomState?: { startIndex?: number, endIndex?: number } }>;
  setChartZoom: (startIndex?: number, endIndex?: number) => void;
  
  // Layout
  setLayout: (layout: Partial<SimulationState['layout']>) => void;
}

const DEFAULT_CONFIG: SimulationConfig = {
  startingBankroll: 2000,
  maxSpins: 1000,
  tableType: 'european',
  betLimits: { min: 2, minOutside: 5, max: 500 },
  dataRange: { start: 1, end: null, fromEnd: false },
  useImportedData: false,
  minIncrementalBet: 1,
  incrementMode: 'fixed',
};

const DEFAULT_STRATEGY: Strategy = {
  id: 'custom',
  name: 'Custom Strategy',
  code: `// Custom Betting Strategy
// Available arguments:
// - spinHistory: Array of previous spins
// - bankroll: Current bankroll
// - config: Simulation configuration

function bet(spinHistory, bankroll, config) {
  // Example: Bet 10 on Red
  // Return an object or array of objects
  // { type: 'red', amount: 10 }
  
  if (spinHistory.length > 0 && spinHistory[spinHistory.length - 1].winningColor === 'red') {
      return { type: 'black', amount: 10 };
  }
  return { type: 'red', amount: 10 };
}
`,
};

const DEFAULT_METRICS: SimulationMetrics = {
  totalProfit: 0,
  winRate: 0,
  maxDrawdown: 0,
  averageBet: 0,
  maxBet: 0,
  finalBankroll: DEFAULT_CONFIG.startingBankroll,
  peakBankroll: DEFAULT_CONFIG.startingBankroll,
  spinsToPeak: 0,
  lowestBankroll: DEFAULT_CONFIG.startingBankroll,
  spinsToLowest: 0,
  winningSpins: 0,
  losingSpins: 0,
};

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set) => ({
      id: generateId(),
      config: DEFAULT_CONFIG,
      layout: { strategyEditorHeight: 500, chartHeight: 300, logHeight: 300 },
      strategy: DEFAULT_STRATEGY,
      savedStrategies: [],
      importedData: [],
      importedFileName: null,
      results: {
        spins: [],
        metrics: DEFAULT_METRICS,
        zoomState: undefined,
      },
      status: 'idle',

      // File System
      fsNodes: {},
      currentFileId: null,
      cachedResults: {},

      // Sync with API when updating nodes
      setFSNodes: (nodes) => {
        set({ fsNodes: nodes });
      },

      setCurrentFileId: (id) => set((state) => {
        // Try to restore cached results for this file
        const cacheKey = id || 'custom';
        const cached = state.cachedResults[cacheKey];

        // If we found cached results, load them.
        // If NOT, we should check if the ID has changed (e.g. server sync changed paths)
        // BUT for now, we rely on the ID being stable or matching the cache key.

        return {
          currentFileId: id,
          results: cached ? { spins: cached.spins, metrics: cached.metrics, zoomState: cached.zoomState } : { spins: [], metrics: { ...DEFAULT_METRICS, finalBankroll: state.config.startingBankroll }, zoomState: undefined },
          status: 'idle' // Always reset status to idle on switch
        };
      }),

      // Initialize from API (Call this in App.tsx or similar)
      syncWithServer: async () => {
        try {
          // Use relative path to leverage Vite proxy
          const res = await fetch('/api/files');
          if (res.ok) {
            const nodes = await res.json();
            set((state) => {
              // If we have a current file, update the active strategy code with the latest server version
              // This ensures we don't run stale code after external updates
              let newStrategy = state.strategy;
              let newCurrentFileId = state.currentFileId;

              // Check if currentFileId still exists in new nodes
              if (state.currentFileId && !nodes[state.currentFileId]) {
                  // File was deleted on server (or we have a stale ID)
                  // Try to find if it was renamed? No easy way.
                  // Just deselect it to avoid errors.
                  console.warn(`Current file ${state.currentFileId} no longer exists on server. Deselecting.`);
                  newCurrentFileId = null;
                  // Should we reset strategy to default? Maybe keep the code in editor but unsaved?
                  // Let's keep the code, but mark as "Untitled" (currentFileId = null)
              } else if (state.currentFileId && nodes[state.currentFileId]) {
                const serverContent = nodes[state.currentFileId].content;
                if (serverContent && serverContent !== state.strategy.code) {
                  // Only update if different (and assuming no local unsaved changes we want to keep on reload)
                  // Since 'strategy' is not persisted, on reload we definitely want the server version.
                  newStrategy = {
                    ...state.strategy,
                    code: serverContent
                  };
                }
              }
              return {
                fsNodes: nodes,
                strategy: newStrategy,
                currentFileId: newCurrentFileId
              };
            });
          } else {
             console.error("Failed to sync with server:", res.status, res.statusText);
          }
        } catch (e) {
          console.warn("Could not sync with server, using local state", e);
        }
      },

      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),

      setStrategyCode: (code) =>
        set((state) => ({
          strategy: { ...state.strategy, code },
        })),

      setStrategy: (strategy) =>
        set(() => ({
          strategy,
        })),

      setStatus: (status) => set({ status }),

      setImportedFileName: (name) => set({ importedFileName: name }),

      resetSimulation: () =>
        set((state) => ({
          results: {
            spins: [],
            metrics: {
              ...DEFAULT_METRICS,
              finalBankroll: state.config.startingBankroll,
              peakBankroll: state.config.startingBankroll,
              lowestBankroll: state.config.startingBankroll,
            },
          },
          status: 'idle',
        })),

      addSpinResult: (result) =>
        set((state) => {
          const newSpins = [...state.results.spins, result];
          const totalSpins = newSpins.length;

          const winningSpins = newSpins.filter((s) => s.totalProfit > 0).length;
          const losingSpins = newSpins.filter((s) => s.totalProfit < 0).length;
          const winRate = totalSpins > 0 ? winningSpins / totalSpins : 0;

          const currentBankroll = result.bankrollAfter;
          const totalProfit = currentBankroll - state.config.startingBankroll;

          // Calculate Bankroll Stats
          let peakBankroll = state.config.startingBankroll;
          let spinsToPeak = 0;
          let lowestBankroll = state.config.startingBankroll;
          let spinsToLowest = 0;
          let maxDrawdown = 0;
          let tempPeak = state.config.startingBankroll;

          // Iterate through all spins to recalculate metrics accurately
          // Note: Optimizing this to incrementally update would be better for performance, 
          // but for "Instant" simulation of thousands of spins, full recalc might be slow.
          // However, addSpinResult is usually called spin-by-spin in async mode.
          // For bulk mode, we might want a bulkAdd method.
          // For now, let's just do simple iteration.

          const bankrolls = [state.config.startingBankroll];
          newSpins.forEach(s => bankrolls.push(s.bankrollAfter));

          bankrolls.forEach((b, index) => {
            if (b > peakBankroll) {
              peakBankroll = b;
              spinsToPeak = index; // index 0 is start (spin 0)
            }
            if (b < lowestBankroll) {
              lowestBankroll = b;
              spinsToLowest = index;
            }

            if (b > tempPeak) {
              tempPeak = b;
            }
            const dd = tempPeak - b;
            if (dd > maxDrawdown) {
              maxDrawdown = dd;
            }
          });

          const totalBetAmount = newSpins.reduce((sum, s) => sum + s.bets.reduce((bSum, b) => bSum + b.amount, 0), 0);
          const averageBet = totalSpins > 0 ? totalBetAmount / totalSpins : 0;

          const maxBet = newSpins.reduce((max, s) => {
            const spinTotalBet = s.bets.reduce((bSum, b) => bSum + b.amount, 0);
            return spinTotalBet > max ? spinTotalBet : max;
          }, 0);

          return {
            results: {
              spins: newSpins,
              metrics: {
                totalProfit,
                winRate,
                maxDrawdown,
                averageBet,
                maxBet,
                finalBankroll: currentBankroll,
                peakBankroll,
                spinsToPeak,
                lowestBankroll,
                spinsToLowest,
                winningSpins,
                losingSpins
              },
            },
          };
        }),

      setBulkResults: (newSpins) =>
        set((state) => {
          // Calculate Metrics for the entire set
          const totalSpins = newSpins.length;
          if (totalSpins === 0) return { results: { spins: [], metrics: DEFAULT_METRICS } };

          const winningSpins = newSpins.filter((s) => s.totalProfit > 0).length;
          const losingSpins = newSpins.filter((s) => s.totalProfit < 0).length;
          const winRate = totalSpins > 0 ? winningSpins / totalSpins : 0;

          const currentBankroll = newSpins[newSpins.length - 1].bankrollAfter;
          const totalProfit = currentBankroll - state.config.startingBankroll;

          let peakBankroll = state.config.startingBankroll;
          let spinsToPeak = 0;
          let lowestBankroll = state.config.startingBankroll;
          let spinsToLowest = 0;
          let maxDrawdown = 0;
          let tempPeak = state.config.startingBankroll;

          const bankrolls = [state.config.startingBankroll];
          newSpins.forEach(s => bankrolls.push(s.bankrollAfter));

          bankrolls.forEach((b, index) => {
            if (b > peakBankroll) {
              peakBankroll = b;
              spinsToPeak = index;
            }
            if (b < lowestBankroll) {
              lowestBankroll = b;
              spinsToLowest = index;
            }

            if (b > tempPeak) {
              tempPeak = b;
            }
            const dd = tempPeak - b;
            if (dd > maxDrawdown) {
              maxDrawdown = dd;
            }
          });

          const totalBetAmount = newSpins.reduce((sum, s) => sum + s.bets.reduce((bSum, b) => bSum + b.amount, 0), 0);
          const averageBet = totalSpins > 0 ? totalBetAmount / totalSpins : 0;

          const maxBet = newSpins.reduce((max, s) => {
            const spinTotalBet = s.bets.reduce((bSum, b) => bSum + b.amount, 0);
            return spinTotalBet > max ? spinTotalBet : max;
          }, 0);

          const newResults = {
            spins: newSpins,
            metrics: {
              totalProfit,
              winRate,
              maxDrawdown,
              averageBet,
              maxBet,
              finalBankroll: currentBankroll,
              peakBankroll,
              spinsToPeak,
              lowestBankroll,
              spinsToLowest,
              winningSpins,
              losingSpins
            },
          };

          // Cache the results
          const cacheKey = state.currentFileId || 'custom';

          // Ensure we are saving a complete object
          const resultsToCache = {
            spins: newSpins,
            metrics: {
              totalProfit,
              winRate,
              maxDrawdown,
              averageBet,
              maxBet,
              finalBankroll: currentBankroll,
              peakBankroll,
              spinsToPeak,
              lowestBankroll,
              spinsToLowest,
              winningSpins,
              losingSpins
            },
            zoomState: undefined // Reset zoom on new run
          };

          return {
            results: resultsToCache,
            cachedResults: {
              ...state.cachedResults,
              [cacheKey]: resultsToCache
            }
          };
        }),

      saveStrategy: (name, description) =>
        set((state) => {
          const newStrategy: SavedStrategy = {
            id: generateId(),
            name,
            code: state.strategy.code,
            description,
            createdAt: Date.now()
          };
          return {
            savedStrategies: [...state.savedStrategies, newStrategy]
          };
        }),

      loadStrategy: (id) =>
        set((state) => {
          const strategyToLoad = state.savedStrategies.find(s => s.id === id);
          if (strategyToLoad) {
            return {
              strategy: { ...strategyToLoad }
            };
          }
          return {};
        }),

      deleteStrategy: (id) =>
        set((state) => ({
          savedStrategies: state.savedStrategies.filter(s => s.id !== id)
        })),

      duplicateStrategy: (id) =>
        set((state) => {
          const strategy = state.savedStrategies.find(s => s.id === id);
          if (!strategy) return {};
          const newStrategy: SavedStrategy = {
            ...strategy,
            id: generateId(),
            name: `${strategy.name} (Copy)`,
            createdAt: Date.now()
          };
          return {
            savedStrategies: [...state.savedStrategies, newStrategy]
          };
        }),

      setImportedData: (data) =>
        set((state) => {
          // Force config update as well to ensure it picks up the change
          const newConfig = {
            ...state.config,
            useImportedData: data.length > 0
          };

          return {
            importedData: data,
            config: newConfig
          };
        }),

      setChartZoom: (startIndex, endIndex) =>
        set((state) => {
          const cacheKey = state.currentFileId || 'custom';

          // Safety check: if no results exist, don't try to zoom or cache
          if (state.results.spins.length === 0) return {};

          const newResults = {
            ...state.results,
            zoomState: { startIndex, endIndex }
          };

          return {
            results: newResults,
            cachedResults: {
              ...state.cachedResults,
              [cacheKey]: {
                ...state.cachedResults[cacheKey],
                // Ensure we have valid data in cache before updating zoom
                spins: state.results.spins.length > 0 ? state.results.spins : (state.cachedResults[cacheKey]?.spins || []),
                metrics: state.results.metrics,
                zoomState: { startIndex, endIndex }
              }
            }
          };
        }),

      setLayout: (layout) => set((state) => ({ layout: { ...state.layout, ...layout } })),
    }),
    {
      name: 'roulette-simulation-storage',
      partialize: (state) => ({
        savedStrategies: state.savedStrategies,
        config: state.config,
        layout: state.layout,
        fsNodes: state.fsNodes, // Persist File System
        currentFileId: state.currentFileId, // Persist current file selection
        // cachedResults: state.cachedResults, // DO NOT PERSIST CACHE - It's too large for localStorage (5MB limit)
        // importedData is intentionally NOT persisted to avoid
        // serializing huge arrays (700K+ items) to localStorage which
        // causes the UI to freeze. Users re-import after page reload.
      }),
      onRehydrateStorage: () => (state) => {
        // When store is rehydrated, if we have a selected file but empty results,
        // try to restore from cache.
        if (state && state.currentFileId && state.cachedResults[state.currentFileId]) {
          const cached = state.cachedResults[state.currentFileId];
          // Manually restore results to avoid 'results' persistence duplication
          state.results = {
            spins: cached.spins,
            metrics: cached.metrics,
            zoomState: cached.zoomState
          };
        }
      }
    }
  )
);

