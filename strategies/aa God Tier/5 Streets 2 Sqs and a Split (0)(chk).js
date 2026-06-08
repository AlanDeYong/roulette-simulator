/**
 * @description Roulette Layout Coverage Strategy
 * * @source
 * - URL: Not Provided
 * - Channel: Not Provided
 * * @logic
 * - Triggers: Bets are placed on every single spin.
 * - Conditions: Tracks the session's peak bankroll. If the current bankroll drops below 
 * the peak, the progression increases. Once the bankroll returns to or exceeds the 
 * session peak profit, the progression resets to the base level.
 * * @progression
 * - Initial Bet Layout (10 total base units distributed):
 * - 5 Streets x 1 unit each (Values: 1, 4, 7, 10, 13)
 * - 2 Corners x 2 units each (Values: 16, 19)
 * - 1 Split x 1 unit (Value: [25, 26])
 * - 1 Straight Up x 1 unit on Number 0
 * - On Loss / No Peak Reached: Multiplier increases by +1 (equivalent to adding 
 * the initial base bet amounts to each position, honoring the 'base' increment mode).
 * - On Win / Peak Profit Reached: Multiplier resets to 1.
 * * @goal
 * - Continually hit or exceed the rolling session peak bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Tracking
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
    }
    if (state.multiplier === undefined) {
        state.multiplier = 1;
    }

    // Update peak bankroll and handle session reset/progression logic
    if (bankroll >= state.peakBankroll) {
        state.peakBankroll = bankroll;
        state.multiplier = 1;
    } else {
        // Increment progression step since bankroll is below peak
        state.multiplier += 1;
    }

    // 2. Base Unit Identification (Inside Bets)
    const baseUnit = config.betLimits.min;

    // 3. Define Strategy Base Multipliers per Bet Type
    const betLayout = [
        { type: 'street', value: 1,  baseUnits: 1 },
        { type: 'street', value: 4,  baseUnits: 1 },
        { type: 'street', value: 7,  baseUnits: 1 },
        { type: 'street', value: 10, baseUnits: 1 },
        { type: 'street', value: 13, baseUnits: 1 },
        { type: 'corner', value: 16, baseUnits: 2 },
        { type: 'corner', value: 19, baseUnits: 2 },
        { type: 'split',  value: [25, 26], baseUnits: 1 },
        { type: 'number', value: 0,  baseUnits: 1 }
    ];

    const bets = [];

    // 4. Construct and Clamp Every Single Bet Placement
    for (let i = 0; i < betLayout.length; i++) {
        const item = betLayout[i];
        
        // Calculate bet amount based on the layout's base configuration and current multiplier step
        let amount = baseUnit * item.baseUnits * state.multiplier;

        // Clamp to table limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: item.type,
            value: item.value,
            amount: amount
        });
    }

    return bets;
}