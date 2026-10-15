/**
 * The Meatloaf Roulette Strategy
 * 
 * Source:
 * - URL: https://youtu.be/c7OF8zoAgUs
 * - Channel: Junko Bodie ("The Meatloaf System: How To Win At Roulette!")
 * 
 * Strategy Logic:
 * - Meatloaf gets its name from "two out of three ain't bad" by covering 2 out of the 3 columns 
 *   (the middle column and the 3rd column) using 6 Corner bets:
 *     1. Corner [2, 3, 5, 6] (value: 2)
 *     2. Corner [8, 9, 11, 12] (value: 8)
 *     3. Corner [14, 15, 17, 18] (value: 14)
 *     4. Corner [20, 21, 23, 24] (value: 20)
 *     5. Corner [26, 27, 29, 30] (value: 26)
 *     6. Corner [32, 33, 35, 36] (value: 32)
 * 
 * Progression & Rules:
 * - Base Bet: 1 unit on all 6 corners (scaled to `config.betLimits.min`).
 * - On Win:
 *   - The corner that hit is removed from the active layout for subsequent spins in the cycle.
 *   - If the current bankroll exceeds the cycle starting bankroll (locking in profit), 
 *     or if the overall target is achieved, the cycle resets back to all 6 corners at 1 unit.
 *   - Otherwise, maintain the remaining active corners at the current bet level.
 * - On Loss (Miss or hitting a removed corner):
 *   - Double the bet per corner on all remaining active corners (1 -> 2 -> 4 -> 8 units).
 *   - Max doubling is 8 units (Level 4). If lost at level 4, resets or halts according to bankroll limits.
 * 
 * Goal:
 * - Win Goal: Target profit (default $250 / configurable bankroll gain).
 * - Stop Loss: Protected by bankroll and table bet limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const ALL_CORNERS = [
        { value: 2, numbers: [2, 3, 5, 6] },
        { value: 8, numbers: [8, 9, 11, 12] },
        { value: 14, numbers: [14, 15, 17, 18] },
        { value: 20, numbers: [20, 21, 23, 24] },
        { value: 26, numbers: [26, 27, 29, 30] },
        { value: 32, numbers: [32, 33, 35, 36] }
    ];

    const baseUnit = Math.max(1, config.betLimits.min);
    const maxLevel = 4; // Multipliers: 1, 2, 4, 8

    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.cycleStartBankroll = bankroll;
        state.targetProfit = 25000;
        state.level = 1; // 1, 2, 4, 8
        state.activeCorners = ALL_CORNERS.map(c => c.value);
    }

    // Helper to reset cycle
    function resetCycle() {
        state.cycleStartBankroll = bankroll;
        state.level = 1;
        state.activeCorners = ALL_CORNERS.map(c => c.value);
    }

    // Process previous spin if history exists
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Check if winning number was in one of our active corners
        let hitCornerValue = null;
        for (const cornerVal of state.activeCorners) {
            const cornerDef = ALL_CORNERS.find(c => c.value === cornerVal);
            if (cornerDef && cornerDef.numbers.includes(winningNum)) {
                hitCornerValue = cornerVal;
                break;
            }
        }

        if (hitCornerValue !== null) {
            // WIN: Remove the corner that hit
            state.activeCorners = state.activeCorners.filter(v => v !== hitCornerValue);

            // If bankroll made profit over cycle start or all corners cleared, reset
            if (bankroll > state.cycleStartBankroll || state.activeCorners.length === 0) {
                resetCycle();
            }
        } else {
            // LOSS: Double up progression if within limit
            if (state.level < Math.pow(2, maxLevel - 1)) {
                state.level *= 2;
            } else {
                // Exceeded max progression level, reset to base
                resetCycle();
            }
        }
    }

    // Check overall win target
    if (bankroll - state.initialBankroll >= state.targetProfit) {
        return []; // Target reached, stop betting
    }

    // Calculate individual bet amount
    let unitMultiplier = state.level;
    let betAmount = baseUnit * unitMultiplier;

    // Clamp to table bet limits
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Ensure sufficient bankroll
    const totalRequired = betAmount * state.activeCorners.length;
    if (bankroll < totalRequired) {
        if (bankroll < config.betLimits.min * state.activeCorners.length) {
            return [];
        }
        betAmount = Math.floor(bankroll / state.activeCorners.length);
        betAmount = Math.max(betAmount, config.betLimits.min);
    }

    // Construct bet objects
    return state.activeCorners.map(cornerValue => ({
        type: 'corner',
        value: cornerValue,
        amount: betAmount
    }));
}