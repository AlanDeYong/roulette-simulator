/**
 * Strategy: The "Tank & Sniper" Method (Heatseeker)
 * Source: The Lucky Felt (https://youtu.be/1goJmxnE5gA)
 * * The Logic:
 * Deploys a "Tank" (a massive 3-unit shield on High numbers 19-36) to absorb damage and 
 * a "Sniper" (a mobile 1-unit bet on a Double Street/Line) that hunts the ball.
 * If the ball lands on a low number that the Sniper didn't cover, the Sniper moves 
 * to the newly hit Double Street and increases its bet size. 
 * * The Progression:
 * - Base setup: Tank = 3 units, Sniper = 1 unit.
 * - Win: If either the Tank or the Sniper hits, the entire progression resets to base.
 * - Loss: The Tank remains static. The Sniper moves to the missed Double Street and adds 1 unit.
 * - Scaling: If the Sniper bet size reaches the Tank bet size (e.g., misses 3 times), 
 * the overall tier scales up. Tier 2 becomes: Tank = 6 units, Sniper = 2 units (scaling to 4, then 6).
 * * The Goal:
 * To grind out consistent small profits while surviving variance. Standard target is a 
 * +20% increase on the starting bankroll (e.g., +$200 on a $1,000 bankroll).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (!state.initialized) {
        state.initialized = true;
        state.tier = 1;          // The overall multiplier tier
        state.sniperStep = 1;    // The internal step of the sniper (1, 2, or 3)
        state.sniperLine = 1;    // The starting Double Street (Line bet covering 1-6)
    }

    // 2. Evaluate Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Define Win Conditions
        const isTankWin = lastSpin >= 19 && lastSpin <= 36;
        const isSniperWin = lastSpin >= state.sniperLine && lastSpin <= (state.sniperLine + 5);

        if (isTankWin || isSniperWin) {
            // Reset progression on any win
            state.tier = 1;
            state.sniperStep = 1;
            state.sniperLine = 1; 
        } else {
            // Loss Condition: Ball dodged the Tank AND the Sniper
            
            // Move the Sniper to the newly hit Double Street (Ignore 0/00)
            if (lastSpin !== 0 && lastSpin !== 37) {
                // Formula to find the starting number of a 6-number line
                state.sniperLine = Math.floor((lastSpin - 1) / 6) * 6 + 1;
            }

            // Advance the Sniper progression
            state.sniperStep++;

            // If Sniper reaches the Tank size, scale the whole Tier
            if (state.sniperStep > 3) {
                state.sniperStep = 1;
                state.tier++;
            }
        }
    }

    // 3. Calculate Bet Amounts
    // Establish a universal base unit from config
    const baseUnit = config.betLimits.min;

    // Tank is strictly 3x the Tier. Sniper scales by Tier and Step.
    let tankAmount = 3 * state.tier * baseUnit;
    let sniperAmount = state.sniperStep * state.tier * baseUnit;

    // 4. Clamp to Config Limits
    // Tank is an Outside bet (High)
    tankAmount = Math.max(tankAmount, config.betLimits.minOutside);
    tankAmount = Math.min(tankAmount, config.betLimits.max);

    // Sniper is an Inside bet (Line/Double Street)
    sniperAmount = Math.max(sniperAmount, config.betLimits.min);
    sniperAmount = Math.min(sniperAmount, config.betLimits.max);

    // 5. Construct and Return Bets
    return [
        { type: 'high', amount: tankAmount },
        { type: 'line', value: state.sniperLine, amount: sniperAmount }
    ];
}