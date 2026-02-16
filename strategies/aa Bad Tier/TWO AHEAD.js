/**
 * Strategy: Two Ahead System
 * * Source: 
 * Video: "TWO AHEAD - BEST ROULETTE STRATEGY | REAL CHANCE TO WIN BIG MONEY | PROFITABLE SYSTEM"
 * Channel: Bet With MO
 * URL: https://www.youtube.com/watch?v=xqOX6DEkTpE
 * * The Logic:
 * This is a "Shift and Cover" strategy. It divides the board into street segments.
 * It maintains coverage of two "blocks" of straight-up numbers (6 numbers total) 
 * and two "blocks" of Street bets (6 numbers total) ahead of the straight-ups.
 * * - Base Setup (Level 1): 
 * - 6 Straight-up bets (e.g., 1,2,3,4,5,6)
 * - 2 Street bets "Two Ahead" (e.g., Streets starting at 7 and 10)
 * - A safety bet on Zero (Split 0/00 or just 0).
 * * - The "Two Ahead" Shift:
 * - On a Loss, the window of bets shifts "forward" down the table by one street (3 numbers).
 * - The previous first street bet converts into 3 straight-up bets.
 * - A new street is added at the front.
 * * The Progression (Risk Management):
 * - Level 1-3: Base Unit bets ($1 on numbers, $2 on streets in video).
 * - Level 4+:  Double Unit bets ($2 on numbers, $4 on streets).
 * - Reset: The strategy resets to Level 1 and the starting position when a "Session Profit Goal" 
 * is reached (set to 20 units in this simulation) or after a specific win pattern.
 * * The Goal:
 * - Achieve small incremental profit targets (approx 20 units) then reset/switch sides.
 * - Survival through shifting coverage to chase the ball position.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_CHIP_INSIDE = config.betLimits.min;
    const MIN_CHIP_OUTSIDE = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;
    
    // The video uses $1 for numbers and $2 for streets. We establish a base unit ratio.
    // If min chip is 1, Number=1, Street=2. If min chip is 5, Number=5, Street=10.
    const BASE_UNIT = MIN_CHIP_INSIDE; 
    
    const PROFIT_TARGET_PER_CYCLE = 20 * BASE_UNIT; // Reset after winning 20 units
    
    // Valid Street Start Numbers: 1, 4, 7, 10, ... 34
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;                // Progression level (1-5+)
        state.headIndex = 2;            // Points to the first "Street" index in ALL_STREETS. 
                                        // 0=1, 1=4, 2=7. 
                                        // Default start: Nums(1-6), Streets(7,10). So head at 7 (index 2).
        state.startBankroll = bankroll; // Snapshot for profit tracking
        state.sessionProfit = 0;
        state.doubleUnits = false;      // Toggles on at Level 4
        state.initialized = true;
    }

    // --- 3. ANALYZE PREVIOUS SPIN ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.totalPayout || 0; // Assuming simulator provides this, else 0
        const lastBetAmount = state.lastBetAmount || 0;
        const isWin = lastWinAmount > 0; // Simple win check
        const netChange = lastWinAmount - lastBetAmount;

        state.sessionProfit += netChange;

        // LOGIC: Reset or Progress
        if (state.sessionProfit >= PROFIT_TARGET_PER_CYCLE) {
            // TARGET HIT: Reset everything
            state.level = 1;
            state.headIndex = 2; // Reset to top of board
            state.sessionProfit = 0;
            state.doubleUnits = false;
        } else if (isWin) {
            // WIN (but target not hit): 
            // Video behavior: "Small win... rebet". 
            // If it was a substantial win recovering losses, we might reset level, 
            // but the video implies staying steady or resetting only on specific profit markers.
            // We will hold current level on win to accumulate to target.
            // OPTIONAL: If deep in progression (Level 4+), a win usually warrants a reset to safety.
            if (state.level >= 4) {
                state.level = 1;
                state.headIndex = 2;
                state.doubleUnits = false;
            }
        } else {
            // LOSS: Progress
            state.level++;
            state.headIndex++; // Shift the "window" down the table
            
            // Wrap around check: If we run off the board (past 34), reset to top
            if (state.headIndex >= ALL_STREETS.length - 1) {
                state.headIndex = 2;
            }

            // Progression Rule: Double bets starting at Level 4
            if (state.level >= 4) {
                state.doubleUnits = true;
            }
        }
    }

    // --- 4. CALCULATE BETS ---
    const bets = [];
    let currentTotalBet = 0;
    
    // Determine Unit Size
    const unitMultiplier = state.doubleUnits ? 2 : 1;
    const numberBetAmt = Math.min(BASE_UNIT * unitMultiplier, MAX_BET);
    const streetBetAmt = Math.min(BASE_UNIT * 2 * unitMultiplier, MAX_BET); // Streets are 2 units in video
    const zeroBetAmt = Math.min(BASE_UNIT * unitMultiplier, MAX_BET);

    // 4.1. Place Straight Up Bets (Trailing Section)
    // The "Two Ahead" system leaves straight-up bets behind the street bets.
    // Based on start at headIndex=2 (Streets 7, 10), we cover the 2 blocks behind: 1-3, 4-6.
    
    // Get the two "blocks" (streets converted to numbers) behind the head
    const block1Index = state.headIndex - 2;
    const block2Index = state.headIndex - 1;

    const blocksToCoverAsNumbers = [];
    if (block1Index >= 0) blocksToCoverAsNumbers.push(ALL_STREETS[block1Index]);
    if (block2Index >= 0) blocksToCoverAsNumbers.push(ALL_STREETS[block2Index]);

    // Loop through blocks and place bet on every number in that street row
    blocksToCoverAsNumbers.forEach(startNum => {
        // A street starting at 'startNum' contains startNum, startNum+1, startNum+2
        for (let i = 0; i < 3; i++) {
            let num = startNum + i;
            bets.push({ type: 'number', value: num, amount: numberBetAmt });
            currentTotalBet += numberBetAmt;
        }
    });

    // 4.2. Place Street Bets (Leading Section)
    // We cover the current Head Index and the one after it (Two Ahead)
    const street1Start = ALL_STREETS[state.headIndex];
    // Check if second street exists on board
    const street2Start = (state.headIndex + 1 < ALL_STREETS.length) ? ALL_STREETS[state.headIndex + 1] : null;

    if (street1Start) {
        bets.push({ type: 'street', value: street1Start, amount: streetBetAmt });
        currentTotalBet += streetBetAmt;
    }
    if (street2Start) {
        bets.push({ type: 'street', value: street2Start, amount: streetBetAmt });
        currentTotalBet += streetBetAmt;
    }

    // 4.3. Place Zero Bet
    // Video splits 0/00. We will bet 0 straight up for compatibility, or split if US logic preferred.
    // To be safe and compatible with all table types, we bet straight up on 0.
    bets.push({ type: 'number', value: 0, amount: zeroBetAmt });
    currentTotalBet += zeroBetAmt;
    
    // US Table check (if 00 exists, bet it too - usually handled by 'basket' or specific split)
    // For this standard simulation, we usually assume single zero unless specified.
    
    // --- 5. SAVE STATE & RETURN ---
    state.lastBetAmount = currentTotalBet;
    
    return bets;
}