/*
 * ROULETTE STRATEGY: Split Down the Miller (Non-Overlapping Zigzag)
 * Source: https://youtu.be/GnZEEW3tLqI?si=FAVbn92r-Qqi5nYb (The Roulette Master)
 * 
 * The Full Logic in details: 
 * - The strategy places 12 non-overlapping horizontal splits zigzagging down the board.
 * - It randomly selects a starting position on the first row: either [1,2] (Left-Mid) or [2,3] (Mid-Right).
 * - For each subsequent row, it places a split on the opposite side of the middle column 
 *   (e.g., if row 1 is [1,2], row 2 is [5,6], row 3 is [7,8], etc.) until 12 splits are placed.
 * - The strategy keeps track of the "session's peak profit" (the highest bankroll achieved).
 * 
 * The Full Bet Progression in details: 
 * - Initial/Reset state: 1 base unit (table minimum) on the 12 dynamically generated splits.
 * - On a Loss: Increase the bet amount on all currently active splits by 1 base unit.
 * - On a Win (if bankroll >= peak profit): The session goal is achieved. Reset all bets to 1 base unit on 12 newly randomized splits.
 * - On a Win (if bankroll < peak profit): 
 *    1. Remove the specific split that just won.
 *    2. Increase the bet amount on all remaining active splits by 1 base unit.
 * 
 * The Goal: 
 * - Continually secure new session peak profits by dropping winning numbers and aggressively scaling up remaining bets on both losses and sub-peak wins.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.min;

    // Helper to generate the 12 non-overlapping zigzag splits
    const getInitialSplits = () => {
        const splits = [];
        // Randomly pick starting side: true = start Left [1,2], false = start Right [2,3]
        const startLeft = Math.random() < 0.5; 
        
        for (let i = 0; i < 12; i++) {
            const rowStart = (i * 3); // row 0 starts at 0 (numbers 1,2,3), row 1 at 3 (numbers 4,5,6)
            
            // If starting left, even rows are left, odd are right. Reverse if starting right.
            const isLeftSplit = startLeft ? (i % 2 === 0) : (i % 2 !== 0);
            
            if (isLeftSplit) {
                splits.push([rowStart + 1, rowStart + 2]);
            } else {
                splits.push([rowStart + 2, rowStart + 3]);
            }
        }
        return splits.map(split => ({ value: split, amount: unit }));
    };

    // 2. Initialize State on first run
    if (!state.initialized) {
        state.peakBankroll = bankroll;
        state.splits = getInitialSplits();
        state.initialized = true;
    }

    // 3. Process previous spin result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Find if any of our active splits won
        const winningSplitIndex = state.splits.findIndex(s => s.value.includes(lastSpin));
        const isWin = winningSplitIndex !== -1;

        if (isWin) {
            // Check if we hit or exceeded our peak profit target
            if (bankroll >= state.peakBankroll) {
                // Reset progression
                state.splits = getInitialSplits();
            } else {
                // Sub-peak win: Remove winning split, increase remaining
                state.splits.splice(winningSplitIndex, 1);
                
                state.splits.forEach(s => {
                    s.amount += unit; 
                });

                // Failsafe: If all splits are eliminated but peak isn't reached, reset.
                if (state.splits.length === 0) {
                    state.splits = getInitialSplits();
                }
            }
        } else {
            // Loss: Increase all active splits by 1 base unit
            state.splits.forEach(s => {
                s.amount += unit;
            });
        }
    }

    // 4. Update session's peak bankroll (high water mark)
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 5. Construct bets and CLAMP TO LIMITS
    const currentBets = state.splits.map(s => {
        let finalAmount = Math.max(s.amount, config.betLimits.min);
        finalAmount = Math.min(finalAmount, config.betLimits.max);
        
        return {
            type: 'split',
            value: s.value,
            amount: finalAmount
        };
    });

    // 6. Bankroll Check
    const totalBetAmount = currentBets.reduce((sum, bet) => sum + bet.amount, 0);
    if (totalBetAmount > bankroll) {
        return []; // Insufficient funds to execute the next sequence
    }

    return currentBets;
}