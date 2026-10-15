/**
 * Down The Middle Roulette Strategy
 * 
 * SOURCE:
 * - YouTube Video: "'Down the Middle' Roulette Strategy" (https://youtu.be/4chraBjATDQ)
 * - Channel: Gamblers University (Professor Profit)
 * 
 * THE FULL LOGIC IN DETAIL:
 * - The strategy covers over half of the roulette wheel by combining Outside bets 
 *   (1st Dozen and 2nd Column) with a sequence of Inside split and straight-up bets 
 *   placed "down the middle" along the numbers of the 2nd column 
 *   (2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35).
 * - Target / Reset Trigger: Whenever a win results in reaching a NEW session high bankroll 
 *   (or hitting the $50 target profit goal), the progression resets back to Level 1.
 * 
 * THE FULL BET PROGRESSION IN DETAIL:
 * - Level 1 ($11 Base Unit Structure):
 *   - $4 on 1st Dozen
 *   - $4 on 2nd Column
 *   - $1 Split on [2, 5]
 *   - $1 Split on [8, 11]
 *   - $1 Split on [14, 17]
 * - Multi-Level Progression (L = Level 1, 2, 3, ...):
 *   - Dozen Bet: $4 × L
 *   - Column Bet: $4 × L
 *   - Inside Bets: Adds 3 units worth of additional split / straight-up bets on middle-column numbers per level (3 × L total inside bet units).
 * - Outcome Rules:
 *   - On Loss: Advance to the next level (L -> L + 1).
 *   - On Win: If bankroll reaches a NEW session high or target profit (+ $50), reset to Level 1.
 *     If the win does not achieve a new session high, remain at the current level.
 * 
 * THE GOAL:
 * - Target Profit: +$50 session profit over starting bankroll.
 * - Stop Loss / Reset: Resets back to Level 1 upon reaching a session high bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    if (!state.initialBankroll) {
        state.initialBankroll = bankroll;
        state.highestBankroll = bankroll;
        state.level = 1;
    }

    const minOutside = config.betLimits.minOutside || 5;
    const minInside = config.betLimits.min || 1;
    const maxBet = config.betLimits.max || 500;

    // Unit amounts scaled to table limits
    const dozenUnit = Math.max(4, Math.ceil(minOutside * 0.8));
    const columnUnit = Math.max(4, Math.ceil(minOutside * 0.8));
    const insideUnit = Math.max(1, minInside);

    // 2. Evaluate Results from Previous Spin
    if (spinHistory && spinHistory.length > 0) {
        if (bankroll > state.highestBankroll) {
            // New Session High -> Reset to Level 1
            state.highestBankroll = bankroll;
            state.level = 1;
        } else {
            const prevBankroll = state.lastBankroll || state.initialBankroll;
            if (bankroll < prevBankroll) {
                // Net loss on spin -> Advance progression level
                state.level += 1;
            }
        }
    }

    state.lastBankroll = bankroll;

    // Check if target profit (+50) reached
    if (bankroll - state.initialBankroll >= 50) {
        state.level = 1;
    }

    const L = state.level;

    // Clamp function to respect config limits
    const clamp = (amount, isOutside) => {
        const minLimit = isOutside ? minOutside : minInside;
        return Math.min(Math.max(amount, minLimit), maxBet);
    };

    // 3. Construct Bets Array
    const bets = [];

    // Outside Bets (1st Dozen & 2nd Column)
    bets.push({ type: 'dozen', value: 1, amount: clamp(dozenUnit * L, true) });
    bets.push({ type: 'column', value: 2, amount: clamp(columnUnit * L, true) });

    // Inside Bets - Middle Column Split & Straight-Up Placements
    const availableSplits = [
        [2, 5], [8, 11], [14, 17],
        [20, 23], [26, 29], [32, 35],
        [5, 8], [11, 14], [17, 20],
        [23, 26], [29, 32]
    ];

    const availableStraights = [35, 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32];

    const totalInsideBetsCount = 3 * L;
    let placedCount = 0;

    // Place split bets
    for (let i = 0; i < availableSplits.length && placedCount < totalInsideBetsCount; i++) {
        bets.push({
            type: 'split',
            value: availableSplits[i],
            amount: clamp(insideUnit, false)
        });
        placedCount++;
    }

    // Place straight-up bets for remaining units
    for (let i = 0; i < availableStraights.length && placedCount < totalInsideBetsCount; i++) {
        bets.push({
            type: 'number',
            value: availableStraights[i],
            amount: clamp(insideUnit, false)
        });
        placedCount++;
    }

    return bets;
}