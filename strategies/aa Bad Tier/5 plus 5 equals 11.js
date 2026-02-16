/**
 * Strategy: "5 + 5 = 11" (2 Dozen + Jackpot Column)
 * * Source: 
 * Video: "A Smart 2-Dozen Roulette System With a Jackpot Twist"
 * Channel: Casino Matchmaker
 * URL: https://www.youtube.com/watch?v=Xf9xR4ybWB8
 * * The Logic:
 * This strategy covers roughly 86% of the table using a weighted coverage method.
 * - Bet 1: 5 Units on 1st Dozen (1-12)
 * - Bet 2: 5 Units on 2nd Dozen (13-24)
 * - Bet 3: 3 Units on Top Column (Column 3: 3, 6, 9... 36)
 * * This creates 4 outcome types:
 * 1. Jackpot Win: Number is in Dozen 1 or 2 AND Column 3 (e.g., 6, 12). Big Profit.
 * 2. Regular Win: Number is in Dozen 1 or 2 BUT NOT Column 3. Small Profit.
 * 3. Partial Loss: Number is in Dozen 3 AND Column 3 (27, 30, 33, 36). Small Loss.
 * 4. "Whack" (Total Loss): Number is in Dozen 3 (not Col 3) OR Zero. Full Loss.
 * * The Progression (Recovery):
 * - After a Partial Loss: Repeat bet and ADD 1 Unit to each position.
 * - After a "Whack" (Total Loss): Repeat bet and ADD 2 Units to each position.
 * - Reset Condition: Reset to base units immediately upon reaching a new Session High bankroll (Profit).
 * * The Goal:
 * Grind small wins and hit "Jackpot" numbers to reach a profit target, then reset.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & UNIT SIZING ---
    // The strategy assumes a 5-5-3 ratio. We use the 'min' limit as our base chip.
    // Note: If minOutside is high (e.g., 5), we ensure the smallest bet (the 3-unit one) meets it.
    const baseChip = config.betLimits.min || 1; 

    // Define base unit counts as per video strategy
    const baseUnitsDoz = 5;
    const baseUnitsCol = 3;

    // --- 2. INITIALIZE STATE ---
    if (state.unitsToAdd === undefined) state.unitsToAdd = 0;
    if (state.sessionHigh === undefined) state.sessionHigh = bankroll;

    // Update Session High (Reset trigger)
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
        state.unitsToAdd = 0; // Reset progression on profit
    }

    // --- 3. PROCESS HISTORY (Determining Progression) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Reset calculation if we just hit a new high (already handled above), 
        // otherwise calculate outcome of previous spin to determine next bet size.
        if (bankroll < state.sessionHigh) {
            
            // Logic Definitions
            const isDoz1 = num >= 1 && num <= 12;
            const isDoz2 = num >= 13 && num <= 24;
            const isDoz3 = num >= 25 && num <= 36;
            const isCol3 = (num !== 0 && num % 3 === 0);
            const isZero = num === 0 || num === '00';

            // Outcome Types
            // 1. Partial Loss: It landed in Dozen 3, but we saved some money because it was Column 3 (27,30,33,36)
            const isPartialLoss = isDoz3 && isCol3;

            // 2. Whack: We missed everything. (Dozen 3 non-column, or Zero)
            const isWhack = isZero || (isDoz3 && !isCol3);

            // Apply Progression Rules
            if (isWhack) {
                state.unitsToAdd += 2; // Add 2 units to every bet
            } else if (isPartialLoss) {
                state.unitsToAdd += 1; // Add 1 unit to every bet
            } 
            // Note: Jackpot wins and Regular wins do not increase bet size. 
            // They continue at current level until bankroll > sessionHigh triggers reset.
        }
    }

    // --- 4. CALCULATE BET AMOUNTS ---
    // The progression adds raw units to the base count.
    // e.g. Base is 5. After partial loss (+1), it becomes 6 units.
    let unitsDoz = baseUnitsDoz + state.unitsToAdd;
    let unitsCol = baseUnitsCol + state.unitsToAdd;

    let amountDoz = unitsDoz * baseChip;
    let amountCol = unitsCol * baseChip;

    // --- 5. CLAMP TO LIMITS ---
    // Ensure we meet table minimums (especially for the smaller Column bet)
    // and do not exceed table maximums.
    const minBet = config.betLimits.minOutside || config.betLimits.min;
    
    amountDoz = Math.max(amountDoz, minBet);
    amountCol = Math.max(amountCol, minBet); // This might skew the 5-5-3 ratio slightly if min is high, but makes it legal.

    amountDoz = Math.min(amountDoz, config.betLimits.max);
    amountCol = Math.min(amountCol, config.betLimits.max);

    // --- 6. CONSTRUCT BETS ---
    // Dozen 1 (1st 12), Dozen 2 (2nd 12), Column 3 (Top row usually labelled 2 to 1 on table, math is %3==0)
    
    // Safety check: if we are hitting max limits, the strategy might be failing, but we still place bets.
    return [
        { type: 'dozen', value: 1, amount: amountDoz },  // 1st Dozen
        { type: 'dozen', value: 2, amount: amountDoz },  // 2nd Dozen
        { type: 'column', value: 3, amount: amountCol }  // 3rd Column (3, 6, 9...)
    ];
}