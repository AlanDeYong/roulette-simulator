
/**
 * STRATEGY: Modified CYA (Cover Your Ass)
 * * SOURCE:
 * - Video: "DAY 51: How to Win Big at Roulette – Guaranteed! (Except When You Lose)"
 * - Channel: ALL ON BLACK
 * - URL: https://www.youtube.com/watch?v=WcHkJB5cBE8
 * * THE LOGIC:
 * This strategy is a "Grind" strategy that covers a massive portion of the board to smooth out variance.
 * It uses a combination of overlapping Corners and a heavy Column bet to level out payouts.
 * * 1. Inside Bets: 9 Overlapping Corners covering the seam between Column 1 & 2.
 * - Corners starting at: 4, 7, 10, 13, 16, 19, 22, 25, 28.
 * - These cover numbers 4 through 32 in Columns 1 & 2.
 * * 2. Outside/Overwatch Bet: Column 3.
 * - In the "Modified" version described in the video, this bet is weighted heavier (6 units)
 * to ensure that a Column 3 hit pays roughly the same as an Inside hit.
 * * BETTING RATIO:
 * - 1 Unit per Corner (9 units total)
 * - 6 Units on Column 3
 * - Total Base Bet: 15 Units
 * * PROGRESSION (The 3x Recovery):
 * - The video explicitly mentions a "3x" progression to recover losses quickly.
 * - Logic: 
 * - If the previous spin resulted in a NET LOSS to the bankroll, increase multiplier (1x -> 3x -> 9x).
 * - If the previous spin resulted in a NET GAIN (profit), reset to base bet (1x).
 * - Safety: If the progression exceeds the defined max tier (due to table limits or bankruptcy risk), it resets.
 * * CAVEATS:
 * - "Partial Losses": Numbers 4, 5, 31, 32 are covered by only one corner, resulting in a partial loss.
 * - Zeros are a total loss.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & SETUP ---
    
    // Define the progression multipliers (Aggressive 3x as per video)
    const MULTIPLIERS = [1, 3, 9, 27];
    
    // Define the Betting Schema
    // Corner bets identified by their top-left number
    const corners = [4, 7, 10, 13, 16, 19, 22, 25, 28];
    const overwatchColumn = 3;
    
    // Ratio: 1 unit on corners, 6 units on column
    const cornerRatio = 1;
    const colRatio = 6;

    // --- 2. STATE INITIALIZATION ---
    if (state.tier === undefined) state.tier = 0;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;

    // --- 3. ANALYZE PREVIOUS RESULT (Trigger Logic) ---
    if (spinHistory.length > 0) {
        const profit = bankroll - state.lastBankroll;

        if (profit > 0) {
            // WIN: Reset to base
            state.tier = 0;
        } else {
            // LOSS (or break-even/partial loss): Increase progression
            state.tier++;
            
            // Safety cap: If we run out of multipliers, reset to 0 to preserve remaining funds
            if (state.tier >= MULTIPLIERS.length) {
                state.tier = 0;
            }
        }
    }

    // Update state for next turn
    state.lastBankroll = bankroll;

    // --- 4. CALCULATE BET AMOUNTS ---
    
    // Determine the base unit size. 
    // We use the Inside Minimum as the base unit (usually $1 or $2).
    // If the table minimum is high, this strategy gets expensive fast.
    const baseUnit = config.betLimits.min;
    
    // Current multiplier based on progression tier
    const currentMultiplier = MULTIPLIERS[state.tier];

    // Calculate specific bet amounts
    let cornerAmount = baseUnit * cornerRatio * currentMultiplier;
    let colAmount = baseUnit * colRatio * currentMultiplier;

    // --- 5. CHECK LIMITS & AFFORDABILITY ---

    // 5a. Clamp to Table Maximums
    // Note: We clamp individual bets, not the total. 
    if (cornerAmount > config.betLimits.max) cornerAmount = config.betLimits.max;
    if (colAmount > config.betLimits.max) colAmount = config.betLimits.max;

    // 5b. Check Table Minimums for Outside Bets
    // Columns often have a higher minimum ($5) than inside bets ($1).
    if (colAmount < config.betLimits.minOutside) {
        colAmount = config.betLimits.minOutside;
        // If we force the column up, we should technically scale the corners to match the ratio,
        // but to keep it safe, we just ensure legal play.
    }

    // 5c. Bankroll Check (All-in protection)
    // Calculate total required
    const totalRequired = (corners.length * cornerAmount) + colAmount;
    
    // If we can't afford the calculated bet, we have two choices: 
    // Stop betting (return null) or Reset to base tier.
    // Here we reset to Tier 0 if we can't afford the aggressive bet.
    if (totalRequired > bankroll) {
        state.tier = 0; // Reset logic
        // Recalculate for base tier
        cornerAmount = baseUnit * cornerRatio;
        colAmount = baseUnit * colRatio;
        
        // If we STILL can't afford base tier, stop betting.
        if (((corners.length * cornerAmount) + colAmount) > bankroll) {
            return []; 
        }
    }

    // --- 6. CONSTRUCT BET ARRAY ---
    const bets = [];

    // Add Inside Bets (Corners)
    corners.forEach(cornerVal => {
        bets.push({
            type: 'corner',
            value: cornerVal,
            amount: cornerAmount
        });
    });

    // Add Outside Bet (Overwatch Column)
    bets.push({
        type: 'column',
        value: overwatchColumn,
        amount: colAmount
    });

    return bets;

}