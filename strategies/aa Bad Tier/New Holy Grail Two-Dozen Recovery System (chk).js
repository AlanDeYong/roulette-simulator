/**
 * ============================================================================
 * Strategy: New Holy Grail Two-Dozen Recovery System
 * Source: https://youtu.be/MEpDYjHZEZ4
 * YouTube Channel: Roulette Strategy Lab
 * Original Concept: Roulette Master (Modified Holy Grail)
 * ============================================================================
 * 
 * --- THE FULL LOGIC IN DETAIL ---
 * 1. Bet Selection:
 *    - Always bets simultaneously on two dozens: 1st Dozen (1-12) and 2nd Dozen (13-24).
 *    - Each dozen receives an equal bet amount.
 * 
 * 2. Winning & Losing Conditions:
 *    - Win: Winning number is 1 through 24 (either 1st Dozen or 2nd Dozen hits).
 *      A winning dozen pays 2 to 1 (netting +1x the single dozen bet amount).
 *    - Loss: Winning number is 25 through 36, 0, or 00 (both dozens lose).
 *      Total loss is 2x the single dozen bet amount.
 * 
 * --- THE FULL BET PROGRESSION IN DETAIL ---
 * 1. Base Bet:
 *    - Starts at 1 unit on the 1st Dozen and 1 unit on the 2nd Dozen.
 *    - The base unit is determined by config.betLimits.minOutside.
 * 
 * 2. On a Loss (Miss):
 *    - Increase the bet on BOTH dozens:
 *      * If current bet per dozen is less than 10 units: add 1 unit to each dozen.
 *      * If current bet per dozen reaches or exceeds 10 units: add 2 units to each dozen
 *        (accelerated recovery phase as described in the video).
 *      * Increments also respect config.incrementMode and config.minIncrementalBet.
 * 
 * 3. On a Win (Hit):
 *    - Check the overall session bankroll profit relative to the session high-water mark:
 *      * If a NEW session profit peak is achieved (bankroll > peakBankroll):
 *        RESET both bets back to base level (1 unit each) and update the peak.
 *      * If still in a deficit from the peak (bankroll <= peakBankroll):
 *        KEEP the bet size the same (rebet flat at current level) to continue clawing back.
 * 
 * --- THE GOAL ---
 * - Steady recovery through positive net sessions with a 64.8% (European) / 63.2% (American)
 *   table coverage, resetting immediately upon locking in net session profit.
 * - Respects table minimums and maximums (`config.betLimits`).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit respecting outside bet minimum
    const minOutside = (config.betLimits && config.betLimits.minOutside) ? config.betLimits.minOutside : 5;
    const maxLimit = (config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
    const baseUnit = minOutside;

    // 2. Initialize persistent state
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.currentUnits = 1;
        state.lastBetPerDozen = baseUnit;
        state.lastBankroll = bankroll;
    }

    // 3. Evaluate previous spin result if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const won = (num >= 1 && num <= 24);

        if (won) {
            // Check if we reached a new session high profit
            if (bankroll > state.peakBankroll) {
                // New session peak reached -> Full Reset
                state.peakBankroll = bankroll;
                state.currentUnits = 1;
            } else {
                // In recovery: Keep bet level flat on wins until new profit high
                // state.currentUnits remains unchanged
            }
        } else {
            // Loss: Increase progression
            // Step increment: 1 unit below 10 units, 2 units at or above 10 units (video rule)
            let unitStep = 1;
            if (config.incrementMode === 'base') {
                unitStep = 1;
            } else if (config.minIncrementalBet && config.minIncrementalBet > 1) {
                unitStep = Math.max(1, Math.round(config.minIncrementalBet / baseUnit));
            } else if (state.currentUnits >= 10) {
                unitStep = 2; // Video accelerated recovery rule
            }

            state.currentUnits += unitStep;
        }
    } else {
        // First spin baseline
        state.peakBankroll = bankroll;
        state.currentUnits = 1;
    }

    // 4. Calculate individual dozen bet amount
    let betAmount = baseUnit * state.currentUnits;

    // 5. Clamp bet to limits
    betAmount = Math.max(betAmount, minOutside);
    betAmount = Math.min(betAmount, maxLimit);

    // 6. Ensure bankroll can cover both dozens
    const totalRequired = betAmount * 2;
    if (bankroll < minOutside * 2) {
        // Insufficient funds for minimum dual dozen bet
        return [];
    }

    if (bankroll < totalRequired) {
        // Adjust proportionally if near table bust
        betAmount = Math.floor(bankroll / 2);
        betAmount = Math.max(betAmount, minOutside);
        betAmount = Math.min(betAmount, maxLimit);
        if (betAmount * 2 > bankroll) {
            return [];
        }
    }

    // Update state memory for the placed bet
    state.lastBetPerDozen = betAmount;
    state.lastBankroll = bankroll;

    // 7. Return bet placements: 1st Dozen (1) and 2nd Dozen (2)
    return [
        { type: 'dozen', value: 1, amount: betAmount },
        { type: 'dozen', value: 2, amount: betAmount }
    ];
}