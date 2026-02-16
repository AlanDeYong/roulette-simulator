export type RouletteTableType = 'european' | 'american';

export interface BetLimits {
  min: number; // Minimum bet per individual number
  minOutside: number; // Minimum bet per outside position
  max: number;
}

export interface DataRange {
  start: number; // Start index (1-based or 0-based, depending on implementation)
  end: number | null; // End index, null means end of data
  fromEnd: boolean; // If true, start counting from the end
}

export interface SimulationConfig {
  startingBankroll: number;
  maxSpins: number;
  tableType: RouletteTableType;
  betLimits: BetLimits;
  dataRange: DataRange;
  useImportedData: boolean;
}

export interface Strategy {
  id: string;
  name: string;
  code: string;
  description?: string;
  isPreset?: boolean;
}

export interface StrategyBet {
  type: 'red' | 'black' | 'green' | 'even' | 'odd' | 'low' | 'high' | 'number' | 'dozen' | 'column' | 'street' | 'split' | 'corner' | 'line' | 'basket';
  value?: number | string | number[]; 
  amount: number;
}

export interface Bet extends StrategyBet {
  id: string;
  spinResultId?: string;
  payout: number;
  isWin: boolean;
  profit: number;
}

export interface SpinResult {
  id: string;
  simulationId: string;
  spinNumber: number;
  winningNumber: number;
  winningColor: 'red' | 'black' | 'green';
  bankrollBefore: number;
  bankrollAfter: number;
  totalProfit: number;
  virtualBankroll?: number;
  isVirtual?: boolean;
  timestamp: string;
  bets: Bet[];
}

export interface SimulationMetrics {
  totalProfit: number;
  winRate: number;
  maxDrawdown: number;
  averageBet: number;
  maxBet: number;
  finalBankroll: number;
  peakBankroll: number;
  spinsToPeak: number;
  lowestBankroll: number;
  spinsToLowest: number;
  winningSpins: number;
  losingSpins: number;
}

export interface SimulationResults {
    spins: SpinResult[];
    metrics: SimulationMetrics;
}

export interface SavedStrategy extends Strategy {
    createdAt: number;
}

export interface SimulationState {
  id: string;
  config: SimulationConfig;
  strategy: Strategy;
  savedStrategies: SavedStrategy[];
  importedData: number[];
  results: SimulationResults;
  status: 'idle' | 'running' | 'paused' | 'completed';
}
