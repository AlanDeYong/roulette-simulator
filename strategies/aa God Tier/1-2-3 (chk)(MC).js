/**
 * 1-2-3 Roulette Strategy
 * * Source: https://youtu.be/VIh2Lw-yQr0 (Gamblers University)
 * * The Full Logic in details:
 * - The strategy is an aggressive configuration covering 27 numbers on the board using a mix of 
 * straight-up, split, street, and column bets.
 * - What triggers a bet? The bets are placed on every single spin until the target profit is reached.
 * - Conditions for progression: 
 * - "Total Loss": If an uncovered number hits (resulting in zero return), the progression level increases by 1.
 * - "Partial Loss": If a covered number hits but results in a net loss for that spin (e.g., hitting a straight-up 
 * number might not cover the full bet spread at higher levels), the level remains the SAME.
 * - "Session High": If a win pushes the total bankroll to a new high, the progression immediately resets back to Level 1.
 * * The Full Bet Progression in details:
 * - Initial Bets (Level 1): $1 Straight up on 4, 16, 34; $2 Split on 12/15, 24/27, 33/36; 
 * $3 Street on 7, 19, 28; $8 on the 2nd Column. (Total base bet: $26)
 * - Progression: Linear addition of the base bet per level. 
 * - Level 2: Double all base bets.
 * - Level 3: Add the original base bet amount to Level 2 (e.g., $3 for straight-up, $6 for split, etc.).
 * - Level N formula: Base Amount * N.
 * * The Goal:
 * - Target profit is $50. Once the bankroll is at or above starting bankroll + $50, betting stops.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Session Goal: Stop if we've reached +$50 profit target
    if (bankroll >= config.startingBankroll + 50000) {
        return [];
    }

    // 2. Initialize State
    if (state.highestBankroll === undefined) {
        state.highestBankroll = bankroll;
    }
    if (state.level === undefined) {
        state.level = 1;
    }

    // 3. Evaluate previous spin to update progression state
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];

        // Check for new session high
        if (bankroll > state.highestBankroll) {
            state.highestBankroll = bankroll;
            state.level = 1;
        } else {
            // Check for total loss. 
            // All numbers covered by the strategy's layout:
            const coveredNumbers = [
                4, 16, 34,                                  // Straights
                12, 15, 24, 27, 33, 36,                     // Splits
                7, 8, 9, 19, 20, 21, 28, 29, 30,            // Streets
                2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35 // 2nd Column
            ];
            
            // If the winning number is NOT in the covered list, it's a total loss
            if (!coveredNumbers.includes(lastSpin.winningNumber)) {
                state.level++;
            }
            // Note: If it's a partial/minor loss (number hits but net loss), level stays the same.
        }
    }

    // 4. Calculate raw bet amounts based on current progression level
    let straightAmt = 1 * state.level;
    let splitAmt = 2 * state.level;
    let streetAmt = 3 * state.level;
    let colAmt = 8 * state.level;

    // 5. Clamp to defined limits (Crucial constraint)
    straightAmt = Math.max(straightAmt, config.betLimits.min);
    straightAmt = Math.min(straightAmt, config.betLimits.max);

    splitAmt = Math.max(splitAmt, config.betLimits.min);
    splitAmt = Math.min(splitAmt, config.betLimits.max);

    streetAmt = Math.max(streetAmt, config.betLimits.min);
    streetAmt = Math.min(streetAmt, config.betLimits.max);

    colAmt = Math.max(colAmt, config.betLimits.minOutside);
    colAmt = Math.min(colAmt, config.betLimits.max);

    // 6. Build and Return Bet Array
    const bets = [];

    // Straight up bets
    [4, 16, 34].forEach(num => {
        bets.push({ type: 'number', value: num, amount: straightAmt });
    });

    // Split bets
    [[12, 15], [24, 27], [33, 36]].forEach(split => {
        bets.push({ type: 'split', value: split, amount: splitAmt });
    });

    // Street bets
    [7, 19, 28].forEach(street => {
        bets.push({ type: 'street', value: street, amount: streetAmt });
    });

    // Column bet (2nd column)
    bets.push({ type: 'column', value: 2, amount: colAmt });

    return bets;
}