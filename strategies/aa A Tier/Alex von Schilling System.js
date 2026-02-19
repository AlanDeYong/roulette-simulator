
/**
 * Strategy: Alex von Schilling System
 * Source: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=azrftMUSF2Y
 * * Logic:
 * This is a high-coverage "Jackpot" system.
 * 1. Base Bet ($45 total):
 * - $5 on Column 2
 * - $5 on Corners: 1-5, 8-12, 13-17, 20-24, 25-29, 32-36
 * (Note: Corners defined by top-left number: 1, 8, 13, 20, 25, 32)
 * - $5 on Splits: 0-2 and 17-20
 * 2. "Jackpot" Numbers: 17 and 20 are heavily covered (Corner + Split + Column/Corner overlap), 
 * creating massive payouts when they hit.
 * * Progression:
 * - On Loss: Increase the bet per spot by 2 units ($10).
 * (e.g., $5 -> $15 -> $25 -> $35 per spot).
 * - On Win:
 * - If Bankroll < Starting Bankroll (Session Loss): Maintain current bet level.
 * - If Bankroll >= Starting Bankroll (Session Profit): Reset to base unit ($5).
 * * Goal:
 * Hit a "Jackpot" number (especially 17 or 20) or enough regular wins to reach session profit, 
 * then reset immediately to protect gains.
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. Configuration & Constants
    const BASE_UNIT = 5;
    const LOSS_INCREMENT = 10;
    
    // Define Bet Locations
    // Corners defined by top-left number. 
    // Layout math: Corner at 'n' covers n, n+1, n+3, n+4.
    const CORNERS = [1, 8, 13, 20, 25, 32]; 
    const SPLITS = [[0, 2], [17, 20]];
    const COLUMN_VAL = 2; // 2nd Column

    // 2. Initialize State
    if (!state.initialized) {
        state.startBankroll = bankroll;
        state.betPerSpot = BASE_UNIT;
        state.initialized = true;
    }

    // 3. Process History (Progression Logic)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Determine if we won the last spin
        let won = false;

        // Check Column 2
        if (lastNum > 0 && (lastNum - 2) % 3 === 0) won = true;

        // Check Corners
        if (!won) {
            for (const c of CORNERS) {
                // Corner covers c, c+1, c+3, c+4
                const covers = [c, c + 1, c + 3, c + 4];
                if (covers.includes(lastNum)) {
                    won = true;
                    break;
                }
            }
        }

        // Check Splits
        if (!won) {
            for (const s of SPLITS) {
                if (s.includes(lastNum)) {
                    won = true;
                    break;
                }
            }
        }

        // Apply Progression Rules
        if (won) {
            // "If we're not in session profit we keep the bet the same"
            // "If we are close enough to session profit... go back to 45 (Base)"
            if (bankroll >= state.startBankroll) {
                state.betPerSpot = BASE_UNIT;
            }
            // Else: maintain current state.betPerSpot
        } else {
            // "Increase by two units ($10) ... add $10 to each"
            state.betPerSpot += LOSS_INCREMENT;
        }
    }

    // 4. Clamp Bets to Limits
    // Ensure we don't exceed table max per position
    // Also ensure we meet table min (though $5 base usually exceeds typical min of $1 or $2)
    let amount = state.betPerSpot;
    
    // Respect Min Limits
    const minBet = Math.max(config.betLimits.min, config.betLimits.minOutside);
    if (amount < minBet) amount = minBet;

    // Respect Max Limits
    if (amount > config.betLimits.max) amount = config.betLimits.max;

    // 5. Construct Bet Objects
    const bets = [];

    // Add Column Bet
    bets.push({
        type: 'column',
        value: COLUMN_VAL,
        amount: amount
    });

    // Add Corner Bets
    CORNERS.forEach(cornerStart => {
        bets.push({
            type: 'corner',
            value: cornerStart,
            amount: amount
        });
    });

    // Add Split Bets
    SPLITS.forEach(splitPair => {
        bets.push({
            type: 'split',
            value: splitPair,
            amount: amount
        });
    });

    return bets;

}