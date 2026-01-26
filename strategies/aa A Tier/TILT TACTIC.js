/**
 * TILT TACTIC ROULETTE STRATEGY
 * * Source: YouTube - Bet With Mo "TILT TACTIC - ROULETTE STRATEGY"
 * Channel: Bet With Mo
 * URL: https://www.youtube.com/watch?v=rWR4ryakeyA
 * * THE LOGIC:
 * This is a "Double Street" (Line) and Split betting strategy that aims to cover large
 * sections of the board while hunting for "Jackpot" numbers (Splits).
 * * - Side A: Starts at DS 1-6 and expands to the right (DS 7-12, 13-18, 19-24).
 * - Side B: Starts at DS 31-36 and expands to the left (DS 25-30, 19-24, 13-18).
 * * TRIGGER & CONDITIONS:
 * - Start on Level 1, Side A.
 * - Place bets on the specific Double Streets (Lines) and Splits defined for that level.
 * * THE PROGRESSION (7-8 Levels):
 * 1. Expansion Phase (Levels 1-4):
 * - On Loss: Add the next Double Street set.
 * - Level 1: 1 Set (DS + Splits)
 * - Level 2: 2 Sets
 * - Level 3: 3 Sets
 * - Level 4: 4 Sets (Max coverage)
 * * 2. Aggressive Phase (Levels 5-8):
 * - Triggered after loss on Level 4.
 * - Double all bets from previous level.
 * - Add a fixed amount ($6) to every Double Street bet.
 * - Max 3 doubles after the first double event.
 * * WIN/LOSS HANDLING:
 * - Major Win (Hit a Split): Reset to Level 1 and Switch Sides (A <-> B).
 * - Small Win (Hit Street only): Rebet (Stay at current level).
 * - Loss: Move to next level. If max level reached (Bust), reset to Level 1.
 * * GOAL:
 * Accumulate profit through high-payout split hits while using street wins to sustain the bankroll.
 * * @param {Array} spinHistory - Array of past spin objects { winningNumber, winningColor }
 * @param {number} bankroll - Current account balance
 * @param {Object} config - Configuration object with betting limits
 * @param {Object} state - Persistent state object
 * @returns {Array} - Array of bet objects
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    
    // Standardizing units based on table limits
    // Typically splits are 1 unit, streets are 3 units base
    const SPLIT_UNIT = Math.max(1, config.betLimits.min); 
    const STREET_BASE = Math.max(3, config.betLimits.min); 
    const STREET_ADDER = 6; // Fixed adder logic from strategy description

    // DEFINING THE BETTING SETS
    // Each set contains: Line (Double Street start num) and Splits (Arrays of numbers)
    
    // Side A: Low to High expansion
    const SETS_A = [
        { id: 1, line: 1,  splits: [[5, 8], [8, 9]] },          // DS 1-6
        { id: 2, line: 7,  splits: [[11, 14], [14, 15]] },      // DS 7-12
        { id: 3, line: 13, splits: [[16, 19], [17, 20]] },      // DS 13-18
        { id: 4, line: 19, splits: [[23, 24], [20, 21]] }       // DS 19-24
    ];

    // Side B: High to Low expansion
    const SETS_B = [
        { id: 1, line: 31, splits: [[29, 32], [29, 30]] },      // DS 31-36
        { id: 2, line: 25, splits: [[23, 26], [23, 24]] },      // DS 25-30
        { id: 3, line: 19, splits: [[20, 21], [17, 20]] },      // DS 19-24
        { id: 4, line: 13, splits: [[14, 15], [11, 14]] }       // DS 13-18
    ];

    // --- 2. STATE INITIALIZATION ---
    if (!state.level) state.level = 1;
    if (!state.side) state.side = 'A'; // 'A' or 'B'
    if (!state.activeBets) state.activeBets = []; // To track what we bet last time

    // --- 3. PROCESS LAST SPIN RESULT ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Determine if we won and what type of win
        let hitStreet = false;
        let hitSplit = false;

        // Check against our last placed bets stored in state
        if (state.activeBets && state.activeBets.length > 0) {
            // Helper: Check if number is in a line (Double Street)
            // A line starting at X covers X to X+5
            const isLineHit = (startNum, hitNum) => hitNum >= startNum && hitNum <= startNum + 5;
            
            // Helper: Check if number is in a split pair
            const isSplitHit = (pair, hitNum) => pair.includes(hitNum);

            // Reconstruct the logic of what we bet to verify win type
            // (We could store this in state, but simpler to check logic)
            // Actually, simply iterating the activeBets is unreliable for "Type" detection
            // unless we tagged them. Let's use the current state before we updated it?
            // No, we need to know if the *previous* spin won.
            
            // We can infer win type by looking at the bet definitions for the CURRENT state.activeBets
            // But wait, we haven't updated state.level yet. The state.level currently reflects
            // the level used for the PREVIOUS spin.
            
            const previousSideSets = state.side === 'A' ? SETS_A : SETS_B;
            // How many sets were active?
            const activeCount = state.level >= 4 ? 4 : state.level;
            const setsPlayed = previousSideSets.slice(0, activeCount);

            for (const set of setsPlayed) {
                if (isLineHit(set.line, lastNum)) hitStreet = true;
                for (const splitPair of set.splits) {
                    if (isSplitHit(splitPair, lastNum)) hitSplit = true;
                }
            }
        }

        // --- PROGRESSION LOGIC ---
        if (hitSplit) {
            // Major Win: Reset and Switch
            state.level = 1;
            state.side = state.side === 'A' ? 'B' : 'A';
        } else if (hitStreet) {
            // Small Win (Street Only): Rebet (Maintain Level)
            // No change to level or side
        } else {
            // Loss
            if (state.level < 8) {
                state.level++;
            } else {
                // Bust (Max Progression reached): Reset
                state.level = 1;
                state.side = state.side === 'A' ? 'B' : 'A';
            }
        }
    }

    // --- 4. CALCULATE NEW BETS ---
    
    const bets = [];
    const currentSets = state.side === 'A' ? SETS_A : SETS_B;
    
    // Determine how many sets to play (Expansion phase logic)
    // L1=1 set, L2=2 sets, L3=3 sets, L4-L8=4 sets
    const setsToPlaceCount = state.level >= 4 ? 4 : state.level;
    const activeSets = currentSets.slice(0, setsToPlaceCount);

    // Determine Multipliers (Aggressive phase logic)
    let multiplier = 1;
    let streetAdder = 0;

    if (state.level === 5) {
        multiplier = 2; // First double
        streetAdder = STREET_ADDER; // Add $6
    } else if (state.level === 6) {
        multiplier = 4;
        streetAdder = STREET_ADDER * 2;
    } else if (state.level === 7) {
        multiplier = 8;
        streetAdder = STREET_ADDER * 4;
    } else if (state.level === 8) {
        multiplier = 16;
        streetAdder = STREET_ADDER * 8;
    }
    // Levels 1-4 stay at multiplier 1, adder 0

    // Generate Bet Objects
    activeSets.forEach(set => {
        // 1. Street (Line) Bet
        let streetAmount = (STREET_BASE * multiplier) + streetAdder;
        
        // Clamp Street Bet
        streetAmount = Math.max(streetAmount, config.betLimits.min); // Inside min
        streetAmount = Math.min(streetAmount, config.betLimits.max);

        bets.push({
            type: 'line',
            value: set.line, // The starting number of the double street (e.g., 1 for 1-6)
            amount: streetAmount
        });

        // 2. Split Bets
        set.splits.forEach(splitPair => {
            let splitAmount = SPLIT_UNIT * multiplier;

            // Clamp Split Bet
            splitAmount = Math.max(splitAmount, config.betLimits.min);
            splitAmount = Math.min(splitAmount, config.betLimits.max);

            bets.push({
                type: 'split',
                value: splitPair, // Array [n1, n2]
                amount: splitAmount
            });
        });
    });

    // Store active bets metadata for next spin analysis (optional, but good for debugging)
    state.activeBets = bets;

    return bets;
}