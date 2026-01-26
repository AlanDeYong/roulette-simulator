/**
 * STRATEGY: 5 + 5 = 11 (Smart 2-Dozen System with Jackpot Twist)
 * * SOURCE:
 * - Video: https://www.youtube.com/watch?v=Xf9xR4ybWB8
 * - Channel: Casino Matchmaker
 * * THE LOGIC:
 * This strategy covers ~64% of the board with a tiered payout structure.
 * It places bets on Dozen 1, Dozen 2, and Column 3 (The Top Column).
 * * OUTCOMES (based on 13 unit total bet):
 * 1. Jackpot Win (D1 or D2 + Col 3): Net +11 units.
 * 2. Regular Win (D1 or D2, No Col 3): Net +2 units.
 * 3. Partial Loss (D3 + Col 3): Net -4 units.
 * 4. Complete Whack (D3 No Col 3, or Zero): Net -13 units.
 * * THE PROGRESSION:
 * - Base Bet: 5 units on Dozen 1, 5 units on Dozen 2, 3 units on Column 3.
 * - On Partial Loss: Increase bet multiplier by +1 unit.
 * - On Complete Whack: Increase bet multiplier by +2 units.
 * - On Win (Regular or Jackpot): If Bankroll >= Session High, Reset to Base. Otherwise, hold current level.
 * * THE GOAL:
 * - Reach a new session high in bankroll and reset the progression to minimums.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & HELPER VALUES ---
    
    // We need to ensure the smallest bet (the 3 portion) meets the table minimum.
    // If minOutside is 5, we can't bet 3. We must scale the base unit up.
    // Scalar calculation: If min is 5, 5/3 = 1.66 -> ceil to 2. Base bets become 10-10-6.
    const minOutside = config.betLimits.minOutside || 1;
    const baseScalar = Math.ceil(minOutside / 3);
    
    // Define the base ratios from the video
    const ratio = { d1: 5, d2: 5, col3: 3 };

    // --- 2. STATE INITIALIZATION ---
    
    if (state.progressionLevel === undefined) state.progressionLevel = 1;
    if (state.highWaterMark === undefined) state.highWaterMark = bankroll;

    // --- 3. PROCESS PREVIOUS SPIN (If it exists) ---
    
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const number = lastSpin.winningNumber; // 0-36

        // Determine which zones hit
        // Dozens: 1-12, 13-24, 25-36
        const inD1 = number >= 1 && number <= 12;
        const inD2 = number >= 13 && number <= 24;
        const inD3 = number >= 25 && number <= 36;
        
        // Column 3: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
        // Mathematically: number % 3 === 0 and number !== 0
        const inCol3 = (number !== 0 && number % 3 === 0);

        // Determine Outcome Type based on video logic
        let outcome = 'loss'; // default

        if (number === 0 || (inD3 && !inCol3)) {
            // Case: Complete Whack (Zero or Dozen 3 excluding the column hit)
            // Lose everything.
            outcome = 'whack';
        } else if (inD3 && inCol3) {
            // Case: Partial Loss (Dozen 3 AND Column 3 e.g., 27, 30, 33, 36)
            // We lose D1/D2 bets, but win Col 3.
            // Math: Lose 10, Win 3*(2:1)=6 + original 3 = 9 return. Net -4.
            outcome = 'partial';
        } else {
            // Case: Win (Jackpot or Regular)
            // Either D1 or D2 hit.
            outcome = 'win';
        }

        // Apply Progression Rules
        if (outcome === 'whack') {
            // Video: "Repeat bet and go up two units"
            state.progressionLevel += 2;
        } else if (outcome === 'partial') {
            // Video: "Repeat bet and add one unit"
            state.progressionLevel += 1;
        } else if (outcome === 'win') {
            // Video: "Reset is session profit reset"
            // If we have recovered to or exceeded our previous high, reset.
            if (bankroll >= state.highWaterMark) {
                state.progressionLevel = 1;
                state.highWaterMark = bankroll; // Update new high
            }
            // If we won but haven't recovered session high, the video implies 
            // maintaining the bet or grinding up. We hold current level here.
        }
    } else {
        // First spin, ensure highWaterMark is accurate
        state.highWaterMark = bankroll;
    }

    // --- 4. CALCULATE BET AMOUNTS ---

    // Calculate raw amounts based on level and base scalar
    // Level 1 with minOutside 1 = Bets 5, 5, 3
    // Level 1 with minOutside 5 = Bets 10, 10, 6 (Scalar is 2)
    const multiplier = state.progressionLevel * baseScalar;

    let betD1 = ratio.d1 * multiplier;
    let betD2 = ratio.d2 * multiplier;
    let betCol3 = ratio.col3 * multiplier;

    // --- 5. CLAMP TO TABLE LIMITS (Safety) ---

    // Ensure we don't exceed max bet allowed
    betD1 = Math.min(betD1, config.betLimits.max);
    betD2 = Math.min(betD2, config.betLimits.max);
    betCol3 = Math.min(betCol3, config.betLimits.max);

    // Ensure we meet minimums (Double check)
    betD1 = Math.max(betD1, config.betLimits.minOutside);
    betD2 = Math.max(betD2, config.betLimits.minOutside);
    betCol3 = Math.max(betCol3, config.betLimits.minOutside);

    // --- 6. RETURN BETS ---

    // If bankroll is too low to cover the calculated bet, return null (stop)
    const totalNeeded = betD1 + betD2 + betCol3;
    if (bankroll < totalNeeded) {
        console.warn("Bankroll insufficient for 5+5=11 strategy progression.");
        return [];
    }

    return [
        { type: 'dozen', value: 1, amount: betD1 },
        { type: 'dozen', value: 2, amount: betD2 },
        { type: 'column', value: 3, amount: betCol3 }
    ];
}