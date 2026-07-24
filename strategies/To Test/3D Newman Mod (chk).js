/**
 * STRATEGY: 3D Newman Mod (Bill Newman Modification of 3D Roulette)
 * * Source: https://www.youtube.com/watch?v=xM45b2HJMKE
 * Channel: The Roulette Master
 * * LOGIC:
 * This strategy is a weighted "Low Side" coverage system. It places two concurrent 
 * bets to cover the lower half of the table with an overlap on numbers 1-12.
 * - Bet 1: 'low' (Numbers 1-18) - 2 units
 * - Bet 2: 'dozen' (Value 1: Numbers 1-12) - 1 unit
 * * WIN CONDITIONS:
 * - Number 1-12: Both bets win (The "Jackpot").
 * - Number 13-18: 'low' wins, 'dozen' loses (Small profit).
 * - Number 19-36 or 0/00: Both bets lose.
 * * PROGRESSION:
 * This is a linear (non-doubling) progression designed for safety.
 * 1. Start with a base unit (e.g., $10). Initial bet: $20 on Low, $10 on Dozen 1.
 * 2. On any LOSS (where total bankroll is less than the session peak):
 * - Increase the 'low' bet by 2 units.
 * - Increase the 'dozen' bet by 1 unit.
 * 3. On a WIN:
 * - If the current bankroll exceeds the "Session Peak" (Session Profit reached), 
 * reset bets to the base unit (2 units / 1 unit).
 * - If bankroll is still below the Session Peak, keep the bet amounts the same 
 * as the previous spin to continue the recovery.
 * * GOAL:
 * To reach a new "Session Peak" in bankroll, then reset and repeat.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (state.sessionPeak === undefined) {
        state.sessionPeak = bankroll;
        state.unitScale = 1; // Multiplier for the base units
    }

    // 2. Determine Base Units from Config
    // Newman uses a 2:1 ratio. We ensure the smaller unit meets the outside minimum.
    const baseUnit = config.betLimits.minOutside;
    
    // 3. Update State based on previous result
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        
        // Check if we hit a new peak
        if (bankroll > state.sessionPeak) {
            state.sessionPeak = bankroll;
            state.unitScale = 1; // Reset progression
        } else {
            // Determine if the last spin was a total loss or didn't reach session profit
            // Newman Logic: If we haven't reached a new peak, we either increase or stay flat.
            
            // Logic for a "Loss" (Total miss: 19-36 or 0)
            const num = lastResult.winningNumber;
            const isLoss = (num > 18 || num === 0);

            if (isLoss) {
                // Increase progression scale
                state.unitScale++;
            } 
            // Note: If we won (1-18) but didn't hit session peak, Newman stays at current bet
        }
    }

    // 4. Calculate Bet Amounts
    let lowAmount = (baseUnit * 2) * state.unitScale;
    let dozenAmount = baseUnit * state.unitScale;

    // 5. Clamp to Table Limits
    lowAmount = Math.min(Math.max(lowAmount, config.betLimits.minOutside), config.betLimits.max);
    dozenAmount = Math.min(Math.max(dozenAmount, config.betLimits.minOutside), config.betLimits.max);

    // 6. Check if bankroll can afford the bet
    if (bankroll < (lowAmount + dozenAmount)) {
        // Not enough funds to continue progression, try to bet remaining or stop
        if (bankroll >= (config.betLimits.minOutside * 3)) {
             // Scale down to whatever is left proportionally if possible
             let ratio = bankroll / (lowAmount + dozenAmount);
             lowAmount = Math.floor((lowAmount * ratio) / 5) * 5; // Round to nearest 5
             dozenAmount = Math.floor((dozenAmount * ratio) / 5) * 5;
        } else {
            return null; // Bust
        }
    }

    // 7. Return Bet Objects
    return [
        {
            type: 'low',
            amount: lowAmount,
            comment: `Progression Level: ${state.unitScale}`
        },
        {
            type: 'dozen',
            value: 1,
            amount: dozenAmount
        }
    ];
}