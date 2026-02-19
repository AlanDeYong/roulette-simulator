
/**
 * Strategy: Double Dozen Ladder Up (Roulette Jackpot)
 * * Source: 
 * Video: "WOAAHH!! I MADE $3000 AN HOUR WITH THIS NEW ROULETTE STRATEGY!!"
 * Channel: ROULETTE JACKPOT
 * URL: https://www.youtube.com/watch?v=F8M2hNg1-PY
 * * The Logic:
 * - The player bets on Dozen 1 and Dozen 2 simultaneously.
 * - This covers numbers 1-24 (approx 64% coverage).
 * - 25-36 and 0 are the losing numbers.
 * * The Progression (The "Ladder"):
 * - Base Bet: 1 Unit on Dozen 1, 1 Unit on Dozen 2.
 * - The strategy uses a "Layer" system (1 Layer = 1 Unit).
 * - Triggers based on Previous Result:
 * 1. Hit Dozen 3 (25-36): "Ladder Up" -> Increase by 1 Layer.
 * 2. Hit Zero (0/00): "Solid Miss" -> Increase by 2 Layers.
 * 3. Hit 13, 14, or 15: Special Condition -> Increase by 2 Layers (Even though this is a win on Dozen 2, the author aggressively presses here).
 * 4. Clean Win (Other 1-12, 16-24): 
 * - If the current sequence is in profit, RESET to 1 Layer.
 * - If still recovering losses, maintain current Layer.
 * * The Goal:
 * - Recover losses quickly using the 2:1 payout on two separate spots.
 * - Capitalize on streaks of 1-24.
 * - Reset to base bet once a sequence returns a net profit (Sequence Reset).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const MIN_BET = config.betLimits.minOutside || 5;
    const MAX_BET = config.betLimits.max || 500;
    
    // 2. Initialize State
    if (state.layer === undefined) state.layer = 1;
    if (state.currentSequenceNet === undefined) state.currentSequenceNet = 0; // Track profit/loss of current betting sequence

    // 3. Process Previous Spin (if exists) to adjust Layer
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Calculate the financial result of the *last* spin to update sequence tracking
        // We bet on Dozen 1 and Dozen 2.
        // Cost was 2 * (previous layer * unit). 
        // Win pays 2:1 on the winning dozen.
        
        // Determine what the previous bet amount was likely to be
        // (We rely on state.layer from before the spin, but for safety in simulation 
        // we recalculate what the bet *would* have been to track sequence net)
        // Note: In a live simulator, `state` preserves values across spins.
        
        let profit = 0;
        const prevBetPerDozen = Math.min(Math.max(state.layer * MIN_BET, MIN_BET), MAX_BET);
        const totalWager = prevBetPerDozen * 2;

        if (lastNum >= 1 && lastNum <= 24) {
            // Won (Pays 2:1 on one dozen, other loses. Net result = +1 unit of the bet size)
            // Example: Bet $5 on D1, $5 on D2. Total $10. Hit 5. D1 pays $15 total. Profit $5.
            profit = prevBetPerDozen;
        } else {
            // Lost (Dozen 3 or Zero)
            profit = -totalWager;
        }

        state.currentSequenceNet += profit;

        // --- PROGRESSION LOGIC ---
        
        // Trigger 1: Zeros (Solid Miss) -> Up 2 Layers
        if (lastNum === 0 || lastNum === 37) { // 37 usually maps to 00 in some internal logic, checking for standard 0
             state.layer += 2;
        }
        // Trigger 2: The "13, 14, 15" Rule (Up 2 Layers)
        else if ([13, 14, 15].includes(lastNum)) {
            state.layer += 2;
        }
        // Trigger 3: Dozen 3 (Standard Loss) -> Up 1 Layer
        else if (lastNum >= 25 && lastNum <= 36) {
            state.layer += 1;
        }
        // Trigger 4: Clean Win (1-12 or 16-24 excluding 13-15)
        else {
            // Check for Reset Condition
            // If we are profitable in this sequence, reset.
            if (state.currentSequenceNet > 0) {
                state.layer = 1;
                state.currentSequenceNet = 0; // Reset tracker
            } else {
                // If we are still down, maintain layer (or could increase, but video suggests maintaining/slow ladder)
                // We will hold current layer to attempt recovery
            }
        }
    }

    // 4. Calculate Bet Amounts
    // Ensure layer is at least 1
    state.layer = Math.max(1, state.layer);

    let betAmount = state.layer * MIN_BET;

    // 5. Check Limits & Bankroll
    // Clamp to table maximum
    betAmount = Math.min(betAmount, MAX_BET);
    
    // Check if we can afford the total bet (2 * betAmount)
    // If not, All-In logic: split remaining bankroll by 2
    if ((betAmount * 2) > bankroll) {
        betAmount = Math.floor(bankroll / 2);
    }

    // If we have less than min bet for 2 positions, stop betting or bet min
    if (betAmount < MIN_BET) {
         // Not enough money to play the strategy correctly
         return []; 
    }

    // 6. Return Bets
    // Bet on Dozen 1 (1st 12) and Dozen 2 (2nd 12)
    return [
        { type: 'dozen', value: 1, amount: betAmount },
        { type: 'dozen', value: 2, amount: betAmount }
    ];

}