/**
 * Multi-Zone Overlap & High-Coverage Progression Strategy
 * 
 * Source:
 * - URL: https://youtu.be/1I1G8soLgeU
 * - Channel: Spin Till You Win Creator of Wheel Pulse Pro Max
 * 
 * Strategy Logic:
 * - The strategy utilizes a 7-phase dynamic multi-zone betting sequence.
 * - Early phases (Phases 1-3) focus on lower bet outlay with targeted overlap 
 *   zones (e.g. Low 1-18 overlapping with 2nd Dozen 13-24) to create high-payout "jackpots".
 * - Middle to late phases (Phases 4-7) transition into wider coverage (covering up to 
 *   31 of the 37 numbers in Phase 7 across Zero, Dozen 1, Dozen 3, and Six-Line 16-21) 
 *   to ensure rapid recovery and return to baseline.
 * 
 * Bet Progression Details:
 * - Phase 1: 1 unit on Low (1-18). (Total: 1 unit)
 * - Phase 2: 6 units on Low (1-18) + 4 units on 2nd Dozen (13-24). (Total: 10 units)
 * - Phase 3: 13 units on 1st Dozen (1-12) + 1 unit on Low (1-18). (Total: 14 units)
 * - Phase 4: 13 units on 1st Dozen (1-12). (Total: 13 units)
 * - Phase 5: 39 units on 1st Dozen (1-12) + 39 units on 3rd Dozen (25-36). (Total: 78 units)
 * - Phase 6: 234 units on 1st Dozen (1-12) + 234 units on 3rd Dozen (25-36) + 117 units on Line (16-21). (Total: 585 units)
 * - Phase 7: 141 units on Zero (0) + 1686 units on 1st Dozen (1-12) + 1686 units on 3rd Dozen (25-36) + 843 units on Line (16-21). (Total: 4356 units)
 * - Win Rule: On any win that yields net recovery/profit, reset to Phase 1.
 * - Loss Rule: Advance to the next phase. If Phase 7 loses, reset to Phase 1.
 * 
 * Goal:
 * - Secure consistent session profits (typically +50 to +100 base units) or stop after completing Phase 7.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.phase = 1;
        state.initialBankroll = bankroll;
        state.targetProfit = 100 * config.betLimits.minOutside;
        state.stopLoss = state.initialBankroll * 0.5;
        state.initialized = true;
    }

    // 2. Base Unit Sizing
    const baseUnit = Math.max(1, Math.floor(config.betLimits.minOutside / 5) || 1);

    // 3. Process Previous Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        let won = false;

        switch (state.phase) {
            case 1:
                won = (num >= 1 && num <= 18);
                break;
            case 2:
                won = (num >= 1 && num <= 24);
                break;
            case 3:
                won = (num >= 1 && num <= 12);
                break;
            case 4:
                won = (num >= 1 && num <= 12);
                break;
            case 5:
                won = (num >= 1 && num <= 12) || (num >= 25 && num <= 36);
                break;
            case 6:
                won = (num >= 1 && num <= 12) || (num >= 25 && num <= 36) || (num >= 16 && num <= 21);
                break;
            case 7:
                won = (num === 0) || (num >= 1 && num <= 12) || (num >= 25 && num <= 36) || (num >= 16 && num <= 21);
                break;
            default:
                won = false;
        }

        if (won) {
            state.phase = 1;
        } else {
            state.phase += 1;
            if (state.phase > 7) {
                state.phase = 1; // Reset cycle after Phase 7 completion
            }
        }
    }

    // Check Stop Conditions
    if (bankroll >= state.initialBankroll + state.targetProfit || bankroll <= state.stopLoss) {
        return [];
    }

    // Helper: Clamp bet amount to configured table limits
    const clampBet = (amount, isOutside = true) => {
        const min = isOutside ? config.betLimits.minOutside : config.betLimits.min;
        const max = config.betLimits.max;
        return Math.min(Math.max(amount, min), max);
    };

    // 4. Construct Bets for Current Phase
    const bets = [];

    switch (state.phase) {
        case 1:
            bets.push({
                type: 'low',
                amount: clampBet(1 * baseUnit, true)
            });
            break;

        case 2:
            bets.push(
                { type: 'low', amount: clampBet(6 * baseUnit, true) },
                { type: 'dozen', value: 2, amount: clampBet(4 * baseUnit, true) }
            );
            break;

        case 3:
            bets.push(
                { type: 'dozen', value: 1, amount: clampBet(13 * baseUnit, true) },
                { type: 'low', amount: clampBet(1 * baseUnit, true) }
            );
            break;

        case 4:
            bets.push({
                type: 'dozen',
                value: 1,
                amount: clampBet(13 * baseUnit, true)
            });
            break;

        case 5:
            bets.push(
                { type: 'dozen', value: 1, amount: clampBet(39 * baseUnit, true) },
                { type: 'dozen', value: 3, amount: clampBet(39 * baseUnit, true) }
            );
            break;

        case 6:
            bets.push(
                { type: 'dozen', value: 1, amount: clampBet(234 * baseUnit, true) },
                { type: 'dozen', value: 3, amount: clampBet(234 * baseUnit, true) },
                { type: 'line', value: 16, amount: clampBet(117 * baseUnit, false) }
            );
            break;

        case 7:
            bets.push(
                { type: 'number', value: 0, amount: clampBet(141 * baseUnit, false) },
                { type: 'dozen', value: 1, amount: clampBet(1686 * baseUnit, true) },
                { type: 'dozen', value: 3, amount: clampBet(1686 * baseUnit, true) },
                { type: 'line', value: 16, amount: clampBet(843 * baseUnit, false) }
            );
            break;
    }

    return bets;
}