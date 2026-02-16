/**
 * Strategy: Slash 5 (Dozen/Split Progression)
 * Source: Bet With Mo - "SLASH 5 - ROULETTE STRATEGY MADE $500 IN 10 MIN"
 * Video URL: https://www.youtube.com/watch?v=ItGxmMcTVJg
 *
 * THE LOGIC:
 * This is a pattern-based strategy that moves across the table ("Slashes") using a specific
 * arrangement of Split bets. It creates a high-coverage zone (covering 4 numbers with 3 bets)
 * and shifts position after every spin to avoid clustering.
 *
 * The Pattern (5 Units Total Base):
 * 1. Split [N, N+1] : 2 Units (Top Horizontal)
 * 2. Split [N+1, N+4] : 1 Unit (Vertical Connector)
 * 3. Split [N+4, N+5] : 2 Units (Bottom Horizontal)
 *
 * THE MOVEMENT:
 * The pattern starts at Number 1. After every spin (Win or Loss), the entire pattern
 * shifts one "Street" down (Add 3 to all numbers). If it reaches the end of the table (Row 11),
 * it resets to the top.
 *
 * THE PROGRESSION (7-Level Recovery):
 * - On Win: Reset multiplier to Level 1.
 * - On Loss: Increase multiplier to the next level to recover.
 * - Levels: 1x, 2x, 4x, 6x, 8x, 12x, 16x (Approximated based on video aggression).
 *
 * THE GOAL:
 * Quick "Hit and Run" profits. The video suggests taking profit every $20-$40,
 * but for this function, it runs continuously until bankroll depletion or manual stop.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const BASE_UNIT = config.betLimits.min; // Usually $1 or $2 on inside bets
    
    // The 7-Level Multiplier Sequence (Aggressive recovery)
    // Level: 1   2   3   4   5    6    7
    const MULTIPLIERS = [1, 2, 4, 6, 8, 12, 16];

    // --- 2. INITIALIZE STATE ---
    if (state.level === undefined) state.level = 0; // Current progression level (Index of MULTIPLIERS)
    if (state.currentRow === undefined) state.currentRow = 1; // Start at number 1 (Top left of board)
    if (state.coveredNumbers === undefined) state.coveredNumbers = []; // Store coverage to detect wins

    // --- 3. PROCESS LAST SPIN (Update Progression) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Did we win? Check if last winning number was in our covered array
        const won = state.coveredNumbers.includes(lastNumber);

        if (won) {
            // Reset on Win
            state.level = 0;
        } else {
            // Escalate on Loss
            state.level++;
            // Cap at max level (Reset or stay at max? Video implies strict 7 levels then bust/reset)
            if (state.level >= MULTIPLIERS.length) {
                state.level = 0; // Hard reset to save bankroll if 7 levels fail
            }
        }

        // --- 4. EXECUTE MOVEMENT LOGIC ---
        // Always move one street down (add 3), regardless of win/loss
        state.currentRow += 3;
        
        // Wrap around: If we go past Row 11 (Start num 31), reset to Row 1
        // Valid start numbers: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
        if (state.currentRow > 31) {
            state.currentRow = 1;
        }
    }

    // --- 5. CALCULATE BET AMOUNTS ---
    const currentMult = MULTIPLIERS[state.level];
    
    // Calculate unit sizes clamping to table limits
    // Note: The strategy calls for 2 units on the horizontals and 1 unit on the vertical.
    let unit1 = BASE_UNIT * currentMult;       // The "1 Unit" bet
    let unit2 = BASE_UNIT * currentMult * 2;   // The "2 Unit" bet

    // Enforce Table Max Limits
    unit1 = Math.min(unit1, config.betLimits.max);
    unit2 = Math.min(unit2, config.betLimits.max);

    // --- 6. DEFINE THE PATTERN (The "Slash") ---
    // Anchor is state.currentRow (e.g., 1)
    // Structure:
    // Split A: [Anchor, Anchor + 1] (e.g., 1-2) -> $2
    // Split B: [Anchor + 1, Anchor + 4] (e.g., 2-5) -> $1
    // Split C: [Anchor + 4, Anchor + 5] (e.g., 5-6) -> $2

    const anchor = state.currentRow;
    const splitA = [anchor, anchor + 1];
    const splitB = [anchor + 1, anchor + 4];
    const splitC = [anchor + 4, anchor + 5];

    // Store covered numbers for next turn's win check
    // The covered numbers are the unique set of the splits
    state.coveredNumbers = [
        anchor, 
        anchor + 1, 
        anchor + 4, 
        anchor + 5
    ];

    // --- 7. CONSTRUCT BETS ---
    const bets = [
        { type: 'split', value: splitA, amount: unit2 }, // 2 Units
        { type: 'split', value: splitB, amount: unit1 }, // 1 Unit
        { type: 'split', value: splitC, amount: unit2 }  // 2 Units
    ];

    // Safety: Check if bankroll can afford the bet
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBet > bankroll) {
        // Not enough money to place full progression bet
        return []; // Stop betting
    }

    return bets;
}