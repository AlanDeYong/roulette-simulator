/**
 * Strategy Name: Cash and Recover (Modified - Cumulative Linear Progression)
 * Source: https://youtu.be/72tgOjV59Mo (YouTube Channel: Casino Matchmaker)
 * Also: https://youtu.be/WrzkKDYGbmU
 * --- THE FULL LOGIC IN DETAILS ---
 * - Base Setup (Normal Play):
 *   - Line 1-6 (5 units) & Line 31-36 (5 units)
 *   - 4 Base Corners (4 units each): Corners [8, 14, 20, 26]
 *   - Base total wager: 26 units (covers 28 numbers).
 * 
 * --- THE FULL BET PROGRESSION IN DETAILS ---
 * - On a Full Loss ("Whack" - zero payout):
 *   - Enter / advance recovery progression.
 *   - The 5 recovery corners [2, 11, 17, 23, 29] are activated and NEVER removed across consecutive losses.
 *   - Every active bet increases by its respective base bet amount on every full loss:
 *     - Line bets increase by +5 units per loss level.
 *     - All corner bets (base + recovery) increase by +4 units per loss level.
 * - On a Partial Loss (payout < total bet amount):
 *   - Repeat the current bet amounts without escalating.
 * - On a Win / Recovery:
 *   - When bankroll recovers back to or above the session peak / profit target, reset progression back to Level 1 (base bets only, removing the 5 recovery corners).
 * 
 * --- THE GOAL ---
 * - Target Profit: +150 units from starting bankroll (or session high-water mark recovery).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.progression = 1;         // Multiplier applied to all active bets
        state.inRecovery = false;      // Flag indicating if recovery corners are active
        state.peakBankroll = bankroll;  // Session high-water mark
        state.targetProfit = 150;      // Target profit
        state.lastTotalWager = 0;
        state.lastBets = [];
    }

    // Update peak bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Check if target profit reached -> reset progression
    const startingBankroll = config.startingBankroll || 2000;
    if (bankroll >= startingBankroll + state.targetProfit) {
        state.progression = 1;
        state.inRecovery = false;
    }

    // 2. Evaluate previous spin outcome (if history exists)
    if (spinHistory && spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Calculate total return from previous bets
        let totalWon = 0;
        for (const b of state.lastBets) {
            if (b.type === 'line') {
                if (winningNum >= b.value && winningNum <= b.value + 5) {
                    totalWon += b.amount * 6; // 5:1 payout + stake returned
                }
            } else if (b.type === 'corner') {
                const c = b.value;
                const covered = [c, c + 1, c + 3, c + 4];
                if (covered.includes(winningNum)) {
                    totalWon += b.amount * 9; // 8:1 payout + stake returned
                }
            }
        }

        const netProfit = totalWon - state.lastTotalWager;

        if (totalWon === 0) {
            // Full Loss ("Whack") -> Activate recovery corners & scale up all bets
            state.inRecovery = true;
            state.progression += 1;
        } else if (netProfit < 0) {
            // Partial Loss -> Maintain current bets (do not escalate, do not remove)
        } else {
            // Win -> Check if recovered to session peak
            if (bankroll >= state.peakBankroll - (config.betLimits.min || 1)) {
                state.progression = 1;
                state.inRecovery = false;
            }
        }
    }

    // 3. Determine Base Unit respecting limits
    const insideMin = (config.betLimits && config.betLimits.min) ? config.betLimits.min : 1;
    const maxBet = (config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
    const unit = insideMin;

    function clampBet(amt) {
        let clamped = Math.max(amt, insideMin);
        return Math.min(clamped, maxBet);
    }

    // 4. Construct Bets
    const bets = [];

    // Base Line Bets: 5 units x progression multiplier
    const lineAmount = clampBet(5 * unit * state.progression);
    bets.push({ type: 'line', value: 1, amount: lineAmount });   // Line 1-6
    bets.push({ type: 'line', value: 31, amount: lineAmount }); // Line 31-36

    // Base Corners: 4 units x progression multiplier
    const baseCornerAmount = clampBet(4 * unit * state.progression);
    const baseCorners = [8, 14, 20, 26];
    for (const cornerVal of baseCorners) {
        bets.push({ type: 'corner', value: cornerVal, amount: baseCornerAmount });
    }

    // Recovery Corners: Kept active on ALL loss steps once triggered, scaling up by 4 units each level
    if (state.inRecovery) {
        const recoveryCorners = [2, 11, 17, 23, 29];
        // Recovery corners scale with progression relative to when recovery started
        const recoveryProgression = Math.max(1, state.progression - 1);
        const recoveryCornerAmount = clampBet(4 * unit * recoveryProgression);

        for (const cornerVal of recoveryCorners) {
            bets.push({ type: 'corner', value: cornerVal, amount: recoveryCornerAmount });
        }
    }

    // 5. Store state for next spin evaluation
    let totalWager = 0;
    for (const b of bets) {
        totalWager += b.amount;
    }
    state.lastTotalWager = totalWager;
    state.lastBets = bets;

    return bets;
}