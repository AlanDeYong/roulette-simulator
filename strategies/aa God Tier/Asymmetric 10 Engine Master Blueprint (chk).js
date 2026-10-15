/**
 * Roulette Strategy: The Asymmetric 10 Engine Master Blueprint
 * 
 * SOURCE:
 * - YouTube Channel: The Lucky Felt
 * - Video URL: https://youtu.be/Wl7ITn5os5w
 * - Strategy Name: The Asymmetric 10 Engine
 * 
 * FULL LOGIC IN DETAIL:
 * 1. The strategy exploits structural color-parity asymmetry on the roulette board:
 *    - Black Evens (10 numbers): [2, 4, 6, 8, 10, 20, 22, 24, 26, 28]
 *    - Red Odds (10 numbers):   [1, 3, 5, 7, 9, 19, 21, 23, 25, 27]
 * 2. Set Selection / Trigger:
 *    - The set to play is determined by the color of the LAST winning number spun:
 *      - If last color was 'black', play the 10 Black Evens.
 *      - If last color was 'red', play the 10 Red Odds.
 *      - If last color was 'green' (0 / 00) or at start, stay on the current active set (defaults to Black Evens).
 * 
 * FULL BET PROGRESSION IN DETAIL:
 * 1. Multiplier Progression Sequence per number: [1, 1, 1, 2, 2, 3, 4, 6, 8, 11]
 * 2. On WIN (when one of the 10 active numbers hits):
 *    - Reset the progression step back to level 0 (1 unit per number).
 * 3. On LOSS (when none of the 10 numbers hits):
 *    - Advance to the next level in the progression sequence.
 *    - If sequence exceeds the maximum level (index 9), reset back to level 0.
 * 
 * GOAL:
 * - Session profit target of 20% to 50% gain relative to starting bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the 10-number asymmetric sets
    const BLACK_EVENS = [2, 4, 6, 8, 10, 20, 22, 24, 26, 28];
    const RED_ODDS    = [1, 3, 5, 7, 9, 19, 21, 23, 25, 27];

    // 2. Progression multipliers array
    const PROGRESSION = [1, 1, 1, 2, 2, 3, 4, 6, 8, 11];

    // 3. Initialize state variables if not set
    if (state.progressionIndex === undefined) {
        state.progressionIndex = 0;
    }
    if (state.activeSet === undefined) {
        state.activeSet = 'black_evens'; // Default initial set
    }

    // 4. Update state based on spin history
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastColor = lastSpin.winningColor;

        // Determine active set numbers for the last spin
        const activeNumbers = (state.activeSet === 'black_evens') ? BLACK_EVENS : RED_ODDS;

        // Check if last spin was a win or loss
        const isWin = activeNumbers.includes(lastNum);

        if (isWin) {
            // Win: Reset progression back to 0
            state.progressionIndex = 0;
        } else {
            // Loss: Move to next progression step
            state.progressionIndex++;
            if (state.progressionIndex >= PROGRESSION.length) {
                state.progressionIndex = 0; // Reset on reaching end of progression
            }
        }

        // Update active set target based on last winning color
        if (lastColor === 'black') {
            state.activeSet = 'black_evens';
        } else if (lastColor === 'red') {
            state.activeSet = 'red_odds';
        }
        // If green (0/00), keep the current state.activeSet unchanged
    }

    // 5. Calculate chip amount per straight-up bet
    const baseUnit = config.betLimits.min;
    const multiplier = PROGRESSION[state.progressionIndex];
    let chipAmount = baseUnit * multiplier;

    // Clamp bet amount to config limits
    chipAmount = Math.max(chipAmount, config.betLimits.min);
    chipAmount = Math.min(chipAmount, config.betLimits.max);

    // 6. Generate 10 straight-up bet objects
    const targetNumbers = (state.activeSet === 'black_evens') ? BLACK_EVENS : RED_ODDS;

    const bets = targetNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: chipAmount
    }));

    return bets;
}