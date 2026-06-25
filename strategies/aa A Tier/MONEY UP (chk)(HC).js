/**
 * Roulette Strategy: Six-Line Pattern Progression (Hot Numbers Variant)
 * Source: https://youtu.be/Z_GUTxSOTqA
 * * The Full Logic:
 * - The strategy relies on a 6-bet repeating pattern covering 6 numbers (two adjacent streets).
 * - The pattern: 2 straight up bets, 1 corner bet, and 3 split bets.
 * - Starting numbers for the 6-number blocks are dynamically chosen based on the hottest segments in the last 37 spins.
 * - Outcomes defined:
 * - Win: Net spin outcome is zero or positive.
 * - Small Loss: A bet hits, but the payout is less than the total bet amount.
 * - Complete Loss: No bets hit (payout is zero).
 * - Triggers:
 * - On Win: If a new session peak profit is reached, reset progression to Step 0 and recalculate hot numbers based on past 37 spins. If not at peak profit, and the previous level was reached via double-up, go down 1 level. Otherwise, rebet.
 * - On Small Loss: Rebet at the current progression step.
 * - On Complete Loss: Rebet and move to the next progression step.
 * * The Full Bet Progression:
 * - Step 0: 1 base unit on pattern 1 (Total: 6u)
 * - Step 1: 1 base unit on patterns 1 & 2 (Total: 12u)
 * - Step 2: 2 base units on patterns 1, 2 & 3 (Total: 36u) - Doubled up
 * - Step 3: 2 base units on patterns 1, 2, 3 & 4 (Total: 48u)
 * - Step 4: 4 base units on patterns 1, 2, 3, 4 & 5 (Total: 120u) - Doubled up
 * - Step 5: 8 base units on patterns 1..5 (Total: 240u) - Doubled up
 * - Step 6: 16 base units on patterns 1..5 (Total: 480u) - Doubled up
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;

    // Helper: Determine the 5 hottest 6-number blocks from the last 37 spins
    const getHotStarts = (history) => {
        const recent = history.slice(-37);
        const counts = {};
        recent.forEach(n => counts[n] = (counts[n] || 0) + 1);
        
        // Base starting numbers for the standard 6-number blocks
        const blocks = [1, 7, 13, 19, 25, 31].map(S => {
            let hits = 0;
            for (let i = 0; i < 6; i++) hits += (counts[S + i] || 0);
            return { S, hits };
        });
        
        // Sort by most hits descending, take top 5
        return blocks.sort((a, b) => b.hits - a.hits).slice(0, 5).map(b => b.S);
    };

    // 1. Initialize State
    if (state.step === undefined) {
        state.step = 0;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
        state.lastBetAmount = 0;
    }

    // Wait for the first 37 spins to determine hot numbers
    if (spinHistory.length < 37) {
        return null; 
    }

    // Initialize hot starts on spin 37
    if (!state.hotStarts) {
        state.hotStarts = getHotStarts(spinHistory);
    }

    // 2. Determine Outcome of Previous Spin
    if (spinHistory.length > 37 && state.lastBetAmount > 0) {
        const netChange = bankroll - state.lastBankroll;
        const payout = netChange + state.lastBetAmount;

        // Update Peak Bankroll Tracker
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }

        if (payout === 0) {
            // Complete Loss -> Move to next progression step
            state.step = Math.min(state.step + 1, 6);
        } else if (netChange < 0) {
            // Small Loss (Hit occurred but overall loss) -> Rebet
            // State step remains unchanged
        } else {
            // Win (Net profit achieved on spin)
            if (bankroll >= state.peakBankroll) {
                // Reached session peak profit -> Reset & recalculate hot numbers
                state.step = 0;
                state.hotStarts = getHotStarts(spinHistory);
            } else {
                // Win, but haven't eclipsed peak profit yet
                if ([2, 4, 5, 6].includes(state.step)) {
                    state.step = state.step - 1; // Go down 1 level
                }
            }
        }
    }

    // 3. Progression Logic Map
    const progressionMap = [
        { numPatterns: 1, unitMultiplier: 1 },  // Step 0: 6u
        { numPatterns: 2, unitMultiplier: 1 },  // Step 1: 12u
        { numPatterns: 3, unitMultiplier: 2 },  // Step 2: 36u
        { numPatterns: 4, unitMultiplier: 2 },  // Step 3: 48u
        { numPatterns: 5, unitMultiplier: 4 },  // Step 4: 120u
        { numPatterns: 5, unitMultiplier: 8 },  // Step 5: 240u
        { numPatterns: 5, unitMultiplier: 16 }  // Step 6: 480u
    ];

    const currentProg = progressionMap[state.step];

    // 4. Determine Active Felt Placement Numbers
    const startNumbers = state.hotStarts;

    // 5. Calculate and Clamp Target Amount
    let targetAmount = currentProg.unitMultiplier * unit;
    targetAmount = Math.max(targetAmount, config.betLimits.min);
    targetAmount = Math.min(targetAmount, config.betLimits.max);

    // 6. Build Bets Array
    const bets = [];
    
    for (let i = 0; i < currentProg.numPatterns; i++) {
        const S = startNumbers[i]; // Top-left number for this hot 6-number block

        bets.push({ type: 'number', value: S, amount: targetAmount });
        bets.push({ type: 'number', value: S + 3, amount: targetAmount });
        bets.push({ type: 'corner', value: S, amount: targetAmount });
        bets.push({ type: 'split', value: [S + 1, S + 2], amount: targetAmount });
        bets.push({ type: 'split', value: [S + 2, S + 5], amount: targetAmount });
        bets.push({ type: 'split', value: [S + 4, S + 5], amount: targetAmount });
    }

    // 7. Store State for Next Spin
    state.lastBankroll = bankroll;
    state.lastBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);

    return bets.length > 0 ? bets : null;
}