/**
 * Strategy: The "Zero Full Loss" Cover-All (Guaranteed Bleed)
 * Source: Custom strategy exploring mathematical stop-losses and the house edge.
 * The Logic: Places a minimum Straight Up bet on every single number (0-36) on a European 
 * Roulette wheel. This guarantees a winning hit on every single spin, meaning 
 * you never lose 100% of your wager on a single turn. 
 * The Progression: Flat betting. No progression is used. Because the payout (35:1) is less 
 * than the true odds (36:1), you lose exactly 1 base unit every spin.
 * The Goal: To demonstrate the absolute highest "stop loss" (minimum guaranteed return) 
 * possible, which results in a slow, steady, inescapable bankroll decay without 
 * the standard volatility of roulette.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using the required minimum for inside bets
    // We want the absolute lowest amount possible to minimize the gross loss per spin
    const unit = config.betLimits.min; 
    
    // 2. Calculate total required for this spin (37 numbers * unit)
    const totalWager = 37 * unit;

    // 3. Bankroll Check
    // If the bankroll drops below the amount needed to cover the entire board,
    // we must stop betting to avoid breaking the "zero full loss" rule.
    if (bankroll < totalWager) {
        return []; 
    }

    // 4. Generate the bets
    const bets = [];
    for (let i = 0; i <= 36; i++) {
        bets.push({
            type: 'number',
            value: i,
            amount: unit
        });
    }

    // 5. Return the array of 37 individual straight-up bets
    return bets;
}