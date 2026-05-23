/**
 * Roulette Strategy: 1-Unit Corner Progression (Randomized 1st Dozen)
 * 
 * Source: https://youtu.be/k5cmgoqty8E (YouTube Channel: CEG Dealer School)
 * 
 * The Logic:
 * - Place 1 unit on the 1st Dozen, 3rd Dozen, and 2nd Column.
 * - Place 1 unit each on 4 specific corners:
 *   1. Two randomized, non-overlapping corners in the 1st Dozen. (To ensure they don't overlap, one is chosen from [1, 2] and the other from [7, 8]).
 *   2. The 17/21 corner (lowest number is 17, covering 17, 18, 20, 21).
 *   3. A randomly selected corner in the 3rd Dozen (25-36).
 * 
 * The Progression:
 * - On a loss (net bankroll decreases): Increase ONLY the corner bets by their base amount (+1 unit). 
 *   The outside bets (dozens and column) remain at exactly 1 unit.
 * - On a win (net bankroll increases or pushes): 
 *   - If the current bankroll is NOT at the session high, re-bet the same amounts.
 *   - If the current bankroll equals or exceeds the session high, reset the corner progression back to base (1 unit) and pick new random corners for the 1st and 3rd dozens.
 * 
 * The Goal:
 * - Use high table coverage to frequently hit. Recoup any losses via the aggressive corner bet multiplier while using the flat outside bets for stabilization. Lock in profits by resetting the progression every time a new peak bankroll is achieved.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper to pick a random corner in the 3rd dozen (numbers 25-36)
    const getRandomCorner3rd = () => {
        const corners = [25, 26, 28, 29, 31, 32];
        return corners[Math.floor(Math.random() * corners.length)];
    };

    // Helper to pick two non-overlapping corners in the 1st dozen (numbers 1-12)
    // To strictly avoid overlap, we must pick one from the top rows and one from the bottom.
    const getRandomCorners1st = () => {
        const topCorners = [1, 2];
        const bottomCorners = [7, 8];
        const c1 = topCorners[Math.floor(Math.random() * topCorners.length)];
        const c2 = bottomCorners[Math.floor(Math.random() * bottomCorners.length)];
        return [c1, c2];
    };

    // 1. Initialize State
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.lastBankroll = bankroll;
        state.cornerMultiplier = 1;
        state.randomCorner3rd = getRandomCorner3rd();
        state.randomCorners1st = getRandomCorners1st();
    }

    // 2. Evaluate Win/Loss from the previous spin
    if (spinHistory.length > 0) {
        if (bankroll < state.lastBankroll) {
            // Loss: Increase the corner multiplier
            state.cornerMultiplier++;
        } else {
            // Win (or Push)
            if (bankroll >= state.sessionHigh) {
                // We reached or exceeded our previous high: Reset progression
                state.cornerMultiplier = 1;
                state.randomCorner3rd = getRandomCorner3rd();
                state.randomCorners1st = getRandomCorners1st();
            }
            // Else: We are still in a drawdown, so we just re-bet (multiplier stays the same)
        }
    }

    // 3. Update Tracking Variables
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
    }
    state.lastBankroll = bankroll;

    // 4. Calculate Bet Amounts (Respecting limits)
    
    // Outside Bets (Fixed at 1 unit, clamped to limits)
    let outsideAmount = Math.max(1, config.betLimits.minOutside);
    outsideAmount = Math.min(outsideAmount, config.betLimits.max);

    // Inside Corner Bets (Base 1 unit * multiplier, clamped to limits)
    let cornerBase = Math.max(1, config.betLimits.min);
    let cornerAmount = cornerBase * state.cornerMultiplier;
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    // 5. Build and Return Bets Array
    const bets = [];

    // Outside Bets
    bets.push({ type: 'dozen', value: 1, amount: outsideAmount });
    bets.push({ type: 'dozen', value: 3, amount: outsideAmount });
    bets.push({ type: 'column', value: 2, amount: outsideAmount });

    // Corner Bets
    // 1st Dozen: Two randomized, non-overlapping corners
    bets.push({ type: 'corner', value: state.randomCorners1st[0], amount: cornerAmount });
    bets.push({ type: 'corner', value: state.randomCorners1st[1], amount: cornerAmount });
    
    // 17/21 Corner (covers 17, 18, 20, 21 - identified by lowest number)
    bets.push({ type: 'corner', value: 17, amount: cornerAmount });
    
    // Random 3rd Dozen Corner
    bets.push({ type: 'corner', value: state.randomCorner3rd, amount: cornerAmount });

    return bets;
}