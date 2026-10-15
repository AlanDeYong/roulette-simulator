/**
 * -------------------------------------------------------------------------------------------------
 * Strategy: AK 8 (Alex Kim 8-Corner Overlap System)
 * Source: YouTube - CEG Dealer School
 * URL: https://youtu.be/M31DB2S-GGg
 *
 * THE FULL LOGIC IN DETAIL:
 * The AK8 strategy is an interlocking corner layout covering 15 contiguous numbers
 * across 5 consecutive rows (numbers 1 through 15) using 8 connected corner positions:
 *   - Corners: 1, 2, 4, 5, 7, 8, 10, 11
 *
 * Under standard 8-corner betting, perimeter hits produce 8:1 (+1 unit net), acting like a push.
 * The "AK8 Tech" adds 4 extra units (1 extra unit on each of the 4 outer corner positions: 1, 2, 10, 11)
 * so that even single-corner perimeter hits yield a significant net return (16 units gross).
 *
 * Intersections & Payout Multipliers:
 *   - Single hits (outer boundaries): 16 units gross
 *   - Double-corner overlap (numbers 2, 4, 6, 7, 9, 10, 12, 14): 24 to 32 units gross
 *   - Quad-corner overlap ("Big Fatties" at 5, 8, 11): 48 units gross
 *
 * THE FULL BET PROGRESSION IN DETAIL:
 *   - Base Bet (Level 1): 12 units total
 *       - 2 units on corners 1, 2, 10, 11
 *       - 1 unit on corners 4, 5, 7, 8
 *   - Win Progression:
 *       - On a win, press aggressively into the winning streak by doubling the layout (x2 multiplier).
 *       - After 2 consecutive wins (or achieving session peak profit), reset back to Level 1 to lock in gains.
 *   - Loss Progression:
 *       - On any miss (number outside 1-15), immediately reset progression back to base Level 1.
 *   - Session Peak Profit Rule:
 *       - Whenever the bankroll hits a new peak above the starting balance, progression resets to Level 1.
 *
 * THE GOAL:
 *   - Profit Target: 100% gain (double initial bankroll).
 *   - Stop-Loss: Cease betting if the bankroll cannot cover the minimum layout.
 * -------------------------------------------------------------------------------------------------
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine unit size based on table limits
    const minInside = (config && config.betLimits && config.betLimits.min) ? config.betLimits.min : 2;
    const maxBet = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
    const baseUnit = Math.max(minInside, 5);

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.startingBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.targetBankroll = bankroll * 2;
        state.multiplier = 1;
        state.winStreak = 0;
    }

    // Update session peak bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
        // Reset to base level when a new session peak profit is reached
        state.multiplier = 1;
        state.winStreak = 0;
    }

    // 3. Goal & Stop-Loss Check
    if (bankroll >= state.targetBankroll) {
        return [];
    }

    // 4. Evaluate Previous Spin
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Numbers 1 through 15 are covered in the 8-corner matrix
        const isWin = lastNum >= 1 && lastNum <= 15;

        if (isWin) {
            state.winStreak += 1;
            if (state.winStreak < 2) {
                // Press after first win
                state.multiplier = 2;
            } else {
                // Lock profit and reset after consecutive wins
                state.multiplier = 1;
                state.winStreak = 0;
            }
        } else {
            // Reset to base on any miss
            state.multiplier = 1;
            state.winStreak = 0;
        }
    }

    // 5. Corner Layout Definitions (Corner top-left values and base unit weights)
    const corners = [
        { value: 1,  weight: 2 }, // (1, 2, 4, 5)
        { value: 2,  weight: 2 }, // (2, 3, 5, 6)
        { value: 4,  weight: 1 }, // (4, 5, 7, 8)
        { value: 5,  weight: 1 }, // (5, 6, 8, 9)
        { value: 7,  weight: 1 }, // (7, 8, 10, 11)
        { value: 8,  weight: 1 }, // (8, 9, 11, 12)
        { value: 10, weight: 2 }, // (10, 11, 13, 14)
        { value: 11, weight: 2 }  // (11, 12, 14, 15)
    ];

    const totalWeight = 12; // 2+2+1+1+1+1+2+2 = 12 units

    // Downscale multiplier if bankroll cannot afford pressed level
    if (bankroll < totalWeight * baseUnit * state.multiplier) {
        state.multiplier = 1;
    }

    // If bankroll cannot even support table minimums, stop
    if (bankroll < totalWeight * minInside) {
        return [];
    }

    // 6. Build and Clamp Bet Objects
    const bets = [];
    for (let i = 0; i < corners.length; i++) {
        let amount = corners[i].weight * baseUnit * state.multiplier;

        // Clamp to allowed range
        amount = Math.max(amount, minInside);
        amount = Math.min(amount, maxBet);

        bets.push({
            type: 'corner',
            value: corners[i].value,
            amount: amount
        });
    }

    return bets;
}