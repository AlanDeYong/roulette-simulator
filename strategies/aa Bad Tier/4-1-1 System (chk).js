/**
 * THE 4-1-1 SYSTEM
 * 
 * Source:
 * Channel: The Roulette Master
 * Video:  * https://youtu.be/SLdMXugz3kQ?si=Kgn00X6wKP8YvmFL
 *
 * Logic:
 * This strategy relies on a specific ratio of bets placed on outside positions:
 * 1. 4 Units on a Color (e.g., Black)
 * 2. 1 Unit on a Dozen (e.g., 3rd 12)
 * 3. 1 Unit on a Column (e.g., 2nd Column)
 * 
 * The "4-1-1" refers to the unit distribution (4:1:1). The goal is to hit overlapping 
 * zones where multiple bets pay out simultaneously, creating a "Jackpot" effect.
 * 
 * Bet Progression (Modified Martingale):
 * 1. Start at Base Level (Level 1).
 * 2. If the spin result does not lead to a new session high in bankroll, the level is maintained.
 * 3. If two consecutive spins are "Losses" (Total spin payout < Total spin stake) AND the 
 *    bankroll is not at a session high, the level doubles (1 -> 2 -> 4 -> 8...).
 * 4. Once a new session high (Session Profit) is achieved, the progression resets to Level 1.
 * 
 * Goal:
 * Achieve a target profit by cycling through streaks and resetting after "Jackpots" or 
 * recovery wins that bring the bankroll to a new peak.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // 1. Initialization
    if (state.level === undefined) {
        state.level = 1;
        state.consecutiveLosses = 0;
        state.maxBankroll = bankroll;
        // The targets used in the video demo
        state.targetColor = 'black'; 
        state.targetDozen = 3;
        state.targetColumn = 2;
    }

    // 2. Logic Analysis (Process previous spin result)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Calculate the stake of the last spin to determine if it was a loss
        const lastUnit = minOutside * (state.level / (state.level > 1 ? 2 : 1)); // Approximate previous level
        const lastStake = lastUnit * 6; // (4 + 1 + 1)

        // Check for Session Profit (New Peak)
        if (bankroll > state.maxBankroll) {
            state.maxBankroll = bankroll;
            state.level = 1;
            state.consecutiveLosses = 0;
        } else {
            // Determine if the last spin was a net loss
            // In this sim, we can check if bankroll decreased or simply count losses
            // The 4-1-1 progression usually doubles after 2 failed attempts to reach profit
            const lastWinAmount = lastSpin.payout || 0; 
            
            if (lastWinAmount < lastStake) {
                state.consecutiveLosses++;
            } else {
                // A partial win doesn't reset the level, but resets the consecutive loss counter
                // as we need 2 losses IN A ROW to double.
                state.consecutiveLosses = 0;
            }

            // Double Level after 2 consecutive losses
            if (state.consecutiveLosses >= 2) {
                state.level *= 2;
                state.consecutiveLosses = 0;
            }
        }
    }

    // 3. Calculate Bet Amounts based on Level
    const unit = minOutside * state.level;
    
    let colorAmt = unit * 4;
    let dozenAmt = unit * 1;
    let columnAmt = unit * 1;

    // 4. Respect Bet Limits
    colorAmt = Math.min(Math.max(colorAmt, minOutside), maxBet);
    dozenAmt = Math.min(Math.max(dozenAmt, minOutside), maxBet);
    columnAmt = Math.min(Math.max(columnAmt, minOutside), maxBet);

    // 5. Final check: Ensure we have enough bankroll to place the full 4-1-1 set
    const totalRequired = colorAmt + dozenAmt + columnAmt;
    if (bankroll < totalRequired) {
        // If we can't afford the progression, reset to base to try and survive
        state.level = 1;
        state.consecutiveLosses = 0;
        const baseUnit = minOutside;
        return [
            { type: state.targetColor, amount: baseUnit * 4 },
            { type: 'dozen', value: state.targetDozen, amount: baseUnit },
            { type: 'column', value: state.targetColumn, amount: baseUnit }
        ];
    }

    // 6. Execute Bets
    return [
        { 
            type: state.targetColor, 
            amount: colorAmt 
        },
        { 
            type: 'dozen', 
            value: state.targetDozen, 
            amount: dozenAmt 
        },
        { 
            type: 'column', 
            value: state.targetColumn, 
            amount: columnAmt 
        }
    ];
}