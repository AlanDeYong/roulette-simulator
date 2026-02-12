/**
 * STRATEGY: The Dutch 5 (Hybrid High Coverage + Compressed Hollandish Recovery)
 * * SOURCE: 
 * URL: https://www.youtube.com/watch?v=slRGZFpr5S0
 * Channel: Ninja Gamblers
 * * THE LOGIC:
 * 1. Base Game (Blocking):
 * - Places 5 Double Street (Line) bets covering 30 numbers.
 * * 2. The Trigger:
 * - A loss in the Base Game (net -5 units) triggers Recovery Mode.
 * * 3. The Progression (Recovery Mode):
 * - Uses "Compressed Hollandish" on Even Money bets (Opposite Color).
 * - Level 1: 5 units. Level 2: 7 units. Level 3+: +2 units each level.
 * * 4. Session Reset:
 * - When 'config.targetProfit' is reached, the session resets.
 * - The current bankroll becomes the new baseline, and the strategy restarts at Base.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const INSIDE_MIN = config.betLimits.min;
    const OUTSIDE_MIN = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;
    
    // Default target profit if not specified in config
    // 100 units is a standard conservative session goal
    const TARGET_PROFIT = config.targetProfit || (INSIDE_MIN * 100);

    // Define the 5 Double Streets (Lines)
    const BASE_LINES = [1, 7, 13, 19, 25]; 
    
    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.mode = 'BASE';            
        state.recoveryLevel = 1;        
        state.virtualLedger = 0;        
        state.consecutiveWins = 0;      
        state.logData = [];             
        
        // Session Tracking
        state.sessionStartBankroll = bankroll;
        
        state.initialized = true;
    }

    // --- 3. CHECK SESSION PROFIT RESET ---
    // Calculate current session profit
    const currentProfit = bankroll - state.sessionStartBankroll;

    if (currentProfit >= TARGET_PROFIT) {
        // Log the achievement
        state.logData.push(`*** SESSION TARGET REACHED ***`);
        state.logData.push(`Profit: ${currentProfit}. Resetting Session Baseline.`);
        
        // RESET SESSION
        state.sessionStartBankroll = bankroll; // Bank the profit
        state.mode = 'BASE';                   // Reset strategy
        state.recoveryLevel = 1;
        state.virtualLedger = 0;
        state.consecutiveWins = 0;
        
        // We continue playing immediately with the new baseline
    }

    // --- 4. PROCESS PREVIOUS SPIN (Update State) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.totalPayout || 0; 
        
        if (state.mode === 'BASE') {
            // Determine if we won the Base Bet
            const coveredNumbers = [
                ...Array.from({length: 6}, (_, i) => 1 + i),  // 1-6
                ...Array.from({length: 6}, (_, i) => 7 + i),  // 7-12
                ...Array.from({length: 6}, (_, i) => 13 + i), // 13-18
                ...Array.from({length: 6}, (_, i) => 19 + i), // 19-24
                ...Array.from({length: 6}, (_, i) => 25 + i)  // 25-30
            ];
            
            const wonBase = coveredNumbers.includes(lastSpin.winningNumber);
            
            if (!wonBase) {
                state.mode = 'RECOVERY';
                state.virtualLedger = -5 * INSIDE_MIN; // Lost 5 units
                state.recoveryLevel = 1;
                state.consecutiveWins = 0;
                state.logData.push(`Spin ${spinHistory.length}: Base Loss. Entering Recovery.`);
            }
        } else if (state.mode === 'RECOVERY') {
            const wonRecovery = lastWinAmount > 0;

            if (wonRecovery) {
                // Reconstruct bet size to track ledger accurately
                const prevBetUnit = 5 + ((state.recoveryLevel - 1) * 2);
                const prevBetAmount = prevBetUnit * OUTSIDE_MIN;
                
                state.virtualLedger += prevBetAmount; 
                state.consecutiveWins++;
                state.logData.push(`Spin ${spinHistory.length}: Recovery Win. Ledger: ${state.virtualLedger}`);
            } else {
                const prevBetUnit = 5 + ((state.recoveryLevel - 1) * 2);
                const prevBetAmount = prevBetUnit * OUTSIDE_MIN;
                
                state.virtualLedger -= prevBetAmount;
                state.consecutiveWins = 0;
                state.logData.push(`Spin ${spinHistory.length}: Recovery Loss. Ledger: ${state.virtualLedger}`);
                
                // Progression
                state.recoveryLevel++;
            }

            // RECOVERY EXIT CONDITION
            if (state.virtualLedger >= 0) {
                state.mode = 'BASE';
                state.virtualLedger = 0;
                state.recoveryLevel = 1;
                state.logData.push(`Spin ${spinHistory.length}: Recovery Complete. Returning to Base.`);
            }
        }
    }

    // --- 5. LOGGING ---
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        const logContent = state.logData.join('\n');
        state.logData = []; 
        utils.saveFile(`dutch5_log_${Date.now()}.txt`, logContent)
            .catch(err => console.error("Log save failed", err));
    }

    // --- 6. GENERATE BETS ---
    const bets = [];

    if (state.mode === 'BASE') {
        // Base: 5 Double Streets
        BASE_LINES.forEach(lineStart => {
            let amount = Math.max(INSIDE_MIN, config.betLimits.min);
            amount = Math.min(amount, MAX_BET);

            bets.push({
                type: 'line',
                value: lineStart,
                amount: amount
            });
        });

    } else {
        // Recovery: Compressed Hollandish on Opposite Color
        const units = 5 + ((state.recoveryLevel - 1) * 2);
        let amount = units * OUTSIDE_MIN;

        amount = Math.max(amount, OUTSIDE_MIN);
        amount = Math.min(amount, MAX_BET);

        // Determine Opposite Color
        let targetColor = 'red'; 
        if (spinHistory.length > 0) {
            const lastColor = spinHistory[spinHistory.length - 1].winningColor;
            if (lastColor === 'red') targetColor = 'black';
            else if (lastColor === 'black') targetColor = 'red';
        }

        bets.push({
            type: targetColor, 
            amount: amount
        });
    }

    return bets;
}