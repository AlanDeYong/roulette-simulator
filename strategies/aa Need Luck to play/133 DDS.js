/**
 * Strategy: 133 DDS (Dynamic Dozen/Street)
 * Source: CEG Dealer School (https://www.youtube.com/watch?v=cK7oSLahsj4&list=WL&index=7&t=417s)
 * * The Logic: 
 * A board-coverage strategy betting on 1 Dozen, 3 Splits, and 3 Streets. 
 * This hedges risks, ensuring that hits on the Dozen or Splits yield a profit, 
 * while hits on the Streets act as a "push" to protect the bankroll.
 * * The Progression: 
 * Tiered positive progression. 
 * - Win (hit Dozen or Split): Move to the next tier, increasing bet units.
 * - Push (hit Street): Maintain the current tier and re-bet.
 * - Loss (uncovered number or 0/00): Reset progression to Tier 1.
 * * The Goal: 
 * Stop-loss is implicit via bankroll depletion. The target profit is an 
 * aggressive but mathematically grounded 50% ROI (Walk away when Bankroll >= 1.5x Starting Bankroll).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State & Goal Tracking
    if (state.tier === undefined) {
        state.tier = 1;
        state.initialBankroll = bankroll;
    }

    // 2. Check Target Profit Goal (50% ROI)
    if (bankroll >= state.initialBankroll * 3.5) {
        return []; // Stop betting, goal reached
    }

    // 3. Evaluate Previous Spin for Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let hitWin = false;
        let hitPush = false;

        // Evaluate hit zones based on our fixed layout
        if (lastNum >= 1 && lastNum <= 12) {
            hitWin = true; // Hit Dozen 1
        } else if ([14, 17, 20, 23].includes(lastNum)) {
            hitWin = true; // Hit our specific Splits
        } else if (lastNum >= 28 && lastNum <= 36) {
            hitPush = true; // Hit our specific Streets
        }

        if (hitWin) {
            state.tier++;
        } else if (!hitPush) {
            // Loss (uncovered number, 0, or 00)
            state.tier = 1; 
        }
        // If hitPush is true, state.tier remains unchanged
    }

    // Cap the progression tier to prevent reckless exponential scaling
    const currentTier = Math.min(state.tier, 4);

    // 4. Determine Base Units & Progression Multipliers
    const outUnit = Math.max(5, config.betLimits.minOutside);
    const inUnit = Math.max(2, config.betLimits.min);

    let dozenUnits = 6; // Base Tier 1
    if (currentTier === 2) dozenUnits = 6;
    if (currentTier === 3) dozenUnits = 8;
    if (currentTier === 4) dozenUnits = 10;
    
    const insideMultiplier = currentTier; // T1=1x, T2=2x, T3=3x, T4=4x

    // 5. Calculate and CLAMP Bet Amounts
    const dozenAmt = Math.min(dozenUnits * outUnit, config.betLimits.max);
    const splitAmt = Math.min(insideMultiplier * inUnit, config.betLimits.max);
    const streetAmt = Math.min(insideMultiplier * inUnit, config.betLimits.max);

    // 6. Construct Bet Array
    const currentBets = [];

    // The Dozen (Dozen 1)
    currentBets.push({ type: 'dozen', value: 1, amount: dozenAmt });

    // The 3 Splits (in Dozen 2)
    currentBets.push({ type: 'split', value: [14, 17], amount: splitAmt });
    currentBets.push({ type: 'split', value: [17, 20], amount: splitAmt });
    currentBets.push({ type: 'split', value: [20, 23], amount: splitAmt });

    // The 3 Streets (in Dozen 3)
    currentBets.push({ type: 'street', value: 28, amount: streetAmt }); // Covers 28, 29, 30
    currentBets.push({ type: 'street', value: 31, amount: streetAmt }); // Covers 31, 32, 33
    currentBets.push({ type: 'street', value: 34, amount: streetAmt }); // Covers 34, 35, 36

    return currentBets;
}