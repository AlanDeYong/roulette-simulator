
/**
 * STRATEGY: The 5X Roulette System
 * * SOURCE:
 * - Video: "ROULETTE DR'S BEST! (CRAZY PROFITS)"
 * - Channel: Roulette Master TV
 * - URL: https://www.youtube.com/watch?v=gpZCeOsjc5A
 * * THE LOGIC:
 * This is a high-volatility "Jackpot Hunting" strategy.
 * 1. We select 5 specific "Corner" bets (covering 4 numbers each).
 * 2. Inside EACH of those corners, we place a "Straight Up" bet on one specific number.
 * This creates a "Jackpot" number: if the ball lands on that specific number, 
 * we win both the Corner payout (8:1) and the Straight Up payout (35:1).
 * * THE BET CONFIGURATION (Total 10 Bets per spin):
 * - 5x Corner Bets (Base unit x 2)
 * - 5x Straight Bets (Base unit x 1) inside those corners.
 * * THE PROGRESSION (Martingale-style):
 * - After a LOSS: Double the bet amounts for the next spin.
 * - After a WIN: Reset to the base unit.
 * - SAFETY CAP: The video suggests a cap (e.g., $600 total bet). 
 * If the required bet exceeds the table limit or a defined safety threshold, we reset to base.
 * * THE GOAL:
 * To hit a "Jackpot" number (Straight + Corner) during a high-bet progression level 
 * for massive recovery and profit, then cash out.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the 5 sets of (Corner + Jackpot Number).
    // Note: For 'corner', the value is typically the top-left (lowest) number of the 4-number block.
    // Example: Corner 1 covers 1, 2, 4, 5.
    const betSets = [
        { corner: 1,  jackpot: 5 },   // Corner covers 1,2,4,5. Jackpot on 5.
        { corner: 8,  jackpot: 8 },   // Corner covers 8,9,11,12. Jackpot on 8.
        { corner: 17, jackpot: 20 },  // Corner covers 17,18,20,21. Jackpot on 20.
        { corner: 26, jackpot: 26 },  // Corner covers 26,27,29,30. Jackpot on 26.
        { corner: 32, jackpot: 32 }   // Corner covers 32,33,35,36. Jackpot on 32.
    ];

    // Helper to calculate total numbers covered (for win checking)
    // We need to know if the last result was a win to trigger reset.
    // This generates a Set of all winning numbers:
    if (!state.winningNumbers) {
        state.winningNumbers = new Set();
        betSets.forEach(set => {
            // A corner starting at 'c' covers c, c+1, c+3, c+4 (standard layout logic)
            // Note: This logic assumes standard board layout. 
            // We manually map them for safety to avoid board layout calculation errors:
            if(set.corner === 1)  [1,2,4,5].forEach(n => state.winningNumbers.add(n));
            if(set.corner === 8)  [8,9,11,12].forEach(n => state.winningNumbers.add(n));
            if(set.corner === 17) [17,18,20,21].forEach(n => state.winningNumbers.add(n));
            if(set.corner === 26) [26,27,29,30].forEach(n => state.winningNumbers.add(n));
            if(set.corner === 32) [32,33,35,36].forEach(n => state.winningNumbers.add(n));
        });
    }

    // Initialize progression state
    if (state.multiplier === undefined) state.multiplier = 1;

    // --- 2. PROGRESSION LOGIC ---

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Did we win?
        // Check if the last number is in our covered "winningNumbers" Set
        if (state.winningNumbers.has(lastNumber)) {
            // WIN: Reset progression
            state.multiplier = 1;
        } else {
            // LOSS: Double progression (Martingale)
            state.multiplier *= 2;
        }
    }

    // --- 3. CALCULATE BET AMOUNTS ---

    // Define base unit (Use config min or a custom base like 5)
    // The video uses $5 straights and $10 corners. 
    // We will assume 1 Unit = config.betLimits.min.
    const baseUnit = config.betLimits.min; 

    // Calculate specific amounts
    let straightAmount = baseUnit * state.multiplier;
    let cornerAmount = (baseUnit * 2) * state.multiplier; // Corner is double the straight bet

    // --- 4. SAFETY CHECKS & LIMITS ---

    // Check against Table Max Limit
    // If our progression forces a bet higher than the max allowed, we must reset.
    if (cornerAmount > config.betLimits.max) {
        // console.log("Max bet limit reached. Resetting progression.");
        state.multiplier = 1;
        straightAmount = baseUnit;
        cornerAmount = baseUnit * 2;
    }

    // Optional: Global Safety Cap (Video mentioned $600 max total bet)
    // Total bet here is (5 * straight) + (5 * corner) = 15 units total.
    const totalBetSize = (5 * straightAmount) + (5 * cornerAmount);
    // If you want to enforce the video's specific $600 cap, uncomment below:
    /*
    if (totalBetSize > 600) {
        state.multiplier = 1;
        straightAmount = baseUnit;
        cornerAmount = baseUnit * 2;
    }
    */

    // Final Clamp (Just in case calculation floats slightly off or min limits vary)
    straightAmount = Math.max(straightAmount, config.betLimits.min);
    cornerAmount = Math.max(cornerAmount, config.betLimits.min); // Corners often have same min as straights inside
    
    // Ensure we don't breach max even after reset logic
    straightAmount = Math.min(straightAmount, config.betLimits.max);
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    // --- 5. PLACE BETS ---

    const bets = [];

    betSets.forEach(set => {
        // 1. The Corner Bet
        bets.push({
            type: 'corner',
            value: set.corner,
            amount: cornerAmount
        });

        // 2. The Jackpot Straight Up Bet
        bets.push({
            type: 'number',
            value: set.jackpot,
            amount: straightAmount
        });
    });

    return bets;

}