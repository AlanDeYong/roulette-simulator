/**
 * SAFE ZONE Roulette Strategy (Strict Peak-Reset Mode)
 * 
 * Source:
 * - Channel: Bet With Mo
 * - Video URL: https://youtu.be/JBkQLZYyot4
 * - Original Strategy Submitter: Mark B
 * 
 * Strategy Logic & Placement Details:
 * 1. Base Setup (Level 1):
 *    - 2nd Dozen (13-24): 4 units (Outside bet)
 *    - Six-Line / Double Street 7-12 (Line 7): 2 units (Inside bet)
 *    - Six-Line / Double Street 25-30 (Line 25): 2 units (Inside bet)
 *    Total Level 1 bet: 8 units.
 * 
 * 2. Progression Levels (Levels 2 - 8):
 *    - When a loss occurs, move to Level 2 and add 3 Corner bets:
 *      * Corner 8 (covers 8, 9, 11, 12)
 *      * Corner 17 (covers 17, 18, 20, 21)
 *      * Corner 26 (covers 26, 27, 29, 30)
 *    - Multipliers per level:
 *      * Level 1: Dozen 2nd = 4u, Line 7 = 2u, Line 25 = 2u (Total: 8u)
 *      * Level 2: Dozen 2nd = 5u, Line 7 = 2u, Line 25 = 2u, Corners (8, 17, 26) = 1u each (Total: 12u)
 *      * Level 3: Dozen 2nd = 10u, Line 7 = 4u, Line 25 = 4u, Corners (8, 17, 26) = 2u each (Total: 24u)
 *      * Level 4: Dozen 2nd = 15u, Line 7 = 6u, Line 25 = 6u, Corners (8, 17, 26) = 3u each (Total: 36u)
 *      * Level 5: Dozen 2nd = 20u, Line 7 = 8u, Line 25 = 8u, Corners (8, 17, 26) = 4u each (Total: 48u)
 *      * Level 6: Dozen 2nd = 25u, Line 7 = 10u, Line 25 = 10u, Corners (8, 17, 26) = 5u each (Total: 60u)
 *      * Level 7: Dozen 2nd = 50u, Line 7 = 20u, Line 25 = 20u, Corners (8, 17, 26) = 10u each (Total: 120u)
 *      * Level 8: Dozen 2nd = 100u, Line 7 = 40u, Line 25 = 40u, Corners (8, 17, 26) = 20u each (Total: 240u)
 * 
 * 3. Progression & Win/Loss Handling:
 *    - Win: Stays at the current level or continues progression without resetting UNTIL the session's peak bankroll (high-water mark) is reached or exceeded.
 *    - Push (Net $0 change): Maintains the current progression level.
 *    - Loss: Advances to the next progression level (up to Level 8).
 * 
 * Goal:
 * - Maximize recovery by maintaining elevated bet levels until a new overall session high is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.initialBankroll = bankroll;
        state.highestBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Evaluate Last Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const netChange = bankroll - state.lastBankroll;

        if (netChange > 0) {
            // Only reset to Level 1 if bankroll reaches or exceeds the overall session peak
            if (bankroll >= state.highestBankroll) {
                state.highestBankroll = bankroll;
                state.level = 1;
            }
            // If it is a win but hasn't beaten the session peak, keep current level
        } else if (netChange < 0) {
            // Loss: Advance progression level (cap at 8)
            if (state.level < 8) {
                state.level += 1;
            }
        }
        // Push (netChange === 0): maintain current level
    }

    state.lastBankroll = bankroll;

    // Update session high if bankroll grew
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    // 3. Define Unit Values Respecting Config Limits
    const insideUnit = Math.max(1, config.betLimits.min || 1);
    const outsideUnit = Math.max(1, Math.floor((config.betLimits.minOutside || 5) / 4) || 1);
    const unit = Math.max(insideUnit, outsideUnit);

    // 4. Level Multipliers
    const levelConfigs = {
        1: { dozen: 4, line: 2, corner: 0 },
        2: { dozen: 5, line: 2, corner: 1 },
        3: { dozen: 10, line: 4, corner: 2 },
        4: { dozen: 15, line: 6, corner: 3 },
        5: { dozen: 20, line: 8, corner: 4 },
        6: { dozen: 25, line: 10, corner: 5 },
        7: { dozen: 50, line: 20, corner: 10 },
        8: { dozen: 100, line: 40, corner: 20 }
    };

    const currentMultiplier = levelConfigs[state.level] || levelConfigs[1];

    // 5. Construct Bets with Limit Clamping
    const bets = [];
    const clampInside = (amount) => Math.min(Math.max(amount, config.betLimits.min), config.betLimits.max);
    const clampOutside = (amount) => Math.min(Math.max(amount, config.betLimits.minOutside), config.betLimits.max);

    // 2nd Dozen
    bets.push({
        type: 'dozen',
        value: 2,
        amount: clampOutside(currentMultiplier.dozen * unit)
    });

    // Six Lines: 7-12 and 25-30
    bets.push({
        type: 'line',
        value: 7,
        amount: clampInside(currentMultiplier.line * unit)
    });
    bets.push({
        type: 'line',
        value: 25,
        amount: clampInside(currentMultiplier.line * unit)
    });

    // Corners: 8, 17, 26 (Active on Level 2+)
    if (currentMultiplier.corner > 0) {
        const cornerAmount = clampInside(currentMultiplier.corner * unit);
        bets.push({
            type: 'corner',
            value: 8,
            amount: cornerAmount
        });
        bets.push({
            type: 'corner',
            value: 17,
            amount: cornerAmount
        });
        bets.push({
            type: 'corner',
            value: 26,
            amount: cornerAmount
        });
    }

    return bets;
}