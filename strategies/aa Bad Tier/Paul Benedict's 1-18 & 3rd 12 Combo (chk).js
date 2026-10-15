/**
 * ============================================================================
 * Strategy: Paul Benedict's 1-18 & 3rd 12 Combo System
 * Source:   The Roulette Master (YouTube: https://youtu.be/bO5o6hMsJDw)
 * ============================================================================
 * 
 * --- THE LOGIC & BET PLACEMENT ---
 * The strategy covers 31 to 32 numbers across the wheel with an asymmetric ratio:
 *  1. Low (1-18): 6 Base Units (Outside Bet, pays 1:1)
 *  2. 3rd Dozen (25-36): 4 Base Units (Dozen Bet, pays 2:1)
 *  3. Green Zero (0 / 00): 1 Base Unit (Inside Bet)
 * 
 * Only 6 numbers result in an outright loss (numbers 19 through 24).
 * Hitting any number 1-18 yields 12 units on a 11-unit layout (+1 net unit profit).
 * Hitting any number 25-36 yields 12 units on a 11-unit layout (+1 net unit profit).
 * Hitting 0/00 yields a bonus windfall payout.
 * 
 * --- BET PROGRESSION ---
 *  - Base Level (Level 0):
 *      Bets are 6 units on Low, 4 units on 3rd Dozen, and 1 unit on Zero.
 *      While winning at Base Level, bets remain flat.
 *  - On Loss:
 *      Bet sizes increase by 2 original units on the outside bets and 1 unit on zero:
 *        * Low increases by +12 units (+2x original $60 = +$120)
 *        * 3rd Dozen increases by +8 units (+2x original $40 = +$80)
 *        * Zero increases by +1 unit (+$10)
 *      Recovery Target: Each loss requires 3 wins in succession to clear.
 *  - Compounding Losses during Recovery:
 *      If another loss occurs before completing the required recovery wins,
 *      the progression increases another tier, and 3 additional wins are added
 *      to whatever pending wins were remaining (e.g., if 1 win was remaining,
 *      wins needed becomes 1 + 3 = 4).
 *  - Reset:
 *      Once all required recovery wins are fulfilled (winsNeeded <= 0), the
 *      progression immediately resets back to Level 0.
 * 
 * --- GOAL & RISK MANAGEMENT ---
 *  - Aimed at steady session profit targets (+10% to +20% bankroll) while capping
 *    maximum bet size according to table limits and preserving bankroll.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Persistent State
    if (state.level === undefined) state.level = 0;
    if (state.winsNeeded === undefined) state.winsNeeded = 0;
    if (state.lastBetTotal === undefined) state.lastBetTotal = 0;
    if (state.lastLowAmount === undefined) state.lastLowAmount = 0;
    if (state.lastDozenAmount === undefined) state.lastDozenAmount = 0;
    if (state.lastZeroAmount === undefined) state.lastZeroAmount = 0;

    // 2. Determine Base Unit sizing respecting table limits
    const minOutside = config.betLimits.minOutside || 5;
    const minInside = config.betLimits.min || 1;
    const maxBet = config.betLimits.max || 500;

    // Lowest integer unit satisfying outside (4 * unit >= minOutside) and inside (unit >= minInside)
    let unit = Math.max(Math.ceil(minOutside / 4), minInside);

    // 3. Process previous spin result if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Losing numbers for this layout are 19, 20, 21, 22, 23, 24
        const isLoss = (typeof num === 'number' && num >= 19 && num <= 24);

        if (isLoss) {
            // Increment progression level
            state.level += 1;
            // Carry forward remaining required wins and add 3 more
            state.winsNeeded = Math.max(0, state.winsNeeded) + 3;
        } else {
            // Spin was a win
            if (state.level > 0) {
                state.winsNeeded -= 1;
                // If all recovery wins have been met, reset to base
                if (state.winsNeeded <= 0) {
                    state.level = 0;
                    state.winsNeeded = 0;
                }
            }
        }
    }

    // 4. Calculate Bet Amounts according to Progression Tier
    // Base tier (level 0): Low = 6 units, Dozen 3 = 4 units, Zero = 1 unit
    // Each loss level adds: +12 units to Low, +8 units to Dozen 3, +1 unit to Zero
    const lowUnits = 6 + (state.level * 12);
    const dozenUnits = 4 + (state.level * 8);
    const zeroUnits = 1 + (state.level * 1);

    let lowAmount = lowUnits * unit;
    let dozenAmount = dozenUnits * unit;
    let zeroAmount = zeroUnits * unit;

    // 5. Clamp to Limits
    lowAmount = Math.max(lowAmount, minOutside);
    lowAmount = Math.min(lowAmount, maxBet);

    dozenAmount = Math.max(dozenAmount, minOutside);
    dozenAmount = Math.min(dozenAmount, maxBet);

    zeroAmount = Math.max(zeroAmount, minInside);
    zeroAmount = Math.min(zeroAmount, maxBet);

    // Bankroll check: ensure sufficient funds
    const totalRequired = lowAmount + dozenAmount + zeroAmount;
    if (bankroll < totalRequired) {
        // If bankroll cannot cover full progression, scale down or halt
        if (bankroll < (minOutside * 2 + minInside)) {
            return [];
        }
        lowAmount = Math.min(lowAmount, Math.floor(bankroll * 0.54));
        dozenAmount = Math.min(dozenAmount, Math.floor(bankroll * 0.36));
        zeroAmount = Math.min(zeroAmount, Math.max(minInside, bankroll - lowAmount - dozenAmount));
    }

    // 6. Record Placed Bet State
    state.lastLowAmount = lowAmount;
    state.lastDozenAmount = dozenAmount;
    state.lastZeroAmount = zeroAmount;
    state.lastBetTotal = lowAmount + dozenAmount + zeroAmount;

    // 7. Construct Bets Array
    const bets = [
        { type: 'low', amount: lowAmount },
        { type: 'dozen', value: 3, amount: dozenAmount }
    ];

    // Support Green Zero bet based on table type
    if (config.tableType === 'american') {
        // In American roulette, 0 and 00 can be covered via split or basket
        bets.push({ type: 'split', value: [0, 2], amount: zeroAmount });
    } else {
        bets.push({ type: 'number', value: 0, amount: zeroAmount });
    }

    return bets;
}