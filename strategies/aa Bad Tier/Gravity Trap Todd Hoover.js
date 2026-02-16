/**
 * Strategy: The Gravity Trap (by Todd Hoover / The Roulette Master)
 * Source: https://www.youtube.com/watch?v=H5UzR-LTQYw
 * Channel: The Roulette Master
 * * Logic:
 * 1. Base Bet: Place a bet on a single Column (defaulting to Col 3, or rotating).
 * 2. Recovery (The Trap): If the Column bet loses, place 6 Split bets on the other two columns.
 * - The Split bets target either the High or Low side of the board, depending on what last hit.
 * - Split Bet Sizing: Calculated based on the Column bet size (approx 20% or First Digit * 2).
 * * Progression (Fibonacci-like Column Ladder):
 * - Sequence multipliers: [1, 3, 5, 8, 13, 21, 34, 55...]
 * - On Total Loss (Missed Col and Splits): Increase Column bet to next level. Enable Recovery Splits next turn.
 * - On Column Win (Direct Hit): Stay at current level. Remove Splits.
 * - On Split Win (Recovery Hit): Regress one level (go back). Remove Splits.
 * * Goal:
 * - Grind small profits using the splits to mitigate losses during the progression.
 * - Stop Loss: Implicit in bankroll depletion or reaching max table limits.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. Configuration & Constants ---
    const COL_SEQUENCE = [1, 3, 5, 8, 13, 21, 34, 55, 89, 144];
    const BASE_UNIT = config.betLimits.minOutside; // Usually $5 or $10
    
    // Define Split Groups for High/Low sides
    // Logic: 6 splits covering the "other" columns.
    const SPLIT_MAP = {
        // If Betting Col 1, Splits are on Col 2 & 3 (Horizontal pairs)
        1: {
            low: [[2,3], [5,6], [8,9], [11,12], [14,15], [17,18]],
            high: [[20,21], [23,24], [26,27], [29,30], [32,33], [35,36]]
        },
        // If Betting Col 2, Splits are on Col 1 & 3 (Vertical pairs within cols)
        2: {
            low: [[1,4], [7,10], [13,16], [3,6], [9,12], [15,18]], 
            high: [[19,22], [25,28], [31,34], [21,24], [27,30], [33,36]]
        },
        // If Betting Col 3, Splits are on Col 1 & 2 (Horizontal pairs)
        3: {
            low: [[1,2], [4,5], [7,8], [10,11], [13,14], [16,17]],
            high: [[19,20], [22,23], [25,26], [28,29], [31,32], [34,35]]
        }
    };

    // --- 2. State Initialization ---
    if (state.step === undefined) state.step = 0;
    if (state.targetColumn === undefined) state.targetColumn = 3; // Default to Column 3 as per video start
    if (state.recoveryMode === undefined) state.recoveryMode = false;
    if (state.activeSplitNumbers === undefined) state.activeSplitNumbers = [];

    // Helper to identify column of a number (1, 2, or 3). 0 returns 0.
    const getCol = (num) => {
        if (num === 0) return 0;
        return (num % 3 === 0) ? 3 : (num % 3);
    };

    // --- 3. Process Last Spin ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastCol = getCol(lastNum);

        const colHit = (lastCol === state.targetColumn);
        const splitHit = state.activeSplitNumbers.includes(lastNum);

        if (colHit) {
            // "If you hit the column not the splits... stay at the same bet" - Video 10:42
            // We maintain the step, but turn off recovery mode for next spin
            state.recoveryMode = false;
        } else if (splitHit) {
            // "Only go backwards in the progression when you hit the splits" - Video 12:20
            // Win on splits recovers the previous loss. Regress.
            state.step = Math.max(0, state.step - 1);
            state.recoveryMode = false;
        } else {
            // Total Loss (Missed Col AND Missed Splits/No Splits active)
            // "Once we have losses... progression works"
            state.step++;
            state.recoveryMode = true; // Activate splits for next turn
            
            // If we lost, we might want to switch columns or stay. 
            // Video keeps same column often, or switches arbitrarily. We will stick to one for consistency.
        }
    }

    // Safety: Cap progression at defined sequence length
    if (state.step >= COL_SEQUENCE.length) {
        state.step = COL_SEQUENCE.length - 1; // Cap at max defined step or reset (user preference, capping here)
    }

    // --- 4. Calculate Bet Amounts ---
    
    // A. Main Column Bet
    let colMultiplier = COL_SEQUENCE[state.step];
    let colAmount = BASE_UNIT * colMultiplier;
    
    // Clamp Main Bet
    colAmount = Math.max(colAmount, config.betLimits.minOutside);
    colAmount = Math.min(colAmount, config.betLimits.max);

    const bets = [];

    // Add Main Column Bet
    bets.push({
        type: 'column',
        value: state.targetColumn,
        amount: colAmount
    });

    // B. Split Bets (Recovery Mode)
    state.activeSplitNumbers = []; // Reset tracking

    if (state.recoveryMode) {
        // Calculate Split Size: "First number in the bet... times two" (Video 14:00)
        // Effectively: (ColumnBet / 10) * 2, or roughly 20%.
        // We use Math.floor to mimic taking the "first digit" of a 2-digit number.
        // If bet is < 10, use minimum.
        let rawDigit = Math.floor(colAmount / 10);
        if (rawDigit < 1) rawDigit = 1;
        
        let splitAmount = rawDigit * 2; 

        // Clamp Split Bet
        splitAmount = Math.max(splitAmount, config.betLimits.min); // Must meet table min
        splitAmount = Math.min(splitAmount, config.betLimits.max);

        // Determine Side (High/Low) based on last number
        // Video 04:06: "Go to the side that just hit"
        let lastNum = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1].winningNumber : 1; 
        if (lastNum === 0) lastNum = 1; // Default low if 0 hit

        const side = (lastNum >= 19) ? 'high' : 'low';
        
        // Get correct splits for the TARGET column (covering the OTHER two)
        const splitsToPlace = SPLIT_MAP[state.targetColumn][side];

        splitsToPlace.forEach(pair => {
            bets.push({
                type: 'split',
                value: pair,
                amount: splitAmount
            });
            // Track covered numbers for next spin evaluation
            state.activeSplitNumbers.push(...pair);
        });
    }

    // --- 5. Bankroll Check ---
    // Calculate total wager
    const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
    
    if (totalWager > bankroll) {
        // Not enough money to execute strategy safely
        return []; 
    }

    return bets;
}