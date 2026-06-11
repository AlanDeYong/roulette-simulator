/**
 * Strategy: Grind and Win
 * Source: https://youtu.be/eZR7-5rDS5Y (Channel: The Roulette Master)
 * * Full Logic Details:
 * - This strategy targets either Roulette Dozens or Columns.
 * - The system tracking requires waiting for 3 consecutive spins where a specific Dozen or Column has NOT hit.
 * - Once that condition is met (3 consecutive misses), you trigger a bet on that specific missing Dozen or Column.
 * * Full Bet Progression Details:
 * - The strategy operates on a flat incremental series designed to be safer than Fibonacci 12:
 * Level 1: 1 unit  ($5 base)
 * Level 2: 1 unit  ($5 base)
 * Level 3: 2 units ($10 base)
 * Level 4: 3 units ($15 base)
 * Level 5: 4 units ($20 base)
 * Level 6: 6 units ($30 base)
 * Level 7: 9 units ($45 base)
 * Level 8: 14 units ($70 base)
 * Level 9: 21 units ($105 base)
 * Level 10: 32 units ($160 base)
 * Level 11: 48 units ($240 base)
 * Level 12: 72 units ($360 base)
 * - Series Progression: [1, 1, 2, 3, 4, 6, 9, 14, 21, 32, 48, 72] multipliers of base unit.
 * - On a LOSS: Move up to the next progression level.
 * - On a WIN: Reset completely back to Level 1 (index 0) and look for a new trigger.
 * * Goal:
 * - To build consistent daily grinding profits securely while keeping the drawdown manageable. 
 * - Session ends upon target profit satisfaction or maximum bankroll limit constraints.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish the base unit amount from config (using Outside bet limit)
    const baseUnit = config.betLimits.minOutside;

    // 2. Define the full safer progression array from the video
    const progressionMultipliers = [1, 1, 2, 3, 4, 6, 9, 14, 21, 32, 48, 72];

    // 3. Initialize persistence state variables if not defined
    if (state.currentLevelIndex === undefined) state.currentLevelIndex = 0;
    if (state.activeTargetType === undefined) state.activeTargetType = null; // 'dozen' or 'column'
    if (state.activeTargetValue === undefined) state.activeTargetValue = null; // 1, 2, or 3

    // Helper functions to categorize roulette numbers into Dozens or Columns
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0; // 0 or 00
    }

    function getColumn(num) {
        if (num === 0 || num === 37) return 0; // 0 or 00
        if (num % 3 === 1) return 1;
        if (num % 3 === 2) return 2;
        if (num % 3 === 0) return 3;
        return 0;
    }

    // 4. Update progression state based on previous outcome if actively betting
    if (state.activeTargetType !== null && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let won = false;
        if (state.activeTargetType === 'dozen') {
            won = (getDozen(lastNum) === state.activeTargetValue);
        } else if (state.activeTargetType === 'column') {
            won = (getColumn(lastNum) === state.activeTargetValue);
        }

        if (won) {
            // Reset on win
            state.currentLevelIndex = 0;
            state.activeTargetType = null;
            state.activeTargetValue = null;
        } else {
            // Progress to next level on loss
            state.currentLevelIndex++;
            if (state.currentLevelIndex >= progressionMultipliers.length) {
                state.currentLevelIndex = 0; // Safe reset if max progression bounds exceeded
                state.activeTargetType = null;
                state.activeTargetValue = null;
            }
        }
    }

    // 5. Look for a new trigger condition if not locked into an ongoing progression
    if (state.activeTargetType === null) {
        if (spinHistory.length >= 3) {
            // Track the history mapping for the last 3 spins
            const last3Spins = spinHistory.slice(-3);
            
            const dozenCounts = { 1: 0, 2: 0, 3: 0 };
            const columnCounts = { 1: 0, 2: 0, 3: 0 };

            last3Spins.forEach(spin => {
                const d = getDozen(spin.winningNumber);
                const c = getColumn(spin.winningNumber);
                if (d > 0) dozenCounts[d]++;
                if (c > 0) columnCounts[c]++;
            });

            // Find any dozen that hasn't appeared at all in the last 3 spins
            for (let d = 1; d <= 3; d++) {
                if (dozenCounts[d] === 0) {
                    state.activeTargetType = 'dozen';
                    state.activeTargetValue = d;
                    state.currentLevelIndex = 0;
                    break;
                }
            }

            // If no dozen trigger found, fall back to check columns
            if (state.activeTargetType === null) {
                for (let c = 1; c <= 3; c++) {
                    if (columnCounts[c] === 0) {
                        state.activeTargetType = 'column';
                        state.activeTargetValue = c;
                        state.currentLevelIndex = 0;
                        break;
                    }
                }
            }
        }
    }

    // 6. Construct and output the bet object if a target is validly locked
    if (state.activeTargetType !== null) {
        const multiplier = progressionMultipliers[state.currentLevelIndex];
        let betAmount = baseUnit * multiplier;

        // Clamp values securely within boundaries defined by config constraints
        betAmount = Math.max(betAmount, config.betLimits.minOutside);
        betAmount = Math.min(betAmount, config.betLimits.max);

        return [{
            type: state.activeTargetType,
            value: state.activeTargetValue,
            amount: betAmount
        }];
    }

    // Return an empty array if waiting for a target to emerge
    return [];
}