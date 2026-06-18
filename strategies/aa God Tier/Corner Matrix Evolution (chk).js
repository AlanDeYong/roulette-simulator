/**
 * Strategy: Corner Matrix Evolution (Dynamic Recovery)
 * Source: https://youtu.be/EWe7bD2dh1M (YouTube Channel: The Roulette Master)
 *
 * Logic:
 * - 4 Corner bets (1 unit each), Black (2 units), Second Column (4 units).
 * - Placement: Starts randomly left/right. Zig-zag pattern, avoiding middle dozens.
 * - Win (Peak Profit): If bankroll reaches a new session high, reset to base bets, 
 * revert to 4 corners, and swap to the opposite side of the table.
 * - Win (Recovering): If bankroll is still below the session high, simply REBET 
 * the exact same amounts to continue recovery.
 * - Loss 1 (Small Loss): Rebet exact same amounts/positions.
 * - Loss 2 (Consecutive): Increase all bets by their STRICT respective base bet 
 * amounts (Corners +1 unit, Black +2 units, Column +4 units). If there are only 
 * 4 corners, add a 5th corner. If there are already 5, just increase bets.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Helper: Generate the Zig-Zag Corner Sequences
    function generateCornerSequence(side) {
        const isPatternA = Math.random() < 0.5;
        if (side === 'left') {
            return isPatternA 
                ? [1, 8, 13, 20, 25, 32] 
                : [2, 7, 14, 19, 26, 31];
        } else {
            return isPatternA 
                ? [31, 26, 19, 14, 7, 2] 
                : [32, 25, 20, 13, 8, 1];
        }
    }

    // 1. Initialize State & Absolute Start of Play Logic
    if (state.startSide === undefined || spinHistory.length === 0) {
        state.progressionLevel = 1;
        state.consecutiveLosses = 0;
        state.activeCorners = 4;
        state.highestBankroll = bankroll; // Track peak profit
        
        state.startSide = Math.random() < 0.5 ? 'left' : 'right';
        state.cornerSequence = generateCornerSequence(state.startSide);
    }

    // Safe Config Defaults
    const minLimit = (config.betLimits && config.betLimits.min) !== undefined ? config.betLimits.min : 1;
    const maxLimit = (config.betLimits && config.betLimits.max) !== undefined ? config.betLimits.max : 500;
    
    // Base unit definition
    const unit = minLimit; 

    const secondColumnNumbers = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
    const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

    function evaluatePreviousSpin(lastSpin, lastBets) {
        let totalWon = 0;
        let totalBet = 0;
        const num = Number(lastSpin.winningNumber);

        lastBets.forEach(b => {
            totalBet += b.amount;
            if (b.type === 'black' && blackNumbers.includes(num)) {
                totalWon += b.amount * 2;
            } else if (b.type === 'column' && b.value === 2 && secondColumnNumbers.includes(num)) {
                totalWon += b.amount * 3;
            } else if (b.type === 'corner') {
                const v = b.value;
                const covered = [v, v + 1, v + 3, v + 4];
                if (covered.includes(num)) {
                    totalWon += b.amount * 9;
                }
            }
        });
        return totalWon > totalBet; 
    }

    function executeReset() {
        state.progressionLevel = 1;
        state.consecutiveLosses = 0;
        state.activeCorners = 4;
        
        // After a reset, switch to the opposite end of the table
        state.startSide = state.startSide === 'left' ? 'right' : 'left';
        state.cornerSequence = generateCornerSequence(state.startSide);
    }

    // 2. Process History & Peak Profit Recovery Logic
    if (spinHistory.length > 0 && state.previousBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const isWin = evaluatePreviousSpin(lastSpin, state.previousBets);

        if (isWin) {
            state.consecutiveLosses = 0; // Break the loss streak counter
            
            // If we reached or exceeded our session high, reset the system.
            if (bankroll >= state.highestBankroll) {
                executeReset();
            }
        } else {
            state.consecutiveLosses++;
            if (state.consecutiveLosses >= 2) {
                state.progressionLevel++;
                // Add a 5th corner if we only have 4, otherwise cap at 5
                state.activeCorners = Math.min(state.activeCorners + 1, 5); 
                state.consecutiveLosses = 0; // Reset cycle for the next 2 losses
            }
        }
    }

    // Update highest bankroll AFTER resolving the spin's result
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    // 3. Calculate Bet Amounts (Hardcoded to scale by respective base amounts)
    let amountCorner = (unit * 1) * state.progressionLevel;
    let amountBlack = (unit * 2) * state.progressionLevel;
    let amountCol = (unit * 4) * state.progressionLevel;

    // Apply strict max limit (to prevent exceeding table max)
    amountCorner = Math.min(amountCorner, maxLimit);
    amountBlack = Math.min(amountBlack, maxLimit);
    amountCol = Math.min(amountCol, maxLimit);

    // 4. Construct Bets Array
    const currentBets = [
        { type: 'black', amount: amountBlack },
        { type: 'column', value: 2, amount: amountCol }
    ];

    for (let i = 0; i < state.activeCorners; i++) {
        currentBets.push({ type: 'corner', value: state.cornerSequence[i], amount: amountCorner });
    }

    state.previousBets = currentBets;

    return currentBets;
}