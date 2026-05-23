/**
 * Strategy: Atomic Voisins (Hybrid Voisins + Column)
 * * Source: 
 * Video: "Controlled Roulette Betting with Explosive Potential" by Casino Matchmaker
 * URL: https://www.youtube.com/watch?v=dlmJREnF6tM
 * * The Logic:
 * This is a "hybrid" strategy that covers ~65% of the wheel (24 numbers) by combining:
 * 1. A double-strength "Voisins du Zéro" (Neighbors of Zero) bet on the racetrack.
 * 2. A heavy bet on the 2nd Column.
 * * This creates tiered winning zones:
 * - Small Wins ($6 profit @ base): Non-overlapping numbers in Voisins OR Column.
 * - Medium Wins ($18 profit @ base): The 0/2/3 trio.
 * - Big Wins ($42 profit @ base): Overlap numbers (Voisins + Column).
 * - Atomic Win ($54 profit @ base): Number 2 (Specific overlap/weighting in this setup).
 * * The Progression:
 * - Base Unit: The video uses a $30 total bet model ($12 on Column, $18 on Voisins).
 * - ON LOSS: Increase the betting level by 1 (Arithmetic Progression: 1x -> 2x -> 3x).
 * - ON WIN: 
 * - If Session Profit is reached: Reset to Level 1.
 * - If "Big Win" hit (but no session profit): Decrease level by 1.
 * - If 3 Consecutive "Small Wins": Decrease level by 1.
 * * The Goal:
 * - Reach any session profit (Bankroll > Start Bankroll) and reset immediately.
 * - Survive variance using the "Small Win" de-escalation logic.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. State Initialization ---
    if (state.level === undefined) {
        state.level = 1;                // Current betting level (multiplier)
        state.startBankroll = bankroll; // Snapshot starting bankroll for session profit check
        state.smallWinStreak = 0;       // Track consecutive small wins for de-escalation
        state.lastBetTotal = 0;         // Track previous bet size to determine win/loss
    }

    // --- 2. Analyze Previous Spin (if any) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        const isVoisins = [0, 2, 3, 4, 7, 12, 15, 18, 19, 21, 22, 25, 26, 28, 29, 32, 35].includes(lastNumber);
        const isCol2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].includes(lastNumber);
        
        const isWin = isVoisins || isCol2;

        if (isWin) {
            if (bankroll > state.startBankroll) {
                state.level = 1;
                state.smallWinStreak = 0;
            } else {
                const isBigWin = isVoisins && isCol2; 
                
                if (isBigWin || [0, 2, 3].includes(lastNumber)) {
                    state.level = Math.max(1, state.level - 1);
                    state.smallWinStreak = 0;
                } else {
                    state.smallWinStreak++;
                    if (state.smallWinStreak >= 3) {
                        state.level = Math.max(1, state.level - 1);
                        state.smallWinStreak = 0; 
                    }
                }
            }
        } else {
            state.level++;
            state.smallWinStreak = 0; 
        }
    }

    // --- 3. Determine Bet Sizes ---
    const minChipByLimit = config.betLimits.min / 2;
    const baseChipValue = Math.max(1, minChipByLimit); 
    
    const currentChipValue = baseChipValue * state.level;
    
    // --- 4. Construct Bets ---
    const bets = [];

    const addBet = (type, value, chipCount) => {
        let amount = chipCount * currentChipValue;
        
        if (['dozen', 'column', 'red', 'black', 'even', 'odd', 'high', 'low'].includes(type)) {
             amount = Math.max(amount, config.betLimits.minOutside);
        } else {
             amount = Math.max(amount, config.betLimits.min);
        }
        
        amount = Math.min(amount, config.betLimits.max);

        if (amount > 0) {
            bets.push({ type, value, amount });
        }
    };

    // A. 2nd Column (12 chips)
    addBet('column', 2, 12);

    // B. Voisins du Zéro (Double Strength = 18 chips total)
    
    // 0/2/3 Trio - Changed from 'basket' to 'street' to enforce an 11:1 payout
    addBet('trio', [0, 2, 3], 4);

    // Corner 25/26/28/29 
    addBet('corner', 25, 4);

    // Splits 
    addBet('split', [4, 7], 2);
    addBet('split', [12, 15], 2);
    addBet('split', [18, 21], 2);
    addBet('split', [19, 22], 2);
    addBet('split', [32, 35], 2);

    // --- 5. Safety Check & Return ---
    const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    state.lastBetTotal = totalBetAmount;

    if (totalBetAmount > bankroll) {
        return [];
    }

    return bets;
}