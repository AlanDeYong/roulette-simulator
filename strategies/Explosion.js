/**
 * Roulette Strategy: Explosion
 * Source: CEG Dealer School - https://www.youtube.com/watch?v=UNbO4AiG7Tk
 * * The Logic: 
 * The strategy focuses on a concentrated block of numbers (typically inside one dozen).
 * It places a total of 6 units per round: 2 Splits (2 units each) and 2 Corners (1 unit each).
 * By overlapping these bets, certain numbers (the "sweet spots" or "nipples") yield a high payout,
 * while surrounding numbers offer smaller wins to keep the streak alive.
 * * The Progression:
 * Positive progression. If the bet loses, it remains at the base level (Level 1).
 * If any of the covered numbers hit, the strategy enters the "Explosion" phase (Level 2),
 * where the bets are significantly pressed (roughly 3x the base unit) using the house money 
 * to capitalize on a potential streak.
 * If the Explosion bet wins, it resets to the base level to secure profits and walk away.
 * * The Goal: 
 * Hit back-to-back wins to turn a small base bet into a massive payout ("the explosion"), 
 * then immediately reset to protect bankroll. Stop-loss is bound by the available bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const minInside = config.betLimits.min;
    // Assume a standard $5 unit if the minimum limit permits, otherwise use the table minimum
    const baseUnit = Math.max(minInside, 5); 

    // 2. Initialize State
    if (state.level === undefined) {
        state.level = 1; // 1 = Base, 2 = Explosion
        state.layout = [
            { type: 'split', value: [17, 20], units: 2 },
            { type: 'split', value: [16, 19], units: 2 }, 
            { type: 'corner', value: 16, units: 1 },      // Covers 16, 17, 19, 20
            { type: 'corner', value: 17, units: 1 }       // Covers 17, 18, 20, 21
        ];
        state.lastBetPlaced = false;
    }

    // 3. Check previous spin to determine progression
    if (spinHistory.length > 0 && state.lastBetPlaced) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Define all unique numbers covered by the chosen layout (16-21 block)
        const coveredNumbers = [16, 17, 18, 19, 20, 21];
        const isWin = coveredNumbers.includes(lastSpin);

        if (isWin) {
            if (state.level === 1) {
                state.level = 2; // Trigger the Explosion press
            } else {
                state.level = 1; // Reset after a successful Explosion to lock in profit
            }
        } else {
            state.level = 1; // Reset on loss
        }
    }

    // 4. Calculate Bet Amounts
    // The Explosion relies on pressing the winnings. A 3x multiplier simulates rolling 
    // the profits from the base hits into the next bet.
    const multiplier = state.level === 1 ? 1 : 3; 
    
    let bets = [];
    let totalBetAmount = 0;

    for (const position of state.layout) {
        let amount = baseUnit * position.units * multiplier;
        
        // Clamp to limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: position.type,
            value: position.value,
            amount: amount
        });
        
        totalBetAmount += amount;
    }

    // 5. Bankroll Safety Check
    if (totalBetAmount > bankroll) {
        // If attempting an Explosion but lacking funds, downgrade back to Level 1
        if (state.level === 2) {
            state.level = 1;
            
            // Recalculate total for Level 1 to ensure we can at least afford the base bet
            let baseTotal = 0;
            for (const position of state.layout) {
                let baseAmount = Math.max(baseUnit * position.units, config.betLimits.min);
                baseAmount = Math.min(baseAmount, config.betLimits.max);
                baseTotal += baseAmount;
            }
            
            if (baseTotal > bankroll) {
                return []; // Cannot afford base bet
            } else {
                // Return base bets
                bets = state.layout.map(pos => {
                    let amount = Math.max(baseUnit * pos.units, config.betLimits.min);
                    amount = Math.min(amount, config.betLimits.max);
                    return { type: pos.type, value: pos.value, amount: amount };
                });
            }
        } else {
            return []; // Completely out of money for base bet
        }
    }

    state.lastBetPlaced = true;
    return bets;
}