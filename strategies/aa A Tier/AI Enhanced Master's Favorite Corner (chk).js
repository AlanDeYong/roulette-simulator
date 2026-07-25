/**
 * Roulette Strategy: AI Enhanced Master's Favorite Corner Strategy
 * 
 * Source:
 * - Video URL: https://youtu.be/zs4Vi6zRMzY
 * - Channel: The Risk and Reward Lab
 * 
 * Full Strategy Logic:
 * 1. Initial State:
 *    - Start by placing bets on 5 fixed corner positions.
 *    - Base bet per corner is 1 unit (clamped to config.betLimits.min).
 *    - Track initial bankroll at session start to determine "Session Profit".
 * 
 * 2. On Loss:
 *    - On the 1st loss, expand coverage from 5 corners to 6 corners.
 *    - Increase the bet amount on every active corner by 2 units per corner.
 *    - If corners reach 11 units or higher per corner, bet increases accelerate to +4 units per corner per loss.
 * 
 * 3. On Win & Recovery (AI Enhancement):
 *    - Check if current bankroll >= starting session bankroll (Session Profit reached).
 *    - If Session Profit IS reached: Reset completely back to base state (5 corners at 1 unit base bet).
 *    - If Session Profit IS NOT reached (In Recovery):
 *      - Maintain coverage (5 corners) for additional recovery spins at the current bet level.
 *      - Continue escalating bets on loss until reaching session profit, then reset to base.
 * 
 * Goal:
 * - Reach a net session profit after recovery progressions, resetting back to base unit upon hitting profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit minimum
    const baseUnit = config.betLimits.min || 1;

    // Initialize State
    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
    }

    // Default corner selection (top-left number defines corner in standard JS table formats)
    const baseCorners = [1, 5, 17, 25, 29]; // 5 base corners covering 20 numbers
    const sixthCorner = 13;                 // 6th corner added on loss

    if (state.cornerBetUnits === undefined) {
        state.cornerBetUnits = 1; // 1 unit per corner
    }
    if (state.numCorners === undefined) {
        state.numCorners = 5;
    }

    // 2. Evaluate previous spin if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNum = lastSpin.winningNumber;

        // Helper to check if winning number is covered by corner defined by top-left number 'val'
        const isCoveredByCorner = (val, num) => {
            if (num === 0 || num === 37 || num === '00') return false;
            const r1 = val, r2 = val + 1, r3 = val + 3, r4 = val + 4;
            return num === r1 || num === r2 || num === r3 || num === r4;
        };

        const activeCorners = state.numCorners === 6 ? [...baseCorners, sixthCorner] : baseCorners;
        const hit = activeCorners.some(val => isCoveredByCorner(val, lastWinningNum));

        if (bankroll >= state.sessionStartBankroll) {
            // Session Profit Reached: Reset
            state.cornerBetUnits = 1;
            state.numCorners = 5;
            state.sessionStartBankroll = bankroll;
        } else if (hit) {
            // Recovery Win (Not in session profit)
            // AI Enhanced Rule: Maintain coverage (5 corners) for additional recovery opportunities
            if (state.numCorners === 6) {
                state.numCorners = 5;
            }
        } else {
            // Loss: Add 6th corner if not already added, increase units per corner
            if (state.numCorners < 6) {
                state.numCorners = 6;
            }
            const incrementUnits = state.cornerBetUnits >= 11 ? 4 : 2;
            state.cornerBetUnits += incrementUnits;
        }
    }

    // 3. Calculate Bet Amounts & Clamp to Limits
    let calculatedAmount = state.cornerBetUnits * baseUnit;
    calculatedAmount = Math.max(calculatedAmount, config.betLimits.min || 1);
    calculatedAmount = Math.min(calculatedAmount, config.betLimits.max || 500);

    // 4. Construct Corner Bets Array
    const activeCornersToBet = state.numCorners === 6 ? [...baseCorners, sixthCorner] : baseCorners;
    const bets = activeCornersToBet.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: calculatedAmount
    }));

    return bets;
}