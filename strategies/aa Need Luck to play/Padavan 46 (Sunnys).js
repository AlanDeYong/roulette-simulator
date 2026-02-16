<<<<<<< HEAD
/**
 * Strategy: Padavan 46 (Sunny's Strategy)
 * Source: The Roulette Master TV (YouTube)
 * Video URL: https://www.youtube.com/watch?v=qLP-CnwMH18
 * * THE LOGIC:
 * This strategy relies on covering specific sections of the board using a combination of Streets and Splits.
 * It targets Streets with 2 Black numbers and covers remaining Red gaps with Splits.
 * * 1. The Setup (Fixed 10-unit bet pattern):
 * - Streets (3 numbers): Bet on rows 4, 10, 13, 22, 28, 31. (These rows contain 2 Black numbers).
 * - Splits (2 numbers): Bet on pure Red/Red splits to cover gaps: 9/12, 16/19, 18/21, 27/30.
 * - Jackpot Numbers: 12 and 30 are covered by BOTH a Street and a Split, paying double if hit.
 * * 2. The Progression (Additive Recovery):
 * - This is NOT a multiplier system. It uses a specific "Add Sequence" to increase bet sizing.
 * - Sequence: [+1, +1, +2, +2, +3, +4, +5, +7, +9, +12, +16]
 * - How it works:
 * - Start with Base Unit (e.g., $1 per spot).
 * - On LOSS: Advance one step in the sequence and ADD that value to the current bet size.
 * (e.g., Start $1. Lose -> Add 1 -> New Bet $2. Lose -> Add 1 -> New Bet $3. Lose -> Add 2 -> New Bet $5).
 * - On WIN: Check if Bankroll > Bankroll at start of sequence.
 * - If YES (Profit): Reset to Base Unit and restart sequence.
 * - If NO (Still recovering): Repeat the SAME bet amount. Do not increase, do not decrease.
 * * 3. The Goal:
 * - Grind out consistent profits using the high coverage (~10/37 loss chance).
 * - Survive losing streaks using the gentle additive progression.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---
    // The "Add Sequence" from the video: 1, 1, 2, 2, 3, 4, 5, 7, 9, 12, 16
    const ADD_SEQUENCE = [1, 1, 2, 2, 3, 4, 5, 7, 9, 12, 16];
    
    // Use 'min' for Inside bets as the base unit (video uses $1)
    const BASE_UNIT = config.betLimits.min; 
    const MAX_BET = config.betLimits.max;

    // Define the fixed betting pattern
    const STREET_BETS = [4, 10, 13, 22, 28, 31]; // Start numbers of the rows
    const SPLIT_BETS = [
        [9, 12],
        [16, 19],
        [18, 21],
        [27, 30]
    ];

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.currentBetSize = BASE_UNIT;       // Current value per chip
        state.sequenceIndex = -1;               // Position in ADD_SEQUENCE (-1 means base level)
        state.sequenceStartBankroll = bankroll; // Snapshot of bankroll when we started this run
        state.initialized = true;
    }

    // --- 3. ANALYZE HISTORY & MANAGE PROGRESSION ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Did we win the last spin?
        // We bet on specific streets and splits. We need to calculate if the winning number was covered.
        // It's easier to check if our bankroll went up or down compared to the previous spin.
        // However, the simulator doesn't pass 'previousBankroll' directly, but we can infer win/loss logic.
        
        // Let's determine strictly if the number hit our coverage.
        const num = lastSpin.winningNumber;
        let won = false;

        // Check Streets
        if (num !== 0 && num !== '00') {
            for (let s of STREET_BETS) {
                if (num >= s && num <= s + 2) {
                    won = true;
                    break;
                }
            }
            if (!won) {
                for (let split of SPLIT_BETS) {
                    if (split.includes(num)) {
                        won = true;
                        break;
                    }
                }
            }
        }

        if (won) {
            // --- WIN LOGIC ---
            // "We're in profit so we're going to restart" vs "Not in session profit, keep bet same"
            
            // Check if we have recovered to the start of the sequence
            if (bankroll >= state.sequenceStartBankroll) {
                // Full Reset
                state.currentBetSize = BASE_UNIT;
                state.sequenceIndex = -1;
                state.sequenceStartBankroll = bankroll; // Reset watermark to current
            } else {
                // Recovery Mode: "Rebet and spin"
                // Keep state.currentBetSize exactly the same.
            }
        } else {
            // --- LOSS LOGIC ---
            // Move to next step in the additive sequence
            state.sequenceIndex++;
            
            if (state.sequenceIndex < ADD_SEQUENCE.length) {
                // Add the specific sequence value to the current bet size
                // Example: If bet is 5 and sequence says +3, new bet is 8.
                // Note: The sequence represents UNIT increases.
                const addAmount = ADD_SEQUENCE[state.sequenceIndex] * BASE_UNIT;
                state.currentBetSize += addAmount;
            } else {
                // End of sequence (Bust protection)
                // Video stops at 15 mins, doesn't show bust. 
                // Standard behavior: Reset to base to preserve remaining bankroll.
                state.currentBetSize = BASE_UNIT;
                state.sequenceIndex = -1;
                state.sequenceStartBankroll = bankroll;
            }
        }
    }

    // --- 4. CONSTRUCT BETS ---
    
    // Clamp bet size to limits
    let finalChipValue = Math.max(state.currentBetSize, config.betLimits.min);
    finalChipValue = Math.min(finalChipValue, config.betLimits.max);

    // Bankroll Safety Check
    // We place 6 Streets + 4 Splits = 10 Chips total.
    const totalCost = finalChipValue * 10;
    if (bankroll < totalCost) {
        // If we can't afford the full spread, stop betting or reset logic.
        // We will attempt to reset to base unit if possible, otherwise stop.
        if (bankroll >= BASE_UNIT * 10) {
            finalChipValue = BASE_UNIT;
            state.currentBetSize = BASE_UNIT;
            state.sequenceIndex = -1;
            state.sequenceStartBankroll = bankroll;
        } else {
            return []; // Not enough money to play
        }
    }

    const bets = [];

    // Add Street Bets
    STREET_BETS.forEach(streetStart => {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: finalChipValue
        });
    });

    // Add Split Bets
    SPLIT_BETS.forEach(splitPair => {
        bets.push({
            type: 'split',
            value: splitPair,
            amount: finalChipValue
        });
    });

    return bets;
=======
/**
 * Strategy: Padavan 46 (Sunny's Strategy)
 * Source: The Roulette Master TV (YouTube)
 * Video URL: https://www.youtube.com/watch?v=qLP-CnwMH18
 * * THE LOGIC:
 * This strategy relies on covering specific sections of the board using a combination of Streets and Splits.
 * It targets Streets with 2 Black numbers and covers remaining Red gaps with Splits.
 * * 1. The Setup (Fixed 10-unit bet pattern):
 * - Streets (3 numbers): Bet on rows 4, 10, 13, 22, 28, 31. (These rows contain 2 Black numbers).
 * - Splits (2 numbers): Bet on pure Red/Red splits to cover gaps: 9/12, 16/19, 18/21, 27/30.
 * - Jackpot Numbers: 12 and 30 are covered by BOTH a Street and a Split, paying double if hit.
 * * 2. The Progression (Additive Recovery):
 * - This is NOT a multiplier system. It uses a specific "Add Sequence" to increase bet sizing.
 * - Sequence: [+1, +1, +2, +2, +3, +4, +5, +7, +9, +12, +16]
 * - How it works:
 * - Start with Base Unit (e.g., $1 per spot).
 * - On LOSS: Advance one step in the sequence and ADD that value to the current bet size.
 * (e.g., Start $1. Lose -> Add 1 -> New Bet $2. Lose -> Add 1 -> New Bet $3. Lose -> Add 2 -> New Bet $5).
 * - On WIN: Check if Bankroll > Bankroll at start of sequence.
 * - If YES (Profit): Reset to Base Unit and restart sequence.
 * - If NO (Still recovering): Repeat the SAME bet amount. Do not increase, do not decrease.
 * * 3. The Goal:
 * - Grind out consistent profits using the high coverage (~10/37 loss chance).
 * - Survive losing streaks using the gentle additive progression.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---
    // The "Add Sequence" from the video: 1, 1, 2, 2, 3, 4, 5, 7, 9, 12, 16
    const ADD_SEQUENCE = [1, 1, 2, 2, 3, 4, 5, 7, 9, 12, 16];
    
    // Use 'min' for Inside bets as the base unit (video uses $1)
    const BASE_UNIT = config.betLimits.min; 
    const MAX_BET = config.betLimits.max;

    // Define the fixed betting pattern
    const STREET_BETS = [4, 10, 13, 22, 28, 31]; // Start numbers of the rows
    const SPLIT_BETS = [
        [9, 12],
        [16, 19],
        [18, 21],
        [27, 30]
    ];

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.currentBetSize = BASE_UNIT;       // Current value per chip
        state.sequenceIndex = -1;               // Position in ADD_SEQUENCE (-1 means base level)
        state.sequenceStartBankroll = bankroll; // Snapshot of bankroll when we started this run
        state.initialized = true;
    }

    // --- 3. ANALYZE HISTORY & MANAGE PROGRESSION ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Did we win the last spin?
        // We bet on specific streets and splits. We need to calculate if the winning number was covered.
        // It's easier to check if our bankroll went up or down compared to the previous spin.
        // However, the simulator doesn't pass 'previousBankroll' directly, but we can infer win/loss logic.
        
        // Let's determine strictly if the number hit our coverage.
        const num = lastSpin.winningNumber;
        let won = false;

        // Check Streets
        if (num !== 0 && num !== '00') {
            for (let s of STREET_BETS) {
                if (num >= s && num <= s + 2) {
                    won = true;
                    break;
                }
            }
            if (!won) {
                for (let split of SPLIT_BETS) {
                    if (split.includes(num)) {
                        won = true;
                        break;
                    }
                }
            }
        }

        if (won) {
            // --- WIN LOGIC ---
            // "We're in profit so we're going to restart" vs "Not in session profit, keep bet same"
            
            // Check if we have recovered to the start of the sequence
            if (bankroll >= state.sequenceStartBankroll) {
                // Full Reset
                state.currentBetSize = BASE_UNIT;
                state.sequenceIndex = -1;
                state.sequenceStartBankroll = bankroll; // Reset watermark to current
            } else {
                // Recovery Mode: "Rebet and spin"
                // Keep state.currentBetSize exactly the same.
            }
        } else {
            // --- LOSS LOGIC ---
            // Move to next step in the additive sequence
            state.sequenceIndex++;
            
            if (state.sequenceIndex < ADD_SEQUENCE.length) {
                // Add the specific sequence value to the current bet size
                // Example: If bet is 5 and sequence says +3, new bet is 8.
                // Note: The sequence represents UNIT increases.
                const addAmount = ADD_SEQUENCE[state.sequenceIndex] * BASE_UNIT;
                state.currentBetSize += addAmount;
            } else {
                // End of sequence (Bust protection)
                // Video stops at 15 mins, doesn't show bust. 
                // Standard behavior: Reset to base to preserve remaining bankroll.
                state.currentBetSize = BASE_UNIT;
                state.sequenceIndex = -1;
                state.sequenceStartBankroll = bankroll;
            }
        }
    }

    // --- 4. CONSTRUCT BETS ---
    
    // Clamp bet size to limits
    let finalChipValue = Math.max(state.currentBetSize, config.betLimits.min);
    finalChipValue = Math.min(finalChipValue, config.betLimits.max);

    // Bankroll Safety Check
    // We place 6 Streets + 4 Splits = 10 Chips total.
    const totalCost = finalChipValue * 10;
    if (bankroll < totalCost) {
        // If we can't afford the full spread, stop betting or reset logic.
        // We will attempt to reset to base unit if possible, otherwise stop.
        if (bankroll >= BASE_UNIT * 10) {
            finalChipValue = BASE_UNIT;
            state.currentBetSize = BASE_UNIT;
            state.sequenceIndex = -1;
            state.sequenceStartBankroll = bankroll;
        } else {
            return []; // Not enough money to play
        }
    }

    const bets = [];

    // Add Street Bets
    STREET_BETS.forEach(streetStart => {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: finalChipValue
        });
    });

    // Add Split Bets
    SPLIT_BETS.forEach(splitPair => {
        bets.push({
            type: 'split',
            value: splitPair,
            amount: finalChipValue
        });
    });

    return bets;
>>>>>>> origin/main
}