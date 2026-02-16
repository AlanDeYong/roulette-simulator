import { useRef, useCallback, useEffect } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { spinRoulette, calculatePayout, getNumberColor } from '../utils/roulette';
import { Bet, SpinResult, StrategyBet } from '../types';

export const useSimulationRunner = () => {
  const store = useSimulationStore();
  const { config, strategy, importedData } = store;
  // Ref to hold the latest importedData
  const importedDataRef = useRef(importedData);
  
  // Update ref when importedData changes
  useEffect(() => {
      importedDataRef.current = importedData;
  }, [importedData]);

  const stopRef = useRef(false);

  const runSimulation = useCallback(async () => {
    // Force get the absolute latest state from the store directly
    // This bypasses any stale closures or effect timing issues in the component
    const currentStore = useSimulationStore.getState();
    const currentImportedData = currentStore.importedData;
    const currentConfig = currentStore.config;
    
    stopRef.current = false;
    store.resetSimulation();
    store.setStatus('running');
    
    // Debug log to verify what data we are using
    console.log("Run Simulation - Data Source:", currentConfig.useImportedData ? "Imported" : "Random");
    console.log("Run Simulation - Imported Data Length:", currentImportedData.length);
    if (currentImportedData.length > 0) {
        console.log("Run Simulation - First 5 numbers:", currentImportedData.slice(0, 5));
    }

    // Allow UI to update to 'running' state
    await new Promise(r => setTimeout(r, 0));

    let currentBankroll = currentConfig.startingBankroll;
    const spinResults: SpinResult[] = [];
    
    // Determine the sequence of numbers
    let numbersToProcess: number[] = [];
    
    if (currentConfig.useImportedData && currentImportedData.length > 0) {
        // Use directly fetched data
        const dataToUse = currentImportedData;
        
        // Use config from fresh state
        let start = (currentConfig.dataRange.start || 1) - 1; 
        let end = currentConfig.dataRange.end ? currentConfig.dataRange.end : dataToUse.length;
        
        let startIndex = Math.max(0, currentConfig.dataRange.start - 1);
        let endIndex = currentConfig.dataRange.end || dataToUse.length;
        
        if (currentConfig.dataRange.fromEnd) {
             startIndex = Math.max(0, dataToUse.length - currentConfig.dataRange.start);
        }

        numbersToProcess = dataToUse.slice(startIndex, endIndex);
        
        if (currentConfig.maxSpins && numbersToProcess.length > currentConfig.maxSpins) {
            numbersToProcess = numbersToProcess.slice(0, currentConfig.maxSpins);
        }
    } else {
        // Random generation
    }

    const totalSpinsToRun = currentConfig.useImportedData ? numbersToProcess.length : currentConfig.maxSpins;

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
            const isVirtual = !!strategyState.virtualActive;
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
                        
                        // Only check bankroll limit if NOT virtual
                        if (!isVirtual && totalBetAmount + amount > currentBankroll) {
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

            if (!isVirtual && validBets.length === 0 && currentBankroll < config.betLimits.min) {
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
            
            if (!isVirtual) {
                currentBankroll += roundProfit;
            }

            spinResults.push({
                id: Math.random().toString(36).substr(2, 9),
                simulationId: store.id,
                spinNumber: i + 1,
                winningNumber: number,
                winningColor: color,
                bankrollBefore,
                bankrollAfter: currentBankroll,
                virtualBankroll: strategyState.virtualActive ? strategyState.virtualBankroll : undefined,
                isVirtual,
                totalProfit: isVirtual ? 0 : roundProfit, // Keep totalProfit 0 for virtual spins in main log (or should we store it?)
                // If we store roundProfit in totalProfit, the Chart might plot it as P/L?
                // Standard chart uses bankrollAfter.
                // ExecutionLog uses totalProfit.
                // If isVirtual, we probably want totalProfit to be 0 so "Profit" column shows 0/Push (or we handle display).
                // User wants "Profit indicating it is virtual amount".
                // If I store the virtual profit here, it might mess up "Win Rate" stats?
                // useSimulationStore: winningSpins = filter(s => s.totalProfit > 0).
                // If I count virtual wins as wins, it distorts stats.
                // So totalProfit should be 0.
                // I will add a separate `virtualProfit` field? Or just use `bets` to calculate?
                // Let's stick to totalProfit = 0 for safety, and use `bets` to display.
                // Wait, user wants "Profit indicating it is virtual amount".
                // I can calculate it from bets in the UI.
                
                timestamp: new Date().toISOString(),
                bets: resultBets
            });
            
            // Optional: Yield to UI thread every 20 spins to prevent freeze
            // Large simulations (e.g. 700k spins) need frequent yielding to keep "Stop" button responsive
            if (i % 20 === 0 && i > 0) {
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
