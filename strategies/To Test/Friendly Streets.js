/**
 * Strategy: Friendly Streets Roulette System
 * * Source: "The Roulette Master" - FRIENDLY STREETS ROULETTE RECOVERS LOSSES LIKE A CHAMP!
 * Video URL: https://www.youtube.com/watch?v=fXbZUfX3RJk
 * * --- THE LOGIC ---
 * 1. Scope: The strategy looks at the last 9 numbers (the "Window").
 * 2. Trigger: For every unique number in that history window, identifying its "Street" (row of 3).
 * 3. Selection: Within those identified streets, bet on the 2 numbers that are NOT the number that appeared in history.
 * - Example: If 23 is in history, the street is (22, 23, 24). We bet on 22 and 24.
 * - Note: If multiple numbers from the same street appear in history, use the MOST RECENT one to determine the exclusion.
 * 4. Insurance: Always place a bet on 0 (and 00 if applicable).
 * * --- THE PROGRESSION ---
 * 1. Base Unit: Starts at config.betLimits.min (Inside bet minimum).
 * 2. On Loss: Increase the bet unit by 1 for ALL numbers.
 * 3. On Win:
 * - If the session is in overall profit (Net > 0), RESET unit to base.
 * - If still in negative, maintain the unit size (or decrease by 1 if preferred, but video implies aggressive recovery until profit).
 * - Update Coverage: Remove the number that just won, and add the missing neighbor back in.
 * * --- THE GOAL ---
 * Recover losses quickly using broad street coverage and aggressive unit increases, resetting immediately upon reaching a session high/profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    const LOOKBACK_WINDOW = 9;
    const MIN_INSIDE = config.betLimits.min || 1;
    const MAX_BET = config.betLimits.max || 500;

    // Initialize persistent state
    if (state.unitSize === undefined) state.unitSize = MIN_INSIDE;
    if (state.sessionStartBankroll === undefined) state.sessionStartBankroll = bankroll;
    if (state.maxBankroll === undefined) state.maxBankroll = bankroll;

    // Update High Water Mark
    if (bankroll > state.maxBankroll) state.maxBankroll = bankroll;

    // --- 2. PROGRESSION LOGIC ---
    // Check result of previous spin (if strictly needed for progression changes)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        // Calculate last round profit roughly (current bankroll - previous bankroll would be better if stored, 
        // but we can infer from session start).
        
        const currentProfit = bankroll - state.sessionStartBankroll;

        if (currentProfit > 0) {
            // TARGET REACHED: Reset system
            state.unitSize = MIN_INSIDE;
            // Optional: Update session start to treat this as a new "session"
            state.sessionStartBankroll = bankroll; 
        } else {
            // RECOVERY MODE
            // Determine if last spin was a win or loss for OUR specific bets.
            // Since we don't have the explicit 'last bet' object here easily without complex state, 
            // we look at bankroll trend.
            // However, the simplest implementation of the video's logic regarding units:
            // "When we lose, go up a unit."
            
            // We need to know if we won the PREVIOUS spin. 
            // We can check if bankroll increased.
            const previousBankroll = state.lastBankroll || state.sessionStartBankroll;
            const wonLastSpin = bankroll > previousBankroll;

            if (!wonLastSpin) {
                state.unitSize += MIN_INSIDE; // Increase by 1 unit
            } else {
                // Video Logic: If we won but aren't in total profit yet, 
                // he often maintains or slightly reduces. 
                // For safety code: we maintain unless profit > 0 (handled above).
            }
        }
    }
    
    // Store current bankroll for next spin comparison
    state.lastBankroll = bankroll;

    // Clamp Unit Size to Limits
    // Note: We clamp the specific bet amount later, but good to keep unit sane.
    if (state.unitSize > MAX_BET) state.unitSize = MAX_BET;


    // --- 3. BET SELECTION LOGIC ---
    
    // Helper: Get numbers in a specific street (1-3, 4-6, etc.)
    const getStreetNumbers = (streetIndex) => {
        // Street Index 1 = numbers 1, 2, 3
        const start = (streetIndex - 1) * 3 + 1;
        return [start, start + 1, start + 2];
    };

    // Helper: Get Street Index from a number
    const getStreetIndex = (num) => Math.ceil(num / 3);

    // Get relevant history
    // Filter out 0/00 from history for street calculation purposes
    const recentSpins = spinHistory
        .slice(-LOOKBACK_WINDOW)
        .map(s => typeof s === 'object' ? s.winningNumber : s) // Handle object or raw number
        .filter(n => n !== 0 && n !== 37 && n !== '00'); // Exclude zeros

    const numbersToBet = new Set();
    const processedStreets = new Set();

    // Iterate backwards (newest to oldest) to prioritize recent hits
    // The strategy says: Look at the number that hit, bet the OTHER two in that street.
    for (let i = recentSpins.length - 1; i >= 0; i--) {
        const historyNum = recentSpins[i];
        const streetIdx = getStreetIndex(historyNum);

        // We only process the MOST RECENT appearance of a street to decide exclusion
        if (!processedStreets.has(streetIdx)) {
            const streetNumbers = getStreetNumbers(streetIdx);
            
            // Add the neighbors (numbers in street that are NOT the history number)
            streetNumbers.forEach(n => {
                if (n !== historyNum && n <= 36) { // Ensure valid range
                    numbersToBet.add(n);
                }
            });
            
            processedStreets.add(streetIdx);
        }
    }

    // Always bet on Zero (Video: "Always have one on zero zero")
    numbersToBet.add(0);
    // Note: If simulation supports '00' (often represented as 37 in some sims), add it here.
    // numbersToBet.add(37); 


    // --- 4. CONSTRUCT BETS ---
    const bets = [];

    numbersToBet.forEach(num => {
        // Clamp bet amount to config limits
        let finalAmount = Math.max(state.unitSize, MIN_INSIDE);
        finalAmount = Math.min(finalAmount, MAX_BET);

        bets.push({
            type: 'number', // 'number' is the standard Inside Bet type for straight up
            value: num,
            amount: finalAmount
        });
    });

    return bets;
}