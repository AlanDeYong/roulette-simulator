/**
 * Source: https://www.youtube.com/watch?v=pOWR22G3oM4 (THEROULETTEMASTERTV)
 * The Logic: The "Bankrupt the Casino" strategy plays one of two configurations:
 * - Side A: Low (1-18), Even, and all 9 even numbers between 1 and 18.
 * - Side B: High (19-36), Odd, and all 9 odd numbers between 19 and 36.
 * The player only switches sides immediately after a winning spin (net profit > 0).
 * The Progression: Delayed Martingale. 
 * - After 1 loss (or partial loss): Rebet the exact same amount.
 * - After 2 consecutive losses: Double the overall bet size. 
 * - After any win: Reset the bet size to the base unit and switch sides.
 * The Goal: Accumulate consistent daily profit. The video targets $1,000 profit 
 * using a starting bankroll of $2,000 to absorb the delayed progression swings.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first spin
    if (state.currentSide === undefined) {
        state.currentSide = 'A';
        state.lossCount = 0;
        state.progMultiplier = 1;
        state.lastBankroll = bankroll;
    }

    // 2. Evaluate previous spin (if not the first spin)
    if (spinHistory.length > 0) {
        let netProfit = bankroll - state.lastBankroll;

        if (netProfit > 0) {
            // WIN: Reset progression, reset loss count, switch sides
            state.progMultiplier = 1;
            state.lossCount = 0;
            state.currentSide = state.currentSide === 'A' ? 'B' : 'A';
        } else {
            // LOSS (or partial loss): Increment loss count
            state.lossCount++;
            
            // Delayed Martingale: Double bet only after 2 consecutive losses
            if (state.lossCount === 2) {
                state.progMultiplier *= 2;
                state.lossCount = 0; // Reset counter for the next double
            }
        }
    }

    // 3. Calculate current bet amounts, respecting configuration limits
    let insideAmount = config.betLimits.min * state.progMultiplier;
    let outsideAmount = config.betLimits.minOutside * state.progMultiplier;

    // Clamp to table maximums
    insideAmount = Math.min(insideAmount, config.betLimits.max);
    outsideAmount = Math.min(outsideAmount, config.betLimits.max);

    // 4. Generate Bets based on current side
    let bets = [];

    if (state.currentSide === 'A') {
        // Side A: Low / Even focus
        bets.push({ type: 'low', amount: outsideAmount });
        bets.push({ type: 'even', amount: outsideAmount });
        
        const sideA_Evens = [2, 4, 6, 8, 10, 12, 14, 16, 18];
        sideA_Evens.forEach(num => {
            bets.push({ type: 'number', value: num, amount: insideAmount });
        });
    } else {
        // Side B: High / Odd focus
        bets.push({ type: 'high', amount: outsideAmount });
        bets.push({ type: 'odd', amount: outsideAmount });
        
        const sideB_Odds = [19, 21, 23, 25, 27, 29, 31, 33, 35];
        sideB_Odds.forEach(num => {
            bets.push({ type: 'number', value: num, amount: insideAmount });
        });
    }

    // 5. Update lastBankroll BEFORE returning bets so it can be evaluated next spin
    state.lastBankroll = bankroll;

    return bets;
}