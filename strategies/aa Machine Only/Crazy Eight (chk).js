/**
 * Crazy Eight Roulette Strategy
 * 
 * Source:
 * - Video: https://youtu.be/i7eklaw3Vbc
 * - Channel: Casino Matchmaker (Strategy created by Chip Bender)
 * 
 * The Full Logic in Details:
 * - The strategy places 9 overlapping Six-Line ('line') bets spanning numbers 4 through 33.
 * - The base pattern alternates between 4 units and 2 units:
 *     * Line 4-9   (value: 4)  -> 4 units
 *     * Line 7-12  (value: 7)  -> 2 units
 *     * Line 10-15 (value: 10) -> 4 units
 *     * Line 13-18 (value: 13) -> 2 units
 *     * Line 16-21 (value: 16) -> 4 units
 *     * Line 19-24 (value: 19) -> 2 units
 *     * Line 22-27 (value: 22) -> 4 units
 *     * Line 25-30 (value: 25) -> 2 units
 *     * Line 28-33 (value: 28) -> 4 units
 *   Total base layout = 28 units.
 * 
 * Outcome Distribution (European Table):
 * - 24 Winning Numbers (7 - 30):
 *   Hit two overlapping lines (4 units + 2 units = 6 units). Pays 6 * 6 = 36 units.
 *   Net profit = +8 units per level (hence "Crazy Eight").
 * - 6 Partial Loss Numbers (4, 5, 6, 31, 32, 33):
 *   Hit only one outer line (4 units). Pays 4 * 6 = 24 units.
 *   Net result = -4 units per level.
 * - 7 Complete Loss / "Whack" Numbers (0, 1, 2, 3, 34, 35, 36):
 *   No coverage. Net result = -28 units per level.
 * 
 * The Full Bet Progression in Details:
 * - Complete Loss (Whack): Add +2 units to the progression level (multiplier).
 * - Partial Loss: Add +1 unit to the progression level.
 * - Win: 
 *     * Milestone Check: If cumulative profit reaches or exceeds the current $20 milestone
 *       ($20, $40, $60, etc.), reset the progression level immediately back to 1 and update
 *       the milestone to the next $20 threshold.
 *     * Standard Step-Down: If the milestone has not been reached, drop down 1 unit (-1 level,
 *       clamped to a minimum of 1).
 * 
 * The Goal:
 * - Target profit: +$150 within 50 spins.
 * - Stop condition: Session profit >= $150, spin limit (50 spins) reached, or insufficient bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Strategy State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.level = 1;              // Multiplier level
        state.currentMilestone = 20;  // First $20 profit milestone
        state.spinCount = 0;
        state.targetProfit = 15000;     // Target profit from the video
        state.maxSpins = 500;          // Max spins constraint from the tournament
    }

    state.spinCount++;

    // 2. Evaluate Last Spin Result & Adjust Progression
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        const currentProfit = bankroll - state.initialBankroll;

        // Check if target profit reached or spin limit reached
        if (currentProfit >= state.targetProfit || state.spinCount > state.maxSpins) {
            return [];
        }

        // Categorize outcome
        const completeLosses = [0, 1, 2, 3, 34, 35, 36];
        const partialLosses = [4, 5, 6, 31, 32, 33];

        if (completeLosses.includes(winNum)) {
            // Complete Loss: Increase by +2 levels
            state.level += 2;
        } else if (partialLosses.includes(winNum)) {
            // Partial Loss: Increase by +1 level
            state.level += 1;
        } else {
            // Winner (numbers 7 to 30)
            if (currentProfit >= state.currentMilestone) {
                // Milestone reached: Reset immediately to base level 1
                state.level = 1;
                // Advance milestone to next multiple of 20 above current profit
                state.currentMilestone = Math.floor(currentProfit / 20) * 20 + 20;
            } else {
                // Win step-down: Drop 1 level (minimum 1)
                state.level = Math.max(1, state.level - 1);
            }
        }
    }

    // Check stop conditions
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetProfit || state.spinCount > state.maxSpins) {
        return [];
    }

    // 3. Define Base Six-Line Layout Units (alternating 4 and 2 units)
    const baseLines = [
        { value: 4,  units: 4 },
        { value: 7,  units: 2 },
        { value: 10, units: 4 },
        { value: 13, units: 2 },
        { value: 16, units: 4 },
        { value: 19, units: 2 },
        { value: 22, units: 4 },
        { value: 25, units: 2 },
        { value: 28, units: 4 }
    ];

    // Determine unit scaling based on table inside bet limits
    const minInside = config.betLimits.min || 1;
    const maxLimit = config.betLimits.max || 500;
    
    // Scale 1 unit to at least minInside / 2 so 2-unit bets satisfy minInside
    const unitScale = Math.max(1, Math.ceil(minInside / 2));

    // 4. Construct Bet Array
    const bets = [];
    let totalBetRequired = 0;

    for (let i = 0; i < baseLines.length; i++) {
        const item = baseLines[i];
        let amount = item.units * unitScale * state.level;

        // Clamp to table limits
        amount = Math.max(minInside, Math.min(amount, maxLimit));
        totalBetRequired += amount;

        bets.push({
            type: 'line',
            value: item.value,
            amount: amount
        });
    }

    // Safety check: ensure sufficient bankroll
    if (bankroll < totalBetRequired) {
        return [];
    }

    return bets;
}