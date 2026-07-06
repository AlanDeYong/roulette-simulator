/**
 * Matryoshka (Nesting Doll) Trap Strategy
 * * Source: https://youtu.be/k4WI-coOIC8 (The Lucky Felt)
 * * The Full Logic in details: 
 * The strategy builds a "Nesting Doll" by picking a single six-number block (Double Street / Line bet). 
 * Instead of spreading chips across the felt, it builds inward on every loss. If the dealer hits the outer shell (Line), 
 * you survive. If they hit the dead center (the straight-up number), the overlapping payouts detonate for a massive win.
 * * The Full Bet Progression in details:
 * - Spin 1 (Step 0): Place 2 units on a Double Street (Line).
 * - Spin 2 (Step 1 - After Loss): Add 1 unit to the Line, add 1 unit to a Corner inside the Line.
 * - Spin 3 (Step 2 - After Loss): Add 1 unit to Line & Corner, add 1 unit to a Split inside the Corner.
 * - Spin 4 (Step 3 - After Loss): Add 1 unit to Line, Corner & Split, add 1 unit to a Single Straight-Up inside the Split.
 * - Reset on Win: If any win occurs, reset to Step 0 and change the target Line to the last winning number's Line.
 * - Reset on Loss (Hard Reset): If Step 3 loses (a cumulative ~25 unit loss), hard reset back to Step 0 on the same target.
 * *Note: Incremental increases scale according to `config.incrementMode`.*
 * * The Goal: 
 * Catch a massive hit on the inner core for a 100+ unit payout. The stop-loss is ~25 units per attack cycle (which triggers 
 * the hard reset). Target profit is typically 20%+ of the starting bankroll before cashing out.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.step === undefined) {
        state.step = 0;
        state.targetL = 1; // Default starting line (covers 1-6)
    }

    const unit = config.betLimits.min;
    let bets = [];

    // 2. Process History for Wins/Losses & Targeting
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        let lastNum = lastSpin.winningNumber;
        
        // Detect Win/Loss via Bankroll changes
        if (state.lastBankroll !== undefined) {
            if (bankroll > state.lastBankroll) {
                // WIN: Reset step progression, change target to last hit (if not a zero)
                state.step = 0;
                if (lastNum !== 0 && lastNum !== '00') {
                    lastNum = parseInt(lastNum, 10);
                    state.targetL = Math.floor((lastNum - 1) / 6) * 6 + 1;
                }
            } else {
                // LOSS: Advance step to build inward
                state.step++;
                
                // Hard reset after 4 consecutive losses in a cycle (~25 units lost total)
                if (state.step > 3) {
                    state.step = 0;
                    // Strategy dictates to stay on the same number after a max loss reset
                }
            }
        } else {
            // Very first recorded spin: try to target the recent history if available
            if (lastNum !== 0 && lastNum !== '00') {
                lastNum = parseInt(lastNum, 10);
                state.targetL = Math.floor((lastNum - 1) / 6) * 6 + 1;
            }
        }
    }
    
    // Save current bankroll for the next spin comparison
    state.lastBankroll = bankroll;

    // 3. Define Nesting Doll Components based on target Line (L)
    const L = state.targetL;
    const C = L + 1;                  // Corner top-left number (e.g., if L=1, C=2 covering 2,3,5,6)
    const S = [L + 1, L + 4];         // Split (e.g., if L=1, Split is [2, 5])
    const N = L + 4;                  // Single Straight-Up (e.g., if L=1, N=5)

    // 4. Calculate Amounts with Increment Logic
    function getAmount(baseMultiplier, startStep) {
        if (state.step < startStep) return 0;
        
        const initialBet = baseMultiplier * unit;
        const increments = state.step - startStep;
        
        // Respect incrementMode configuration
        const incValue = config.incrementMode === 'base' ? initialBet : (config.minIncrementalBet || 1);
        let amount = initialBet + (increments * incValue);
        
        // Clamp to limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        return amount;
    }

    // Evaluate bet amounts for the current step
    const lineAmt = getAmount(2, 0);
    const cornerAmt = getAmount(1, 1);
    const splitAmt = getAmount(1, 2);
    const singleAmt = getAmount(1, 3);

    // 5. Build Bet Array
    if (lineAmt > 0) bets.push({ type: 'line', value: L, amount: lineAmt });
    if (cornerAmt > 0) bets.push({ type: 'corner', value: C, amount: cornerAmt });
    if (splitAmt > 0) bets.push({ type: 'split', value: S, amount: splitAmt });
    if (singleAmt > 0) bets.push({ type: 'number', value: N, amount: singleAmt });

    return bets;
}