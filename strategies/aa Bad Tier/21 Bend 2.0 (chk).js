/**
 * Strategy Name: 21 Bend 2.0
 * 
 * Source: 
 * - YouTube Video: "A Great Strat Made Better || 21 Bend 2.0"
 * - Channel: CEG Dealer School (https://youtu.be/fTX2UZIq2cA)
 * 
 * The Full Logic in Details:
 * - The strategy covers exactly 21 numbers using four Six-Line (double street) bets:
 *     1. Line 16 (covers 16-21)
 *     2. Line 19 (covers 19-24)  --> Overlaps with Line 16 on 19, 20, 21
 *     3. Line 25 (covers 25-30)
 *     4. Line 31 (covers 31-36)
 * - Because Line 16 and Line 19 overlap on numbers 19, 20, and 21, these 3 numbers 
 *   create a high-payout "sweet spot" that pays on both double streets simultaneously.
 * - Total numbers covered: 21 out of 37 (European) or 38 (American).
 * 
 * The Full Bet Progression in Details:
 * - Base State (Level 0):
 *     - 1 unit on Line 16, 1 unit on Line 19, 1 unit on Line 25, 1 unit on Line 31 (Total: 4 units).
 * - On Win (Regular hit: 16-18, 22-36):
 *     - Pays 5:1 on the winning double street (+2 units net profit).
 *     - Press progression: Press the bet by 2 units by allocating +1 unit to a touching 
 *       double street (Line 19) and +1 unit to a non-touching double street (Line 25).
 *     - If already pressed (Level 1+) and wins again, lock in profit and reset to base.
 * - On Sweet Spot Win (Overlapping hit: 19, 20, 21):
 *     - Both touching double streets hit simultaneously (+8 units or more net profit).
 *     - Reset immediately to Base Level (Level 0) to secure the jackpot win.
 * - On Loss (Number 0, 1-15):
 *     - All 4 bets lose (-4 units).
 *     - Reset back to Base Level (Level 0).
 * 
 * The Goal:
 * - Target Profit: Secure consistent incremental profits (+20% to +30% of starting bankroll)
 *   or lock in gains following sweet-spot hits and 2-win pressing parlay streaks.
 * - Stop Loss: Protect bankroll if funds drop below the minimum required for a full base cycle.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using inside bet minimum limits
    const unitMin = config && config.betLimits && config.betLimits.min ? config.betLimits.min : 2;
    const maxBet = config && config.betLimits && config.betLimits.max ? config.betLimits.max : 500;

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.targetBankroll = bankroll + (unitMin * 20); // Target profit: +20 base units
        state.pressLevel = 0; // 0 = Base (1 unit each), 1 = Pressed (+1 touching, +1 non-touching)
        state.lastBets = null;
    }

    // 3. Evaluate Previous Spin Outcome (if any)
    if (spinHistory && spinHistory.length > 0 && state.lastBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Check if winning number falls into our covered double streets
        const hitTouching1 = (winningNum >= 16 && winningNum <= 21);
        const hitTouching2 = (winningNum >= 19 && winningNum <= 24);
        const hitOverlap = hitTouching1 && hitTouching2; // 19, 20, 21
        const hitNonTouching = (winningNum >= 25 && winningNum <= 36);

        if (hitOverlap) {
            // Sweet spot hit (Double win) -> Lock profit and reset
            state.pressLevel = 0;
        } else if (hitTouching1 || hitTouching2 || hitNonTouching) {
            // Regular win
            if (state.pressLevel === 0) {
                // First win: Press up for a two-in-a-row run
                state.pressLevel = 1;
            } else {
                // Successfully won on pressed bet -> Lock win and reset
                state.pressLevel = 0;
            }
        } else {
            // Loss -> Reset to base
            state.pressLevel = 0;
        }
    }

    // 4. Target Profit / Stop Loss check
    if (bankroll >= state.targetBankroll) {
        // Reset target higher or reset progression
        state.targetBankroll = bankroll + (unitMin * 20);
        state.pressLevel = 0;
    }

    // 5. Calculate Bet Multipliers according to the 21 Bend 2.0 schema
    // Base: 1 unit on Line 16, 1 unit on Line 19, 1 unit on Line 25, 1 unit on Line 31
    // Press: +1 unit on touching (Line 19), +1 unit on non-touching (Line 25)
    let mult16 = 1;
    let mult19 = state.pressLevel > 0 ? 2 : 1;
    let mult25 = state.pressLevel > 0 ? 2 : 1;
    let mult31 = 1;

    // 6. Calculate chip amounts clamped to table limits
    const clampBet = (units) => {
        let amount = units * unitMin;
        amount = Math.max(amount, unitMin);
        amount = Math.min(amount, maxBet);
        return amount;
    };

    const betLine16 = clampBet(mult16);
    const betLine19 = clampBet(mult19);
    const betLine25 = clampBet(mult25);
    const betLine31 = clampBet(mult31);

    const totalRequired = betLine16 + betLine19 + betLine25 + betLine31;

    // Ensure bankroll covers the full bet
    if (bankroll < totalRequired) {
        return [];
    }

    // 7. Construct Bets array
    const bets = [
        { type: 'line', value: 16, amount: betLine16 }, // Touching Double Street 1 (16-21)
        { type: 'line', value: 19, amount: betLine19 }, // Touching Double Street 2 (19-24)
        { type: 'line', value: 25, amount: betLine25 }, // Non-touching Double Street 3 (25-30)
        { type: 'line', value: 31, amount: betLine31 }  // Non-touching Double Street 4 (31-36)
    ];

    state.lastBets = bets;
    return bets;
}