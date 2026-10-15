/**
 * ============================================================================
 * STRATEGY: The Cancer Crab Claw (CCC) Master Blueprint
 * ============================================================================
 * Source:
 *   - YouTube Video: "Claw you way to the Top (The Cancer Crab Claw)"
 *   - Channel: The Lucky Felt (Todd Hoover)
 *   - URL: https://youtu.be/lE4k7L4twvs
 *
 * The Full Logic in Detail:
 *   - The strategy is inspired by the astrological archetype of Cancer (the Crab),
 *     featuring an armored central shell with outer pinching claws and sideways lateral drift.
 *   - Bet Placement ("The Crab Claw Cluster"):
 *       A tightly grouped 5-bet inside cluster covering 8 distinct numbers:
 *       1. "Armored Shell" (Center): 1 Corner bet covering 4 numbers (2 units).
 *       2. "Left Pincer": 2 Straight-Up bets on row 1 (1 unit each).
 *       3. "Right Pincer": 2 Straight-Up bets on row 1 (1 unit each).
 *       Total bet size: 6 units per spin.
 *
 *   - Default Setup (2nd Dozen):
 *       - Corner on 17 (covers 17, 18, 20, 21) -> 2 units
 *       - Left Pincer on 13 & 16 -> 1 unit each
 *       - Right Pincer on 22 & 25 -> 1 unit each
 *
 *   - Lateral Drift ("Walking Sideways"):
 *       Like a crab walking sideways, the entire 5-bet cluster shifts dynamically
 *       across the layout to adapt to the flow of the table:
 *       - If the winning number is higher than the cluster center, slide right (+3).
 *       - If the winning number is lower than the cluster center, slide left (-3).
 *       - Clamped between corner 5 (leftmost valid: claws 1, 4 / corner 5, 6, 8, 9 / claws 10, 13)
 *         and corner 26 (rightmost valid: claws 22, 25 / corner 26, 27, 29, 30 / claws 31, 34).
 *
 * The Full Bet Progression in Detail:
 *   - Level 1 (Base, 1x multiplier):
 *       - Bet 1 unit on each of 4 straight-ups, 2 units on corner (6 units total).
 *       - Up to 2 attempts allowed at this base level.
 *   - Level 2 (Doubled, 2x multiplier):
 *       - Triggered after 2 consecutive losses at Level 1.
 *       - Double the bet size: 2 units per straight-up, 4 units on corner (12 units total).
 *       - Up to 3 attempts allowed at this doubled level.
 *   - Win / Reset Behavior:
 *       - Any win immediately resets the progression back to Level 1.
 *       - If all 3 attempts at Level 2 miss, the cycle resets back to Level 1 to prevent
 *         catastrophic drawdowns.
 *
 * The Goal:
 *   - Target Profit: +100 units (video author locks in at +114 units).
 *   - Stop-Loss: Bankroll depletion or failure to cover the full 6-unit minimum bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using Inside bet minimum
    const unit = config.betLimits.min;

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.targetUnits = 10000; // +100 units target profit
        state.level = 1;         // 1 = Base (1x), 2 = Doubled (2x)
        state.attempt = 0;       // Attempts used in the current level
        state.cornerTopLeft = 17;// Base position in 2nd dozen (covers 17, 18, 20, 21)
    }

    // 3. Profit Target Check
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetUnits * unit) {
        return []; // Target reached, stop betting
    }

    // 4. Evaluate Previous Spin Results
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Determine numbers covered in the previous spin
        const c = state.cornerTopLeft;
        const coveredNumbers = [
            c - 4, c - 1,          // Left pincer
            c, c + 1, c + 3, c + 4,// Corner
            c + 5, c + 8           // Right pincer
        ];

        const isWin = coveredNumbers.includes(lastNum);

        if (isWin) {
            // Win: Reset progression back to base level
            state.level = 1;
            state.attempt = 0;
        } else {
            // Loss: Advance attempt counter
            state.attempt++;

            if (state.level === 1 && state.attempt >= 2) {
                // Advance to Level 2 (double up)
                state.level = 2;
                state.attempt = 0;
            } else if (state.level === 2 && state.attempt >= 3) {
                // Cycle exhausted: Reset to protect bankroll
                state.level = 1;
                state.attempt = 0;
            }
        }

        // Lateral Drift: Shift cluster towards the table flow
        if (lastNum !== 0 && lastNum !== '0' && lastNum !== '00') {
            const clusterMid = state.cornerTopLeft + 2; // Approximate center of cluster
            if (lastNum > clusterMid && state.cornerTopLeft + 3 <= 26) {
                state.cornerTopLeft += 3;
            } else if (lastNum < clusterMid && state.cornerTopLeft - 3 >= 5) {
                state.cornerTopLeft -= 3;
            }
        }
    }

    // 5. Calculate Multiplier and Base Bet Amounts
    const multiplier = state.level === 2 ? 2 : 1;
    let straightAmount = unit * multiplier;
    let cornerAmount = unit * 2 * multiplier;

    // Respect Table Bet Limits
    straightAmount = Math.max(straightAmount, config.betLimits.min);
    straightAmount = Math.min(straightAmount, config.betLimits.max);

    cornerAmount = Math.max(cornerAmount, config.betLimits.min);
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    // Total required for all 5 bets (4 straight-ups + 1 corner)
    const totalRequired = (straightAmount * 4) + cornerAmount;
    if (bankroll < totalRequired) {
        return []; // Insufficient funds to maintain strategy integrity
    }

    // 6. Build the 5 Bet Placements
    const c = state.cornerTopLeft;
    const bets = [
        // Armored Shell: Central Corner Bet
        { type: 'corner', value: c, amount: cornerAmount },

        // Left Pincer: Straight-Up Bets
        { type: 'number', value: c - 4, amount: straightAmount },
        { type: 'number', value: c - 1, amount: straightAmount },

        // Right Pincer: Straight-Up Bets
        { type: 'number', value: c + 5, amount: straightAmount },
        { type: 'number', value: c + 8, amount: straightAmount }
    ];

    return bets;
}