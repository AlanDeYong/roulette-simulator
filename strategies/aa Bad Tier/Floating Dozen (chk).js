/**
 * Roulette Strategy: Random Overlapping Lines (Modified Floating Dozen)
 * Source: Derived from WillVegas YouTube Channel ("MAKING MONEY ROULETTE! Floating Dozen") but with corrected bet placements.
 *
 * The Full Logic:
 * - This strategy replaces the "Floating Dozen" and "Jackpot Street" logic with random line (double street) selection.
 * - Place 1 base unit bet on each of 4 randomly chosen, completely non-overlapping double streets (lines). 
 *   These are selected from the 6 standard dozen-aligned lines: 1-6, 7-12, 13-18, 19-24, 25-30, 31-36.
 * - Place a 5th bet (1 base unit) on a "Jackpot Line" (an intermediate double street like 4-9, 10-15, etc.).
 * - The Jackpot Line MUST overlap with EXACTLY ONE of the 4 previously chosen base lines, creating a 3-number 
 *   overlap zone where TWO line bets hit simultaneously for a massive payout.
 * - The random lines are selected once and maintained during a progression to avoid "chasing" randomly around the board.
 * - They are re-randomized only when the progression resets.
 *
 * The Full Bet Progression:
 * - The base bet is the table minimum (or configured increment).
 * - On a Loss: Increase the bet amount for each of the 5 line positions by 1 unit.
 * - On a Win: Check the overall session profit.
 *   - If the current bankroll is greater than or equal to the starting bankroll (session profit), reset bets to 1 unit AND randomly select new lines.
 *   - If the current bankroll is less than the starting bankroll (session loss), "stay put" and keep the bet amount exactly the same.
 *
 * The Goal:
 * - Steadily grind profits by hitting any of the covered numbers, while hoping to hit the 3-number overlap 
 *   ("Jackpot Zone") to rapidly recover from a drawdown or boost profit.
 * - Reset the progression safely only when session profit is achieved.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine the base unit and increment based on config
    const initialBet = config.betLimits.min;
    const increment = config.incrementMode === 'base' ? initialBet : config.minIncrementalBet;

    // 2. Initialize state on the first run
    if (state.currentBet === undefined) {
        state.currentBet = initialBet;
        state.selectedBaseLines = null;
        state.overlappingLine = null;
    }

    // 3. Evaluate the previous spin to update progression (if we had bets placed)
    if (state.selectedBaseLines !== null && spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        let wonLastSpin = false;

        if (lastResult.winningColor !== 'green') {
            const num = lastResult.winningNumber;
            
            // Check if the number falls in any of the 4 non-overlapping base lines
            const hitBase = state.selectedBaseLines.some(line => num >= line && num <= line + 5);
            // Check if the number falls in the overlapping jackpot line
            const hitOverlap = num >= state.overlappingLine && num <= state.overlappingLine + 5;
            
            wonLastSpin = hitBase || hitOverlap;
        }

        // Apply Progression Rules
        if (wonLastSpin) {
            // "You don't come down until you're in session profit... you stay put."
            if (bankroll >= config.startingBankroll) {
                state.currentBet = initialBet; // Reset back to base
                state.selectedBaseLines = null; // Trigger a re-randomization of lines
            }
            // If we won but are still negative for the session, we do nothing (stay put)
        } else {
            // Loss: go up one unit
            state.currentBet += increment;
        }
    }

    // Clamp current bet to limits to prevent runaway values beyond the table max
    state.currentBet = Math.max(state.currentBet, config.betLimits.min);
    state.currentBet = Math.min(state.currentBet, config.betLimits.max);

    // 4. Randomly Select Lines if needed (Initialization or after a progression reset)
    if (state.selectedBaseLines === null) {
        // The 6 non-overlapping dozen-aligned double streets
        const baseLines = [1, 7, 13, 19, 25, 31];
        
        // Shuffle and pick 4
        let shuffled = [...baseLines];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        state.selectedBaseLines = shuffled.slice(0, 4);
        
        // Determine valid overlapping lines.
        // A valid intermediate line must overlap EXACTLY one selected base line.
        // Overlap occurs when the start numbers are exactly 3 apart (e.g., 4 overlaps 1 and 7).
        const intermediateLines = [4, 10, 16, 22, 28];
        const validOverlaps = intermediateLines.filter(L => {
            let overlapCount = state.selectedBaseLines.filter(X => Math.abs(L - X) === 3).length;
            return overlapCount === 1;
        });
        
        // Randomly pick one of the valid overlapping lines
        const randomIndex = Math.floor(Math.random() * validOverlaps.length);
        state.overlappingLine = validOverlaps[randomIndex];
    }

    // 5. Build and place the bets
    const bets = [];
    const amount = state.currentBet;

    // Place the 4 chosen non-overlapping double streets
    state.selectedBaseLines.forEach(line => {
        bets.push({ type: 'line', value: line, amount: amount });
    });

    // Place the 1 overlapping double street
    bets.push({ type: 'line', value: state.overlappingLine, amount: amount });

    return bets;
}