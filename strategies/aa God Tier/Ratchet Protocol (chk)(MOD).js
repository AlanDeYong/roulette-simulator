/*
 * Strategy: Ratchet Protocol
 * Source: https://youtu.be/qBsc36JOAiQ (The Lucky Felt)
 * 
 * The Ratchet Protocol Bet Progression
 * 1. The Target Zone
 * Your focus is always on the 24 numbers within Column 1 and Column 2.
 * 2. The Four Betting Levels
 * You will progress through these levels based on wins and losses:
 * Level 1: Bet on 2 Columns (Column 1 and Column 2).
 * Level 2: Bet on 6 Corners (covering columns 1 and 2).
 * Level 3: Bet on 12 Horizontal Splits (between columns 1 and 2).
 * Level 4: Bet on 24 Singles (straight up on all numbers in columns 1 and 2).
 * 3. Starting the Session
 * Begin at Level 1 with 1 base unit per bet.
 * 4. What to do on a Win
 * 1st Win: Do not change your level. Keep your bets exactly where they are, but add 1 unit to every bet for the next spin.
 * 2nd Consecutive Win: You have successfully trapped a profit. Reset completely back to Level 1 at 1 base unit.
 * 5. What to do on a Loss (The "Phantom Spin")
 * Change Geometry: Drop down to the next level (e.g., if you lose at Level 1, move to Level 2. If at Level 4, stay at Level 4).
 * Reset Size: Reset your bet amount back to 1 base unit.
 * Wait in the Shadows (Phantom Spin): Stop betting. Watch the wheel.
 * Reactivate: Only place your next bet once the wheel naturally lands on any of your 24 target numbers again.
 * 
 * * Logic Details:
 * The strategy creates a dynamic, multi-tiered trap focusing on 24 specific numbers 
 * (Columns 1 and 2). When facing resistance (losses), the strategy changes the board's 
 * geometry, stepping deeper into inside numbers to increase the payout ratio instead 
 * of blindly increasing bet sizes on the same broad bets.
 * * - Level 1: 2 Columns (Broadest coverage, 2:1 payout)
 * - Level 2: 6 Corners (8:1 payout)
 * - Level 3: 12 Splits (17:1 payout)
 * - Level 4: 24 Singles (Tightest trap, 35:1 payout)
 * * A key component is the "Phantom Spin". When a loss occurs, the table is considered 
 * "cold". The system pulls back all chips and waits in the shadows without betting. 
 * Once the wheel lands on one of the 24 targeted numbers again, the trap reactivates, 
 * and betting resumes at the next, deeper level.
 * * Progression Details:
 * - On a Loss: All consecutive wins are cleared. The strategy drops one level deeper 
 * (e.g., from Columns to Corners) and the unit multiplier resets to 1. The system 
 * enters Phantom Spin mode, waiting for a hit in the target zone before betting again.
 * - On a Win: 
 * - 1st Win: The board is squeezed tighter. The bet size is increased by 1 unit for 
 * the next spin to secure a larger profit.
 * - 2nd Consecutive Win: The trap succeeds. The strategy safely rides the elevator 
 * back up, resetting to Level 1 at the base unit.
 * Note: The video author suggests a modification to keep all targeted numbers covered 
 * after the first win (rather than removing the specific winning split/number), which 
 * is implemented here for consistent session recovery.
 * * Goal:
 * The goal is to mathematically squeeze profit out of a stubborn roulette table by 
 * riding out variance (using Phantom Spins) and drastically increasing the payout 
 * potential (up to 35:1) when the wheel returns to the targeted sector, stopping 
 * at a target profit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.level = 1;
        state.unitMultiplier = 1;
        state.consecutiveWins = 0;
        state.waitingForPhantom = false;
        state.lastBetPlaced = false;
        
        // The 24 target numbers covering Columns 1 and 2
        state.targetNumbers = [
            1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 
            19, 20, 22, 23, 25, 26, 28, 29, 31, 32, 34, 35
        ];
        
        state.initialized = true;
    }

    const lastSpin = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

    // 2. Process Last Spin Outcomes (Only if we actively placed a bet)
    if (lastSpin && state.lastBetPlaced) {
        const won = state.targetNumbers.includes(lastSpin.winningNumber);
        
        if (won) {
            state.consecutiveWins++;
            if (state.consecutiveWins >= 2) {
                // Trap completed: Reset after 2 consecutive wins
                state.level = 1;
                state.unitMultiplier = 1;
                state.consecutiveWins = 0;
                state.waitingForPhantom = false;
            } else {
                // Squeeze the board: Add one unit for the second attempt
                state.unitMultiplier++;
            }
        } else {
            // Resistance encountered: Drop a level, reset multiplier, activate Phantom Spin
            state.consecutiveWins = 0;
            state.level = Math.min(state.level + 1, 4); // Max level is 4 (Singles)
            state.unitMultiplier = 1; 
            state.waitingForPhantom = true;
        }
    }

    // 3. Phantom Spin Check
    if (state.waitingForPhantom) {
        state.lastBetPlaced = false;
        if (lastSpin && state.targetNumbers.includes(lastSpin.winningNumber)) {
            // Wheel has re-entered our territory. The trap reactivates.
            state.waitingForPhantom = false;
        } else {
            // Remain in the shadows, let the casino burn its variance
            return [];
        }
    }

    // 4. Calculate Bet Amount
    let bets = [];
    state.lastBetPlaced = true;

    // Determine the baseline unit according to the bet's geometry
    const baseUnit = state.level === 1 ? config.betLimits.minOutside : config.betLimits.min;

    // Squeeze calculation based on current unit multiplier
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);
    let amount = baseUnit + (increment * (state.unitMultiplier - 1));

    // Clamp limits strictly to config
    let finalAmount = Math.max(amount, baseUnit);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // 5. Place Bets depending on the current Tier
    if (state.level === 1) {
        // Level 1: 2 Columns
        bets.push({ type: 'column', value: 1, amount: finalAmount });
        bets.push({ type: 'column', value: 2, amount: finalAmount });
        
    } else if (state.level === 2) {
        // Level 2: 6 Corners covering Columns 1 & 2
        const corners = [1, 7, 13, 19, 25, 31];
        corners.forEach(c => {
            bets.push({ type: 'corner', value: c, amount: finalAmount });
        });
        
    } else if (state.level === 3) {
        // Level 3: 12 Horizontal Splits covering Columns 1 & 2
        const splits = [
            [1, 2], [4, 5], [7, 8], [10, 11], [13, 14], [16, 17], 
            [19, 20], [22, 23], [25, 26], [28, 29], [31, 32], [34, 35]
        ];
        splits.forEach(s => {
            bets.push({ type: 'split', value: s, amount: finalAmount });
        });
        
    } else if (state.level === 4) {
        // Level 4: 24 Singles covering exactly Columns 1 & 2
        state.targetNumbers.forEach(n => {
            bets.push({ type: 'number', value: n, amount: finalAmount });
        });
    }

    return bets;
}