/**
 * ============================================================================
 * ROULETTE STRATEGY: OUTREACH
 * ============================================================================
 * Source: https://youtu.be/5EvJL-D-474
 * YouTube Channel: Bet With Mo
 * 
 * THE FULL LOGIC IN DETAIL:
 * The "Outreach" strategy focuses on placing street bets expanding symmetrically 
 * outward from the center of the roulette board (streets 16-18 and 19-21) while 
 * maintaining a hedge bet on Zero (or Split 0/00 on American tables).
 * 
 * - Level 1: Bet on 2 center streets (Street 16, Street 19) + Zero Hedge.
 * - Level 2: Expand to 4 center streets (Streets 13, 16, 19, 22) + Zero Hedge.
 * - Level 3: Expand to 6 center streets (Streets 10, 13, 16, 19, 22, 25) + Zero Hedge.
 * - Level 4: Expand to 8 center streets (Streets 7, 10, 13, 16, 19, 22, 25, 28) + Zero Hedge.
 * 
 * THE FULL BET PROGRESSION IN DETAIL:
 * - Base Unit = config.betLimits.min (or min base unit)
 * - Level 1: 2 units per street (2 streets = 4 units) + 1 unit on Zero/Split 0-00. Total = 5 units.
 * - Level 2: 6 units per street (4 streets = 24 units) + 2 units on Zero/Split 0-00. Total = 26 units.
 * - Level 3: 12 units per street (6 streets = 72 units) + 3 units on Zero/Split 0-00. Total = 75 units.
 * - Level 4: 20 units per street (8 streets = 160 units) + 4 units on Zero/Split 0-00. Total = 164 units.
 * 
 * After a win that achieves net session profit or completes a progression cycle, 
 * the progression resets back to Level 1. After a loss, the strategy advances to 
 * the next level.
 * 
 * THE GOAL:
 * - Accumulate profit across cycles and reset on wins.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    if (state.level === undefined) {
        state.level = 1;
        state.initialBankroll = bankroll;
        state.highWaterMark = bankroll;
    }

    // 2. Track bankroll performance and update progression level
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
        state.level = 1; // Reset progression on new profit peak
    } else if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        if (state.lastBets) {
            // Calculate win/loss from last spin
            let won = false;
            for (const b of state.lastBets) {
                if (b.type === 'street') {
                    // Street covers b.value to b.value + 2
                    if (lastSpin.winningNumber >= b.value && lastSpin.winningNumber <= b.value + 2) {
                        won = true;
                        break;
                    }
                } else if (b.type === 'number' && lastSpin.winningNumber === b.value) {
                    won = true;
                    break;
                } else if (b.type === 'split') {
                    if (Array.isArray(b.value) && b.value.includes(lastSpin.winningNumber)) {
                        won = true;
                        break;
                    }
                }
            }

            if (won) {
                state.level = 1; // Reset to level 1 on hit
            } else {
                state.level = Math.min(state.level + 1, 4); // Step up progression on miss
            }
        }
    }

    // 3. Define Bet Levels (Street start values, street unit multiplier, zero unit multiplier)
    const minUnit = Math.max(1, config.betLimits.min);
    const isAmerican = config.tableType === 'american';

    const levelConfigs = {
        1: { streets: [16, 19], streetUnits: 2, zeroUnits: 1 },
        2: { streets: [13, 16, 19, 22], streetUnits: 6, zeroUnits: 2 },
        3: { streets: [10, 13, 16, 19, 22, 25], streetUnits: 12, zeroUnits: 3 },
        4: { streets: [7, 10, 13, 16, 19, 22, 25, 28], streetUnits: 20, zeroUnits: 4 }
    };

    const currentConfig = levelConfigs[state.level] || levelConfigs[1];
    const bets = [];

    // 4. Place Street Bets
    for (const streetVal of currentConfig.streets) {
        let amount = minUnit * currentConfig.streetUnits;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        bets.push({ type: 'street', value: streetVal, amount: amount });
    }

    // 5. Place Zero / Zero-Double-Zero Hedge Bet
    let zeroAmount = minUnit * currentConfig.zeroUnits;
    zeroAmount = Math.max(zeroAmount, config.betLimits.min);
    zeroAmount = Math.min(zeroAmount, config.betLimits.max);

    if (isAmerican) {
        bets.push({ type: 'split', value: [0, 37], amount: zeroAmount }); // 37 represents '00' on American tables
    } else {
        bets.push({ type: 'number', value: 0, amount: zeroAmount });
    }

    // Store bets in state for next spin resolution
    state.lastBets = bets;

    return bets;
}