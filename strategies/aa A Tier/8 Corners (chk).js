/**
 * 8 CORNER ROULETTE STRATEGY
 * 
 * Source:
 * - Channel: CEG Dealer School
 * - Video: "This Roulette Strat Win 9 out of 10 times || 8 Corner"
 * - URL: https://youtu.be/L9It1DOlpKc
 * 
 * Full Strategy Logic:
 * The strategy places 8 interconnected corner bets across 5 consecutive rows (covering 15 numbers total).
 * By default, this covers numbers 22 through 36 using corner bets with top-left numbers:
 * 22, 23, 25, 26, 28, 29, 31, and 32.
 * 
 * Coverage breakdown:
 * - 4 outer corner numbers (22, 24, 34, 36) are covered by 1 corner (single hit: 8:1 payout).
 * - 8 border/edge numbers (23, 25, 27, 28, 30, 31, 33, 35) are covered by 2 corners (double hit: 16:1 total return).
 * - 3 inner center numbers (26, 29, 32) are covered by 4 corners (quad hit: 32:1 total return).
 * - 22 numbers (including 0/00) miss entirely (loss).
 * 
 * Progression & Press Rules:
 * - Level 1 (Base): 1 unit on each of the 8 corners (8 units total).
 *   - Loss: Rebet Level 1 (8 units).
 *   - Single Hit (1 corner): Small win (+1 unit net). Rebet Level 1.
 *   - Double Hit (2 corners): Win (+10 units net). Press to Level 2 (2 units per corner = 16 units total).
 *   - Quad Hit (4 corners / inner center): Big win (+28 units net). Rebet Level 1 and bank profit.
 * - Level 2 (Pressed): 2 units on each of the 8 corners (16 units total).
 *   - Loss: Reset to Level 1.
 *   - Single Hit (1 corner): Rebet Level 2 and pocket difference.
 *   - Double Hit (2 corners): Win. Reset to Level 1 (lock in win and reset).
 *   - Quad Hit (4 corners): Massive win. Rebet Level 2 to ride the hot streak.
 * 
 * Goal / Stop-Loss:
 * - Target Profit: Double the starting bankroll (2x bankroll).
 * - Stop Loss: Standard bullet management ($400 buy-in / 10 bullets of 8 units).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define corners covering 5 consecutive rows (numbers 22 to 36)
    // Corner top-left values:
    // Row 8 (22-24) to Row 9 (25-27): corners 22, 23
    // Row 9 (25-27) to Row 10 (28-30): corners 25, 26
    // Row 10 (28-30) to Row 11 (31-33): corners 28, 29
    // Row 11 (31-33) to Row 12 (34-36): corners 31, 32
    const CORNERS = [22, 23, 25, 26, 28, 29, 31, 32];

    // Numbers covered by number of intersecting corners:
    const SINGLE_HIT_NUMBERS = [22, 24, 34, 36];
    const DOUBLE_HIT_NUMBERS = [23, 25, 27, 28, 30, 31, 33, 35];
    const QUAD_HIT_NUMBERS   = [26, 29, 32];

    // 2. Initialize Persistent State
    if (!state.level) {
        state.level = 1; // 1 = Base (1 unit per corner), 2 = Pressed (2 units per corner)
        state.initialBankroll = bankroll;
        state.targetBankroll = config.startingBankroll ? config.startingBankroll * 2 : bankroll * 2;
    }

    // 3. Check Target Profit Goal (Double Bankroll)
    if (bankroll >= state.targetBankroll) {
        return []; // Target reached; stop betting
    }

    // 4. Update Progression State Based on Last Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        const isQuad = QUAD_HIT_NUMBERS.includes(lastNum);
        const isDouble = DOUBLE_HIT_NUMBERS.includes(lastNum);
        const isSingle = SINGLE_HIT_NUMBERS.includes(lastNum);
        const isWin = isQuad || isDouble || isSingle;

        if (state.level === 1) {
            if (isDouble) {
                // Double corner hit triggers the press to Level 2
                state.level = 2;
            } else {
                // Loss, single corner, or quad corner at base keeps level at 1
                state.level = 1;
            }
        } else if (state.level === 2) {
            if (!isWin) {
                // Loss on pressed level resets back to base
                state.level = 1;
            } else if (isDouble) {
                // Win on 2 corners locks in profit and resets
                state.level = 1;
            } else if (isSingle || isQuad) {
                // Single hit or center quad hit maintains the rebet at pressed level
                state.level = 2;
            }
        }
    }

    // 5. Calculate Bet Unit and Clamp to Limits
    const baseUnit = config.betLimits.min;
    const multiplier = state.level === 2 ? 2 : 1;
    let betPerCorner = baseUnit * multiplier;

    // Ensure within table constraints
    betPerCorner = Math.max(betPerCorner, config.betLimits.min);
    betPerCorner = Math.min(betPerCorner, config.betLimits.max);

    // Prevent placing bets exceeding current bankroll
    const totalRequired = betPerCorner * CORNERS.length;
    if (bankroll < totalRequired) {
        betPerCorner = Math.floor(bankroll / CORNERS.length);
        if (betPerCorner < config.betLimits.min) {
            return []; // Insufficient bankroll to place minimum table bets
        }
    }

    // 6. Return Bet Array
    return CORNERS.map(val => ({
        type: 'corner',
        value: val,
        amount: betPerCorner
    }));
}