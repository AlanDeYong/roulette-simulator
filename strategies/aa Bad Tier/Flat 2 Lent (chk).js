/**
 * Roulette Strategy: Flat to Lent (LNT)
 * * Source: CEG Dealer School (https://www.youtube.com/watch?v=b99sDqVlbsM)
 * * The Logic: 
 * A "grinder" system that uses 6 units spread across 3 specific non-overlapping inside bets 
 * to provide wide coverage and manage variance. It utilizes a Double Street (Line) bet 
 * as a break-even "push" mechanism to keep you at the table longer.
 * - 1 Unit on a Double Street (Line)
 * - 2 Units on a Street
 * - 3 Units on a Corner
 * * The Progression: 
 * Flat betting. There is no progression after wins or losses. Bets remain the exact 
 * same size every spin until the profit goal is reached.
 * * The Goal: 
 * Win 21 units. Once the bankroll hits +21 units from the starting amount, the strategy 
 * immediately stops betting (walks away).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    // Since these are all inside bets, we use the inside minimum as our base unit.
    const unit = config.betLimits.min;

    // 2. Initialize State
    // We must track the starting bankroll to calculate our 21-unit win goal.
    if (state.startingBankroll === undefined) {
        state.startingBankroll = bankroll;
        state.goalReached = false;
    }

    // 3. Check for Win Goal
    const targetProfit = 210000 * unit;
    if (bankroll >= state.startingBankroll + targetProfit) {
        state.goalReached = true;
    }

    // If goal is reached or we don't have enough to cover the 6 total units, stop betting.
    if (state.goalReached || bankroll < (6 * unit)) {
        return []; 
    }

    // 4. Calculate Bet Amounts & Clamp to Limits
    // The strategy uses a 1-2-3 unit distribution.
    const lineAmount = Math.max(unit * 1, config.betLimits.min);
    const streetAmount = Math.max(unit * 2, config.betLimits.min);
    const cornerAmount = Math.max(unit * 3, config.betLimits.min);

    // Ensure we do not exceed table maximums
    const finalLineAmount = Math.min(lineAmount, config.betLimits.max);
    const finalStreetAmount = Math.min(streetAmount, config.betLimits.max);
    const finalCornerAmount = Math.min(cornerAmount, config.betLimits.max);

    // 5. Place Bets
    // Ensure bets do not overlap.
    // Line covers 31-36 | Street covers 13-15 | Corner covers 1,2,4,5
    return [
        { type: 'line', value: 31, amount: finalLineAmount }, 
        { type: 'street', value: 13, amount: finalStreetAmount }, 
        { type: 'corner', value: 1, amount: finalCornerAmount }   
    ];
}