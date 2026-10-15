/**
 * Red Rover Roulette Strategy
 * 
 * Source: Gamblers University (https://youtu.be/OeFuEZAKZiY)
 * 
 * The Full Logic in details:
 * This strategy relies on betting the 3rd column along with two double streets and three 
 * specific split bets to cover a dense group of red numbers, earning the name "Red Rover". 
 * The base bets are:
 * - $3 on the 1-6 double street (line bet)
 * - $3 on the 31-36 double street (line bet)
 * - $5 on the 3rd Column
 * - $1 on the 9/12 split
 * - $1 on the 18/21 split
 * - $1 on the 27/30 split
 * A total of $14 base bet.
 * 
 * The Full Bet Progression in details:
 * - The strategy uses a delayed negative progression based on a "loss count". 
 * - A loss is registered any time the net result of a spin is negative.
 * - After every 2 losses at a given level, the progression level goes up by 1, and the 
 *   loss count resets to 0 for the new level.
 * - Bet sizing: The bets scale up based on the progression level (e.g. Level 2 = $6 on 
 *   double streets, $10 on column, $2 on splits).
 * - "Jackpot Numbers": The numbers covered by the splits (9, 12, 18, 21, 27, 30) yield 
 *   a high payout. If one of these hits, and we currently have losses recorded at our 
 *   current level, the loss count for that level is reset back to 0. (The level itself does not change).
 * - "Session High": Any time the bankroll reaches a new high-water mark, the progression 
 *   fully resets back to Level 1, and losses reset to 0.
 * 
 * The Goal:
 * - The video establishes a $50 win goal on a $500 buy-in.
 * - This function stops betting (returns an empty array) if the bankroll reaches the 
 *   starting bankroll + 50 units.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.progressionLevel === undefined) {
        state.progressionLevel = 1;
        state.lossesAtLevel = 0;
        state.sessionHigh = bankroll;
        state.lastBankroll = bankroll;
        state.startingBankroll = bankroll;
    }

    // 2. Goal / Stop-Loss Condition
    const winGoal = 50000; 
    if (bankroll >= state.startingBankroll + winGoal) {
        return []; // Goal reached, end session
    }
    if (bankroll <= 0) {
        return []; // Bankrupt
    }

    // 3. Process the last spin to update progression state
    if (spinHistory.length > 0) {
        let netWin = bankroll - state.lastBankroll;
        let lastSpin = spinHistory[spinHistory.length - 1];

        if (bankroll > state.sessionHigh) {
            // New Session High! Full Reset.
            state.sessionHigh = bankroll;
            state.progressionLevel = 1;
            state.lossesAtLevel = 0;
        } else {
            if (netWin < 0) {
                // Loss
                state.lossesAtLevel += 1;
                if (state.lossesAtLevel >= 2) {
                    state.progressionLevel += 1;
                    state.lossesAtLevel = 0; // Reset losses upon leveling up
                }
            } else if (netWin > 0) {
                // Win, but not a new session high
                // Check if it was a "Jackpot Number"
                const jackpotNumbers = [9, 12, 18, 21, 27, 30];
                if (jackpotNumbers.includes(lastSpin.winningNumber)) {
                    // Reset loss count at the current level
                    state.lossesAtLevel = 0;
                }
            }
        }
    }

    // Update lastBankroll for calculating net win/loss on the next spin
    state.lastBankroll = bankroll;

    // 4. Base Bet Definitions
    const baseBets = [
        { type: 'line', value: 1, baseAmount: 3, isOutside: false },     // 1-6 double street
        { type: 'line', value: 31, baseAmount: 3, isOutside: false },    // 31-36 double street
        { type: 'column', value: 3, baseAmount: 5, isOutside: true },    // 3rd column
        { type: 'split', value: [9, 12], baseAmount: 1, isOutside: false },
        { type: 'split', value: [18, 21], baseAmount: 1, isOutside: false },
        { type: 'split', value: [27, 30], baseAmount: 1, isOutside: false }
    ];

    let currentBets = [];

    // 5. Calculate and Clamp Amounts
    for (let b of baseBets) {
        let amount = b.baseAmount;
        let level = state.progressionLevel;

        if (level > 1) {
            if (config.incrementMode === 'fixed') {
                // Increase by flat config minimum amount per level up
                amount = b.baseAmount + (level - 1) * (config.minIncrementalBet || 1);
            } else {
                // 'base' increment mode: multiply base bet by level
                amount = b.baseAmount * level;
            }
        }

        // Apply Config Table Limits Strictly
        let minLimit = b.isOutside ? config.betLimits.minOutside : config.betLimits.min;
        amount = Math.max(amount, minLimit);
        amount = Math.min(amount, config.betLimits.max);

        currentBets.push({
            type: b.type,
            value: b.value,
            amount: amount
        });
    }

    return currentBets;
}