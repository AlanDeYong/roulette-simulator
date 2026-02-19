
/**
 * Strategy: "My Go To Strategy" (WillVegas Backup System)
 * * Source: 
 * Channel: WillVegas
 * Video: https://www.youtube.com/watch?v=gkUT6dAXWOo
 * Title: Roulette Strategy “My Go To Strategy” This pays when nothing else does!!
 * * The Logic:
 * This is a high-coverage "grind" strategy designed to cover 28 numbers (approx 75% of the board).
 * It targets specific sectors to ensure that any win yields a consistent profit of 2 units (at base level).
 * * Bet Layout (7 Units Total):
 * 1. 3rd Column: 3 Units (Covers 3, 6, 9, 12... 36)
 * 2. Four Specific Corners (Covering Col 1 & 2 numbers):
 * - Corner 4  (Covers 4, 5, 7, 8)      - 1 Unit
 * - Corner 16 (Covers 16, 17, 19, 20)  - 1 Unit
 * - Corner 22 (Covers 22, 23, 25, 26)  - 1 Unit
 * - Corner 31 (Covers 31, 32, 34, 35)  - 1 Unit
 * * Payoff Calculation (Base Level):
 * - Total Bet: 7 Units.
 * - Column Win (2:1): Pays 6 + 3 back = 9 total. Profit = +2 Units.
 * - Corner Win (8:1): Pays 8 + 1 back = 9 total. Profit = +2 Units.
 * - Loss: -7 Units.
 * * The Progression (Recovery):
 * - Type: Multi-Stage Recovery (Martingale variant).
 * - On Loss: Double the bet multiplier (x2).
 * - On Win (during recovery): You must win TWICE at the doubled level to fully recoup the previous loss 
 * and achieve a small profit.
 * - Reset: After two consecutive wins at the higher level, or if at base level, reset multiplier to 1.
 * * The Goal:
 * - The video suggests small session goals ($50 profit per session).
 * - Stop Loss: Not explicitly defined in video, but recommended to stop if 3-4 consecutive losses occur 
 * due to exponential bet growth.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the corner bets (Top-left number of the corner)
    // These specific corners cover the gaps in Col 1 & 2 not covered by Col 3.
    const CORNERS = [4, 16, 22, 31];
    
    // Initialize state if first spin
    if (!state.multiplier) state.multiplier = 1;
    if (!state.recoveryWins) state.recoveryWins = 0; // Tracks wins needed to reset
    if (state.totalProfit === undefined) state.totalProfit = 0;

    // --- 2. PROCESS LAST SPIN (Update Progression) ---
    
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Determine if we won the last spin
        // We win if it hits Column 3 OR any of our specific corners
        const isCol3 = (lastNum !== 0 && lastNum % 3 === 0);
        
        let isCorner = false;
        // Check if number is in any of our corners
        // Corner X covers: X, X+1, X+3, X+4 (Standard layout)
        for (const c of CORNERS) {
            if ([c, c+1, c+3, c+4].includes(lastNum)) {
                isCorner = true;
                break;
            }
        }

        const won = isCol3 || isCorner;

        if (won) {
            if (state.multiplier > 1) {
                // In recovery mode, we need 2 wins to reset
                state.recoveryWins++;
                if (state.recoveryWins >= 2) {
                    state.multiplier = 1;
                    state.recoveryWins = 0;
                }
            } else {
                // Base level win, stay at base
                state.multiplier = 1;
                state.recoveryWins = 0;
            }
        } else {
            // Loss: Double the bets and reset recovery counter
            state.multiplier *= 2;
            state.recoveryWins = 0;
        }
    }

    // --- 3. CALCULATE BET SIZING ---

    // Calculate Base Unit Size
    // We need 1 Unit for Corners and 3 Units for Column.
    // Constraints: 1 Unit >= minInside, 3 Units >= minOutside.
    const minUnitInside = config.betLimits.min;
    const minUnitOutside = config.betLimits.minOutside / 3;
    
    // Use the larger requirement to ensure all limits are met
    const baseUnit = Math.max(minUnitInside, minUnitOutside, 1); // Default at least 1

    // Apply multiplier
    const currentUnit = baseUnit * state.multiplier;
    const colBetAmount = currentUnit * 3;
    const cornerBetAmount = currentUnit;

    // --- 4. SAFETY CLAMPS (Bet Limits) ---
    
    // Check if bets exceed max limit
    if (colBetAmount > config.betLimits.max || cornerBetAmount > config.betLimits.max) {
        // Optional: Reset strategy if limits are hit to avoid partial bets
        // For this simulation, we clamp, but usually this kills the martingale.
        // console.log("Max bet limit reached, capping bets.");
    }

    const clampedColBet = Math.min(colBetAmount, config.betLimits.max);
    const clampedCornerBet = Math.min(cornerBetAmount, config.betLimits.max);

    // Stop if bankroll is insufficient for the full spread
    const totalRequired = clampedColBet + (clampedCornerBet * 4);
    if (bankroll < totalRequired) {
        // Not enough money to place the full strategy
        return []; 
    }

    // --- 5. PLACE BETS ---
    
    const bets = [];

    // Bet 1: 3rd Column (Covers 3, 6, 9... 36)
    bets.push({
        type: 'column',
        value: 3, // 3rd Column
        amount: clampedColBet
    });

    // Bet 2-5: The 4 Corners
    for (const c of CORNERS) {
        bets.push({
            type: 'corner',
            value: c,
            amount: clampedCornerBet
        });
    }

    return bets;

}