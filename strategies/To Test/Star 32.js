/**
 * STRATEGY: Star 32
 * * Source: YouTube - "The Roulette Master" (https://www.youtube.com/watch?v=PE8GFNed8wE)
 * * The Logic: 
 * This is a "Target Number" strategy focused on the number 32 and its physical neighbors 
 * on a European roulette wheel. The strategy assumes a "hot zone" around the number 32. 
 * It places "Straight Up" bets on 32 and the four numbers surrounding it on the wheel: 
 * 17, 5, 32, 15, and 19.
 * * The Progression: 
 * This implementation uses a Flat Betting approach (fixed unit) per number, as the 
 * high payout of Straight Up bets (35:1) allows for recovery without aggressive 
 * Martingale doubling. The user can adjust the multiplier in the state if desired.
 * * The Goal: 
 * To hit any of the 5 targeted numbers. A hit on any number results in a 
 * significant net profit for that spin (36 units returned for 5 units wagered). 
 * The stop-loss is reached if the bankroll falls below the total required for one full bet.
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. Setup targeted numbers (32 and its wheel neighbors)
    const starNumbers = [17, 5, 32, 15, 19];
    
    // 2. Initialize State
    if (!state.currentUnit) {
        state.currentUnit = config.betLimits.min;
    }
    
    // 3. Check Stop-Loss / Bankroll sufficiency
    const totalBetRequired = state.currentUnit * starNumbers.length;
    if (bankroll < totalBetRequired) {
        return null; // Stop betting if we can't afford the full star
    }

    // 4. Calculate and Clamp the bet amount for each number
    // Straight up bets use config.betLimits.min
    let unitAmount = state.currentUnit;
    
    // Ensure unit is at least the minimum for inside bets
    unitAmount = Math.max(unitAmount, config.betLimits.min);
    
    // Ensure unit does not exceed maximum
    unitAmount = Math.min(unitAmount, config.betLimits.max);

    // 5. Construct the bet array
    const bets = starNumbers.map(num => {
        return {
            type: 'number',
            value: num,
            amount: unitAmount
        };
    });

    return bets;
}