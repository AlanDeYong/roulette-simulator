/**
 * Cassandra's Corners - Modified (Stress Test Version)
 * * Source: "Cassandra's Corners Roulette Strategy Stress Test Makes Huge Profit!"
 * Channel: The Roulette Factory
 * URL: http://www.youtube.com/watch?v=8VvAWAJVuMc
 * * The Logic:
 * This strategy runs two completely independent betting progressions simultaneously:
 * 1. Corners: Bets on a cluster of adjacent corners down the center/left intersection.
 * - Starts with 3 adjacent corners (e.g., top-left numbers 13, 16, 19).
 * 2. Center Column: Bets on the 2nd Column (numbers 2, 5, 8, 11...).
 * * The Progression:
 * - Corners: Aggressive scaling.
 * - Base (Level 0): 3 corners at 1 unit.
 * - 1st Loss (Level 1): Adds a 4th corner, doubles bet to 2 units per corner.
 * - 2nd Loss (Level 2): Adds a 5th (final) corner, doubles bet to 4 units per corner.
 * - Subsequent Losses: Keeps 5 corners, continues to double the bet size (8, 16, 32...).
 * - Win: Immediately resets back to Level 0 (3 corners, 1 unit).
 * - Center Column: Modified Fibonacci (1, 2, 3, 5, 8, 13, 21...).
 * - Loss: Moves UP one step in the Fibonacci sequence.
 * - Win: Moves DOWN one step in the sequence (does not reset completely).
 * * The Goal:
 * To accumulate profit rapidly through the independent overlapping hits. 
 * If a new highest session bankroll is achieved, BOTH progressions immediately reset 
 * to their base levels to lock in the session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables on first run
    if (state.highestBankroll === undefined) {
        state.highestBankroll = bankroll;
        
        // Progression trackers
        state.cornerLevel = 0; 
        state.columnFiboIndex = 0;
        
        // Configuration for the strategy
        state.fiboSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
        // Using left-side corners to cover middle/left columns intersections
        // 13 (covers 13,14,16,17), 16 (16,17,19,20), 19 (19,20,22,23), 22 (22,23,25,26), 25 (25,26,28,29)
        state.cornerTopLefts = [13, 16, 19, 22, 25]; 
    }

    // 2. Evaluate previous spin and update progressions
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;

        // Session Profit Check: Lock in profits and reset if we hit a new high
        if (bankroll > state.highestBankroll) {
            state.highestBankroll = bankroll;
            state.cornerLevel = 0;
            state.columnFiboIndex = 0;
        } else {
            // --- Determine Wins/Losses ---
            let columnWon = false;
            let cornerWon = false;

            if (lastSpin !== 0 && lastSpin !== '00') {
                // Check if Center Column won (numbers where num % 3 === 2)
                if (lastSpin % 3 === 2) {
                    columnWon = true;
                }

                // Check if any ACTIVE corner won
                let activeCornersCount = 3;
                if (state.cornerLevel === 1) activeCornersCount = 4;
                if (state.cornerLevel >= 2) activeCornersCount = 5;

                for (let i = 0; i < activeCornersCount; i++) {
                    const tl = state.cornerTopLefts[i];
                    // The 4 numbers covered by a standard corner starting on the left column
                    const coveredNumbers = [tl, tl + 1, tl + 3, tl + 4]; 
                    if (coveredNumbers.includes(lastSpin)) {
                        cornerWon = true;
                        break;
                    }
                }
            }

            // --- Update Progressions ---
            // Update Corners
            if (cornerWon) {
                state.cornerLevel = 0; // Reset to base on win
            } else {
                state.cornerLevel++;   // Progress level on loss
            }

            // Update Column (Fibonacci)
            if (columnWon) {
                // Drop back one level on win
                state.columnFiboIndex = Math.max(0, state.columnFiboIndex - 1);
            } else {
                // Move up one level on loss
                state.columnFiboIndex = Math.min(state.fiboSequence.length - 1, state.columnFiboIndex + 1);
            }
        }
    }

    // 3. Construct Bets
    let bets = [];

    // --- Corner Bets Setup ---
    // Level 0: 3 corners. Level 1: 4 corners. Level 2+: 5 corners.
    let cornersActive = 3;
    if (state.cornerLevel === 1) cornersActive = 4;
    if (state.cornerLevel >= 2) cornersActive = 5;

    // Multiplier logic: 2^Level (Lvl 0 = 1x, Lvl 1 = 2x, Lvl 2 = 4x, Lvl 3 = 8x, etc.)
    let cornerMultiplier = Math.pow(2, state.cornerLevel);
    let cornerBetAmount = config.betLimits.min * cornerMultiplier;
    
    // Clamp to min/max limits
    cornerBetAmount = Math.max(cornerBetAmount, config.betLimits.min);
    cornerBetAmount = Math.min(cornerBetAmount, config.betLimits.max);

    // Place Corner Bets
    for (let i = 0; i < cornersActive; i++) {
        bets.push({ 
            type: 'corner', 
            value: state.cornerTopLefts[i], 
            amount: cornerBetAmount 
        });
    }

    // --- Column Bet Setup ---
    let columnMultiplier = state.fiboSequence[state.columnFiboIndex];
    let columnBetAmount = config.betLimits.minOutside * columnMultiplier;

    // Clamp to min/max limits
    columnBetAmount = Math.max(columnBetAmount, config.betLimits.minOutside);
    columnBetAmount = Math.min(columnBetAmount, config.betLimits.max);

    // Place Column Bet (Column 2 is the center column)
    bets.push({ 
        type: 'column', 
        value: 2, 
        amount: columnBetAmount 
    });

    return bets;
}