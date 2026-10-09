/*
 * Strategy Name: The Exclusive Invisio
 * Source: Casino Matchmaker (URL: https://youtu.be/HefS8JH057o)
 *
 * The Full Logic in details:
 * This is a dynamic coverage strategy that covers 22 numbers (18 numbers yielding a standard profit, 
 * a street yielding a smaller profit, and 0 acting as a "banger" high-profit number). It switches 
 * between a "High" setup and a "Low" setup.
 * - High Setup: High (19-36), 3rd Dozen, Line (19-24), Street (16-18), and 0.
 * - Low Setup: Low (1-18), 1st Dozen, Line (13-18), Street (19-21), and 0.
 *
 * The Full Bet Progression in details:
 * - Base Bets (Total $18 equivalent):
 *   - $8 on High/Low
 *   - $4 on the Dozen
 *   - $2 on the Six-Line
 *   - $2 on the Street
 *   - $2 on 0
 * - On a LOSS: The progression level increases by 1 (adding an $18 base unit equivalent), AND the 
 *   strategy switches sides (High -> Low, or Low -> High).
 * - On a WIN:
 *   - If the current progression level is 3 or higher, it drops down 1 level (Safety Net).
 *   - If the current progression level is 1 or 2, it remains the same.
 *
 * The Goal:
 * - Milestone Target: The strategy aims for a $20 profit milestone above the previous high-water mark.
 * - Once the current bankroll hits or exceeds this milestone, the progression resets to Level 1, 
 *   and a new milestone target is set ($20 above the current bankroll).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (!state.initialized) {
        state.progLevel = 1;
        state.currentSide = 'high'; // Start on the High side
        state.milestoneTarget = bankroll + 20;
        state.initialized = true;
    }

    // 2. Evaluate previous spin to update progression
    if (spinHistory.length > 0) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        let wonLast = false;
        
        // Determine if the last spin was a winner based on the active coverage
        if (state.currentSide === 'high') {
            // High setup covers: 0, 16-18 (Street), 19-36 (High/Line/Dozen) -> 0, 16-36
            if (lastNum === 0 || (lastNum >= 16 && lastNum <= 36)) {
                wonLast = true;
            }
        } else {
            // Low setup covers: 0, 1-18 (Low/Line/Dozen), 19-21 (Street) -> 0-21
            if (lastNum >= 0 && lastNum <= 21) {
                wonLast = true;
            }
        }

        if (wonLast) {
            // Milestone check: If we've hit our profit target, reset progression
            if (bankroll >= state.milestoneTarget) {
                state.progLevel = 1;
                state.milestoneTarget = bankroll + 20;
            } 
            // Safety net: If at level 3 or higher, reduce level by 1 on a win
            else if (state.progLevel >= 3) {
                state.progLevel--;
            }
        } else {
            // On a loss: increase progression and switch sides
            state.progLevel++;
            state.currentSide = state.currentSide === 'high' ? 'low' : 'high';
        }
    }

    // 3. Calculate Bet Amounts (Base units scaled by progression level)
    const mult = state.progLevel;
    
    // Using the exact ratios from the video ($8, $4, $2, $2, $2 base)
    let amtOutside = 8 * mult;
    let amtDozen   = 4 * mult;
    let amtLine    = 2 * mult;
    let amtStreet  = 2 * mult;
    let amtZero    = 2 * mult;

    // 4. Clamp to limits
    const clampInside = (amount) => Math.max(config.betLimits.min, Math.min(amount, config.betLimits.max));
    const clampOutside = (amount) => Math.max(config.betLimits.minOutside, Math.min(amount, config.betLimits.max));

    amtOutside = clampOutside(amtOutside);
    amtDozen   = clampOutside(amtDozen);
    amtLine    = clampInside(amtLine);
    amtStreet  = clampInside(amtStreet);
    amtZero    = clampInside(amtZero);

    // 5. Construct Bet Array
    let bets = [];

    if (state.currentSide === 'high') {
        bets.push({ type: 'high',   amount: amtOutside });
        bets.push({ type: 'dozen',  value: 3, amount: amtDozen });
        bets.push({ type: 'line',   value: 19, amount: amtLine });
        bets.push({ type: 'street', value: 16, amount: amtStreet });
        bets.push({ type: 'number', value: 0, amount: amtZero });
    } else {
        bets.push({ type: 'low',    amount: amtOutside });
        bets.push({ type: 'dozen',  value: 1, amount: amtDozen });
        bets.push({ type: 'line',   value: 13, amount: amtLine });
        bets.push({ type: 'street', value: 19, amount: amtStreet });
        bets.push({ type: 'number', value: 0, amount: amtZero });
    }

    return bets;
}