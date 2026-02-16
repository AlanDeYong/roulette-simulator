/**
 * STRATEGY: Top Level 2.0 (The "Casino Matchmaker" Upgrade)
 * * SOURCE:
 * - Video: "We Upgraded the Top Level Roulette Strategy – Here’s What Happened"
 * - Channel: Casino Matchmaker
 * - URL: https://www.youtube.com/watch?v=J4SXGOy_G68
 * * LOGIC:
 * This is a coverage-based strategy that attempts to turn the "Top Column" (3rd Column)
 * into a profitable zone while covering specific Streets and Splits in the first half of the board.
 * * THE SETUP (Level 1):
 * - 3 Units on Street 1-3
 * - 1 Unit on Split 2-3 (Targeting the intersection of Street and Column)
 * - 3 Units on the Top Column (Column 3)
 * * THE PROGRESSION (Levels 2-5):
 * - On a LOSS: Increase Level by 1.
 * - Add a new "Block" of bets:
 * - +3 Units on the next Street (e.g., 4-6, then 7-9)
 * - +1 Unit on the next relevant Split (e.g., 5-6, 8-9)
 * - +2 Units added to the Top Column bet.
 * - The +2 on the column (paying 2:1) covers the cost of the added bets (3+1+2 = 6 cost, 2*3 = 6 return),
 * maintaining profitability on column hits.
 * * THE JACKPOT ZONES:
 * Numbers 3, 6, 9, 12, 15 are "Jackpots" because they are hit by the Street, the Split, AND the Column.
 * * STOP LOSS / RESET:
 * - On a WIN: Reset to Level 1.
 * - On Level 5 Loss: Hard Reset to Level 1. 
 * (Note: The video shows a Martingale after Level 5, but also suggests "Stopping at 15". 
 * To ensure bankroll longevity as requested by the user context, we implement the "Level 5 Reset" protocol).
 * * CONFIDENCE: 0.85 (High coverage, but susceptible to streaks of 2nd/1st column numbers not in covered streets).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. Configuration & Helper Functions ---

    // Define the progression limit
    const MAX_LEVEL = 5;

    // Define the betting blocks for each level
    // Street: The starting number of the street (covers start, start+1, start+2)
    // Split: The specific numbers to split
    const LEVELS = [
        { streetStart: 1, split: [2, 3] },    // Level 1
        { streetStart: 4, split: [5, 6] },    // Level 2
        { streetStart: 7, split: [8, 9] },    // Level 3
        { streetStart: 10, split: [11, 12] }, // Level 4
        { streetStart: 13, split: [14, 15] }  // Level 5
    ];

    // Helper: Calculate units based on table minimums
    // We strictly adhere to the 3:1:X ratio.
    // Street = 3 units, Split = 1 unit.
    const baseUnit = config.betLimits.min; 
    
    // --- 2. State Management ---

    if (state.currentLevel === undefined) state.currentLevel = 1;
    if (!state.logData) state.logData = [];

    // --- 3. Process Last Spin (If available) ---

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Determine if the last spin was a "Win" based on our previous coverage
        // A win triggers a reset. A loss triggers progression.
        let isWin = false;

        // 1. Did we hit the Top Column (Column 3: 3, 6, 9... 36)?
        if (lastNumber !== 0 && lastNumber % 3 === 0) {
            isWin = true;
        }

        // 2. Did we hit any of the covered Streets?
        // We covered streets up to the *previous* level
        for (let i = 0; i < state.currentLevel; i++) {
            const start = LEVELS[i].streetStart;
            if (lastNumber >= start && lastNumber <= start + 2) {
                isWin = true;
            }
        }

        if (isWin) {
            state.currentLevel = 1;
            state.logData.push(`Spin ${spinHistory.length}: WIN on ${lastNumber}. Reset to Level 1.`);
        } else {
            state.currentLevel++;
            state.logData.push(`Spin ${spinHistory.length}: LOSS on ${lastNumber}. Progressing to Level ${state.currentLevel}.`);
            
            // Safety Protocol: If we exceed Level 5, Reset.
            if (state.currentLevel > MAX_LEVEL) {
                state.currentLevel = 1;
                state.logData.push(`Spin ${spinHistory.length}: Max Level Exceeded. Safety Reset to Level 1.`);
            }
        }
    }

    // --- 4. Periodic Logging (Save File) ---
    
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        // Convert log array to string
        const logContent = state.logData.join('\n');
        // Save (Fire and forget, strictly speaking, but we return the promise logic if needed)
        utils.saveFile("top-level-2-log.txt", logContent)
            .catch(err => console.error("Error saving log:", err));
        
        // Clear memory to prevent bloat, keeping the last few lines for context if needed
        state.logData = [`--- Log cleared at Spin ${spinHistory.length} ---`];
    }

    // --- 5. Construct Bets ---

    const bets = [];
    
    // Safety check: Bankroll availability (rudimentary)
    if (bankroll < baseUnit * 7) {
        // Not enough money for even Level 1 ($7 minimum if unit is $1)
        return [];
    }

    // A. Top Column Bet
    // Base is 3 units (Level 1). Add 2 units for every level thereafter.
    // Lvl 1: 3, Lvl 2: 5, Lvl 3: 7...
    let columnUnits = 3 + ((state.currentLevel - 1) * 2);
    
    // Apply Limits to Column
    let columnAmount = columnUnits * baseUnit;
    columnAmount = Math.max(columnAmount, config.betLimits.minOutside);
    columnAmount = Math.min(columnAmount, config.betLimits.max);

    bets.push({
        type: 'column',
        value: 3, // 3rd Column
        amount: columnAmount
    });

    // B. Street and Split Bets (Cumulative up to current level)
    // We add the blocks for Level 1, then Level 2... up to currentLevel.
    for (let i = 0; i < state.currentLevel; i++) {
        const levelConfig = LEVELS[i];

        // 1. Street Bet (3 units)
        let streetAmount = 3 * baseUnit;
        streetAmount = Math.min(streetAmount, config.betLimits.max); // Clamp max
        // Note: min is guaranteed by baseUnit = config.betLimits.min

        bets.push({
            type: 'street',
            value: levelConfig.streetStart,
            amount: streetAmount
        });

        // 2. Split Bet (1 unit)
        let splitAmount = 1 * baseUnit;
        splitAmount = Math.min(splitAmount, config.betLimits.max);

        bets.push({
            type: 'split',
            value: levelConfig.split,
            amount: splitAmount
        });
    }

    return bets;
}