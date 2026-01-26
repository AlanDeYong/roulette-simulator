import { useRef, useCallback } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { spinRoulette, calculatePayout, getNumberColor } from '../utils/roulette';
import { Bet, SpinResult, StrategyBet } from '../types';

export const useSimulationRunner = () => {
  const store = useSimulationStore();
  const { config, strategy, importedData } = store;
  const stopRef = useRef(false);

  const runSimulation = useCallback(async () => {
    stopRef.current = false;
    store.resetSimulation();
    store.setStatus('running');

    // Allow UI to update to 'running' state
    await new Promise(r => setTimeout(r, 0));

    let currentBankroll = config.startingBankroll;
    const spinResults: SpinResult[] = [];
    
    // Determine the sequence of numbers
    let numbersToProcess: number[] = [];
    
    if (config.useImportedData && importedData.length > 0) {
        let start = (config.dataRange.start || 1) - 1; // 0-based index
        let end = config.dataRange.end ? config.dataRange.end : importedData.length;
        
        if (config.dataRange.fromEnd) {
            // Start from end
            // E.g. start=1 means last item. start=10 means 10th from last.
            // This is ambiguous. "Input for selecting first spin to start from top or bottom of data"
            // Usually "from bottom" means taking the last N spins or starting N from end?
            // Let's assume standard array slicing.
            // If "Start from end" is checked:
            // start index = length - start
            // end index = length - end (if provided)
            
            // Let's interpret "Start Spin" as index from end if checked.
            // If start=1, fromEnd=true -> index = length - 1.
            start = Math.max(0, importedData.length - config.dataRange.start);
            if (config.dataRange.end) {
                 // If end provided with fromEnd, maybe it defines the range?
                 // Let's assume user wants a range.
                 // Simplest: Slice array then reverse? Or just slice.
                 // Let's stick to simple: "Start Spin" is the index.
                 // If fromEnd, start is relative to end.
            }
        }
        
        // Simple slicing based on user input (1-based index from UI)
        let startIndex = Math.max(0, config.dataRange.start - 1);
        let endIndex = config.dataRange.end || importedData.length;
        
        if (config.dataRange.fromEnd) {
            // Re-interpret: Start processing from the end of the file?
            // "Input for selecting first spin to start from top or bottom of data"
            // Likely means: Do we start simulation at line 1 (Top) or line N (Bottom)?
            // If Bottom, we probably process in reverse or just start at N?
            // "Bulk Simulation: Iterates through... spin-by-spin"
            // Let's assume standard:
            // Top: Index 0 -> End
            // Bottom: Index N -> 0? Or Index N -> End?
            // Usually data is ordered chronologically.
            // If "Start from bottom", maybe they want to run the MOST RECENT spins?
            // e.g. Start from Spin 1000 (which is at the bottom).
            
            // Let's implement:
            // if fromEnd is false: slice(start-1, end)
            // if fromEnd is true: slice(length - start, length - end??)
            // Let's simplify: User selects specific start index. 
            // If "fromEnd" is checked, start index is calculated as length - start.
            if (config.dataRange.fromEnd) {
                 startIndex = Math.max(0, importedData.length - config.dataRange.start);
            }
        }

        numbersToProcess = importedData.slice(startIndex, endIndex);
        
        // Limit by maxSpins if necessary? The prompt says "Iterates through...".
        // Usually maxSpins overrides.
        if (config.maxSpins && numbersToProcess.length > config.maxSpins) {
            numbersToProcess = numbersToProcess.slice(0, config.maxSpins);
        }
    } else {
        // Random generation
        // We will generate on the fly in the loop
    }

    const totalSpinsToRun = config.useImportedData ? numbersToProcess.length : config.maxSpins;

    try {
        // Prepare Strategy Function
        // We inject a 'state' object that persists across spins for the simulation run
        const strategyBody = strategy.code + '\nreturn bet(spinHistory, bankroll, config, state, utils);';
        const executeStrategy = new Function('spinHistory', 'bankroll', 'config', 'state', 'utils', strategyBody);

        // Persistent state for the strategy
        const strategyState: Record<string, any> = {};

        // Utils for strategy
        const utils = {
            saveFile: (filename: string, content: string) => {
                // Ensure filename is safe-ish and within strategies folder logic
                // The API expects 'id' which is relative path.
                // We'll trust the user's filename but ensure it's a string.
                if (typeof filename !== 'string' || !filename) {
                    console.error("utils.saveFile: Invalid filename");
                    return Promise.resolve();
                }
                
                // Return promise so we can await it if needed
                return fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: filename, content: String(content) })
                }).catch(err => console.error("utils.saveFile error:", err));
            },
            log: (msg: any) => console.log("[Strategy Log]:", msg)
        };

        for (let i = 0; i < totalSpinsToRun; i++) {
            if (currentBankroll <= 0 || stopRef.current) break;

            // 1. Execute Strategy
            // We pass the *current* spinResults array as history
            let rawBets: StrategyBet[] = [];
            try {
                const result = executeStrategy(spinResults, currentBankroll, config, strategyState, utils);
                if (Array.isArray(result)) {
                    rawBets = result;
                } else if (result) {
                    rawBets = [result];
                }
            } catch (e) {
                console.error("Strategy execution error:", e);
                // Optionally alert user or log to a system log
                break;
            }

            // 2. Validate Bets
            const validBets: StrategyBet[] = [];
            let totalBetAmount = 0;
            
            // Check if rawBets is valid array
            if (Array.isArray(rawBets)) {
                for (const bet of rawBets) {
                    if (bet && bet.amount > 0 && bet.type) {
                        // Check Limits
                        const isOutside = ['red', 'black', 'even', 'odd', 'low', 'high', 'dozen', 'column'].includes(bet.type);
                        const minLimit = isOutside ? config.betLimits.minOutside : config.betLimits.min;
                        
                        if (bet.amount < minLimit) {
                             // Debug warning for rejected bets
                             console.warn(`Bet rejected: ${bet.type} amount ${bet.amount} is below minimum ${minLimit}`);
                             continue; 
                        }
                        
                        let amount = Math.min(bet.amount, config.betLimits.max); // Clamp to max
                        
                        if (totalBetAmount + amount > currentBankroll) {
                             amount = currentBankroll - totalBetAmount;
                             if (amount <= 0) break;
                        }
                        
                        validBets.push({ ...bet, amount });
                        totalBetAmount += amount;
                    }
                }
            } else if (rawBets) {
                // If strategy returned non-array but truthy, log warning
                console.warn("Strategy returned invalid bet structure (not an array):", rawBets);
            }

            if (validBets.length === 0 && currentBankroll < config.betLimits.min) {
                 // Bankroll too low to play
                 break;
            }

            // 3. Determine Winning Number
            let number: number;
            let color: 'red' | 'black' | 'green';

            if (config.useImportedData) {
                number = numbersToProcess[i];
                color = getNumberColor(number);
            } else {
                const spin = spinRoulette(config.tableType);
                number = spin.number;
                color = spin.color;
            }

            // 4. Calculate Payouts
            let roundProfit = 0;
            const resultBets: Bet[] = validBets.map(b => {
                const payout = calculatePayout(b, number); // Net profit/loss
                return {
                    ...b,
                    id: Math.random().toString(36).substr(2, 9),
                    payout: payout > 0 ? payout + b.amount : 0,
                    isWin: payout > 0,
                    profit: payout
                };
            });

            roundProfit = resultBets.reduce((sum, b) => sum + b.profit, 0);
            const bankrollBefore = currentBankroll;
            currentBankroll += roundProfit;

            spinResults.push({
                id: Math.random().toString(36).substr(2, 9),
                simulationId: store.id,
                spinNumber: i + 1,
                winningNumber: number,
                winningColor: color,
                bankrollBefore,
                bankrollAfter: currentBankroll,
                totalProfit: roundProfit,
                timestamp: new Date().toISOString(),
                bets: resultBets
            });
            
            // Optional: Yield to UI thread every 500 spins to prevent freeze
            if (i % 500 === 0 && i > 0) {
                 await new Promise(r => setTimeout(r, 0));
            }
        }
        
        // Final Strategy Cleanup / Save (MOVED INSIDE TRY BLOCK)
        // If the strategy has a "cleanup" or we just want to force a save of any logs
        if (strategyState.logHistory && utils.saveFile) {
             // Force save the final log
             console.log("Saving final log...");
             await utils.saveFile("rankings_log.txt", strategyState.logHistory);
        }

    } catch (e) {
        console.error("Simulation failed:", e);
    }

    // Bulk update store
    store.setBulkResults(spinResults);
    store.setStatus('completed');
    
    // Removed old cleanup block that was out of scope

  }, [config, strategy, store]);

  const stopSimulation = useCallback(() => {
    stopRef.current = true;
  }, []);

  return { runSimulation, stopSimulation };
};
