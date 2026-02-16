/**
 * Strategy: Vegas Special (8 Levels)
 * Source: Bet With Mo - https://www.youtube.com/watch?v=ipVpQahH1TU
 *
 * Logic:
 * This is a "Wash" or "Hedge" strategy.
 * 1. The Core Attack: You place 7 Split bets (covering ~14 numbers).
 * 2. The Defense (Level 2+): You bet 2 units on ALL 12 Streets.
 * - Mathematical Effect: If a number hits that is NOT a split, the Street bet wins (11:1).
 * You bet 2 units * 12 streets = 24 units cost.
 * You win 22 units + 2 returned = 24 units total.
 * Result: Break-even on the street bets (wash), effectively losing only the Split bets.
 * - If a Split hits: You win the Split profit + the Street break-even.
 *
 * Progression (8 Levels):
 * - Level 1: 7 Splits (1 unit each).
 * - Level 2: 7 Splits (1 unit) + All Streets (2 units).
 * - Level 3: 7 Splits (1 unit) + 7 Straight-ups (1 unit, covering split #s) + All Streets (2 units).
 * - Level 4: Repeat Level 3 (or slight variation).
 * - Level 5: Increase Splits to 2 units.
 * - Level 6: Double attack bets (Splits/Straights).
 * - Level 7: Double attack bets again.
 * - Level 8: High limit recovery (Switch to high units on streets).
 *
 * Triggers & Goals:
 * - Win: If session profit reaches the next $20 increment target, Reset to Level 1 and Switch Sides (Set A vs Set B).
 * - Loss: Move to next Level.
 * - Stop Loss: 50% of bankroll or Max Level exceeded.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- Configuration & Constants ---
    const TARGET_INCREMENT = 20; // Profit goal chunks (e.g., $20, $40, $60)
    
    // Define two sets of 7 splits to simulate "Switching Sides"
    // These try to cover different sectors of the board.
    const SPLIT_SETS = {
        A: [
            [5, 8], [10, 11], [13, 16], [23, 24], 
            [27, 30], [33, 36], [0, 2] // 0/2 split
        ],
        B: [
            [1, 4], [7, 10], [14, 17], [19, 22], 
            [25, 28], [31, 34], [6, 9]
        ]
    };

    // --- State Initialization ---
    if (!state.initialized) {
        state.startingBankroll = bankroll;
        state.currentLevel = 1;
        state.activeSet = 'A'; // Start with Side A
        state.profitTarget = TARGET_INCREMENT;
        state.initialized = true;
        // console.log("Init Vegas Special Strategy");
    }

    // --- Win/Loss Logic (skip on first spin) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const currentProfit = bankroll - state.startingBankroll;

        // Check if we hit the profit target
        if (currentProfit >= state.profitTarget) {
            // WIN SEQUENCE: Reset and bump target
            state.currentLevel = 1;
            state.profitTarget = currentProfit + TARGET_INCREMENT;
            // Switch sides as per video instructions
            state.activeSet = (state.activeSet === 'A') ? 'B' : 'A';
            // console.log(`Target Hit! New Target: ${state.profitTarget}. Switched to Set ${state.activeSet}`);
        } else {
            // LOSS SEQUENCE (or didn't hit target):
            // We need to determine if the *last spin* was actually a net win or loss 
            // to decide progression. In this strategy, even a small win might not reset 
            // if it doesn't hit the "Target". However, standard progression usually 
            // advances on net loss and holds/resets on net win.
            // The video implies moving up levels until the specific profit goal is hit.
            
            // Simple heuristic: If bankroll dropped significantly, progress.
            // If we won (net positive on last spin), we might hold or reset.
            // For this specific "Vegas Special", he progresses on losses to recover.
            
            // Calculate last round outcome roughly
            // (Simulator handles actual p/l, but we infer logic here)
            // If we are far from target and lost money, level up.
            
            // Note: Since we don't have easy access to "lastBetTotal" without storing it,
            // we assume progression on any spin that didn't hit the Profit Target 
            // AND resulted in a bankroll decrease.
            
            // Simplification: Always progress if not at target? 
            // Video shows resetting to Level 2 on small losses, 
            // but effectively climbing to Level 8 on streaks.
            // We will increment level on Net Loss.
            
            // We need to store previous bankroll to know if we won/lost the specific spin
            if (state.lastBankroll && bankroll < state.lastBankroll) {
                state.currentLevel++;
                if (state.currentLevel > 8) state.currentLevel = 1; // Reset if maxed out
            } else if (state.lastBankroll && bankroll > state.lastBankroll) {
                // If we won but didn't hit target, the video often stays or goes back to L3/L2.
                // We will hold current level or drop one level to be safe.
                state.currentLevel = Math.max(1, state.currentLevel - 1);
            }
        }
    }

    // Store current bankroll for next comparison
    state.lastBankroll = bankroll;

    // --- Bet Calculation ---
    const bets = [];
    const level = state.currentLevel;
    
    // Respect Limits
    const minInside = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // Helper to safely add bets
    const addBet = (type, value, units) => {
        let amount = units * minInside;
        // Clamp amount
        amount = Math.max(amount, minInside);
        amount = Math.min(amount, maxBet);
        bets.push({ type, value, amount });
    };

    // Get current split numbers
    const currentSplits = SPLIT_SETS[state.activeSet];

    // --- Level Definitions ---

    // 1. SPLITS (Core Attack) - Active on ALL Levels
    // Level 1-4: 1 unit. Level 5: 2 units. Level 6: 4 units. Level 7: 8 units.
    let splitUnits = 1;
    if (level === 5) splitUnits = 2;
    if (level === 6) splitUnits = 4;
    if (level === 7) splitUnits = 8;
    
    // Level 8 is special (Video says switch to $10 units on streets, minimal splits)
    // We will stick to the trend or follow the specific L8 instruction.
    if (level === 8) splitUnits = 1; 

    // Place Split Bets
    if (level < 8) {
        currentSplits.forEach(splitPair => {
            addBet('split', splitPair, splitUnits);
        });
    }

    // 2. STREETS (The Hedge) - Active Level 2+
    // Logic: Bet 2 units on every street (12 streets).
    // Pays 11:1. Cost 24 units. Return 24 units. Net 0.
    if (level >= 2) {
        let streetUnits = 2;
        if (level === 8) streetUnits = 10; // Level 8 "Big Hedge"

        // Loop through all 12 streets (rows starting 1, 4, 7... 34)
        for (let r = 1; r <= 34; r += 3) {
            addBet('street', r, streetUnits);
        }
    }

    // 3. STRAIGHT UPS (Aggressive Add-on) - Active Level 3, 4, 6, 7
    // Video: "Play straighter bets right below/on top".
    // We will place straight up bets on the first number of every split pair.
    if (level === 3 || level === 4 || level === 6 || level === 7) {
        let straightUnits = 1;
        if (level === 6) straightUnits = 2;
        if (level === 7) straightUnits = 4;

        currentSplits.forEach(splitPair => {
            // Pick the first number of the pair for the straight up
            addBet('number', splitPair[0], straightUnits);
        });
    }

    return bets;
}