/**
 * Strategy: Positive Cash Roulette System
 * Source: https://www.youtube.com/watch?v=Yk9ycGMLIlU (The Roulette Master)
 *
 * The Logic:
 * - Start with 6 specific non-overlapping corner bets.
 * - If you win on the first spin (or any spin before a loss), keep the bets exactly the same.
 * - If you lose, keep the bet amounts the same (no Martingale).
 *
 * The Progression:
 * - "Win after a Loss": Remove the specific corner bet that just hit. Then, increase the wager 
 * on the remaining corners by 1 base unit (e.g., $5).
 * - Minimum Coverage: Never drop below 3 active corners (12 numbers).
 * - Reset Condition 1 (Recovery): If you win while at the minimum 3 corners, but your bankroll is 
 * still below the session starting bankroll, restart the entire system (6 corners) but double 
 * the starting base bet.
 *
 * The Goal:
 * - Reset Condition 2 (Profit): Once a session profit is achieved at any point, immediately reset 
 * to the original 6 corners at the 1x base unit, securing the profit and starting a new cycle.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper: Determine if a roulette number falls within a specific corner bet.
    // A corner starting at 'c' covers [c, c+1, c+3, c+4].
    const isNumberInCorner = (num, cornerStart) => {
        if (num === 0 || num === '00') return false;
        let n = parseInt(num, 10);
        return n === cornerStart || n === cornerStart + 1 ||
               n === cornerStart + 3 || n === cornerStart + 4;
    };

    // 1. Initialize State on first run
    if (!state.initialized) {
        state.baseUnit = config.betLimits.min; 
        state.corners = [2, 8, 14, 20, 26, 32]; // 6 non-overlapping corners
        state.baseMultiplier = 1;
        state.betAmount = state.baseUnit * state.baseMultiplier;
        state.sessionBankroll = bankroll; 
        state.hadLoss = false;
        state.initialized = true;
    }

    // 2. Evaluate the previous spin (if any)
    if (spinHistory.length > 0) {
        let lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        let won = false;
        let winningCorner = null;

        // Check if our last spin won on any active corners
        for (let c of state.corners) {
            if (isNumberInCorner(lastSpin, c)) {
                won = true;
                winningCorner = c;
                break;
            }
        }

        if (won) {
            // Reset Condition 2: Achieved Session Profit
            if (bankroll > state.sessionBankroll) {
                state.corners = [2, 8, 14, 20, 26, 32];
                state.baseMultiplier = 1;
                state.betAmount = state.baseUnit;
                state.hadLoss = false;
                state.sessionBankroll = bankroll; // Set new high-water mark
            } 
            // Progression: Win AFTER a Loss
            else if (state.hadLoss) {
                if (state.corners.length > 3) {
                    // Remove the corner that hit
                    state.corners = state.corners.filter(c => c !== winningCorner);
                    
                    // Determine increment based on config
                    let increment = (config.incrementMode === 'fixed' && config.minIncrementalBet) 
                                    ? config.minIncrementalBet 
                                    : state.baseUnit;
                    
                    state.betAmount += increment;
                } 
                // Reset Condition 1: Reached minimum corners, won, but NO profit
                else if (state.corners.length <= 3) {
                    state.baseMultiplier *= 2; // Double the starting bet
                    state.corners = [2, 8, 14, 20, 26, 32];
                    state.betAmount = state.baseUnit * state.baseMultiplier;
                    state.hadLoss = false; // Reset loss tracker for the new deeper cycle
                }
            }
            // If we won but haven't had a loss yet, we do nothing and keep farming the flat bets.
        } else {
            // Loss: Mark that a loss occurred, but do NOT increase bets.
            state.hadLoss = true;
        }
    }

    // 3. Calculate and Clamp Final Bet Amounts
    let amount = state.betAmount;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 4. Validate Bankroll and Construct Bets
    let totalRequired = amount * state.corners.length;
    if (bankroll < totalRequired) {
        return null; // Stop-loss triggered by insufficient funds
    }

    let bets = [];
    for (let c of state.corners) {
        bets.push({ type: 'corner', value: c, amount: amount });
    }

    return bets;
}