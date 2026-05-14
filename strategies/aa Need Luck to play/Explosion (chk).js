/**
 * Roulette Strategy: Explosion (Corrected Layout & Progression)
 * Source: CEG Dealer School - https://www.youtube.com/watch?v=UNbO4AiG7Tk
 * * * The Logic: 
 * The strategy places a specific overlapping pattern of bets in both the 2nd and 3rd dozens:
 * - 2 units on a Double Street
 * - 1 unit on two distinct Corners
 * - 1 unit on two distinct Splits
 * This creates a 6-unit base investment per dozen (12 units total for both). 
 * The overlap creates high-payout "sweet spots" while maintaining coverage to sustain streaks.
 * * * The Progression:
 * - Level 1 (Base): Bet the 6-unit pattern on both the 2nd and 3rd dozens.
 * - On Loss at Level 1: Rebet the exact same Level 1 pattern.
 * - On Win at Level 1: Identify which dozen pattern caught the winning number.
 * Transition to Level 2 ("Explosion") and rebet ONLY the winning dozen's pattern.
 * Increase the bet sizes: Add 4 units to the Double Street, and add 2 units to all Splits/Corners.
 * - On Loss (or Win) at Level 2: Reset entirely back to Level 1 to lock in profit or start over.
 * * * The Goal: 
 * Hit a number covered by the initial layout, then isolate that active sector and press 
 * the bet aggressively with house money to hit an "explosion" payout, followed by an immediate reset.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const baseUnit = Math.max(config.betLimits.min, 5); // Default to 5 if minimum permits

    // 2. Define Layouts
    const dz2Layout = [
        { type: 'line', value: 16, baseUnits: 2 },             // Covers 16-21
        { type: 'corner', value: 16, baseUnits: 1 },           // Covers 16, 17, 19, 20
        { type: 'corner', value: 17, baseUnits: 1 },           // Covers 17, 18, 20, 21
        { type: 'split', value: [14, 17], baseUnits: 1 },      // Covers 14, 17
        { type: 'split', value: [20, 23], baseUnits: 1 }       // Covers 20, 23
    ];

    const dz3Layout = [
        { type: 'line', value: 28, baseUnits: 2 },             // Covers 28-33
        { type: 'corner', value: 28, baseUnits: 1 },           // Covers 28, 29, 31, 32
        { type: 'corner', value: 29, baseUnits: 1 },           // Covers 29, 30, 32, 33
        { type: 'split', value: [26, 29], baseUnits: 1 },      // Covers 26, 29
        { type: 'split', value: [32, 35], baseUnits: 1 }       // Covers 32, 35
    ];

    // Array of all numbers explicitly covered by each pattern for win detection
    const dz2Numbers = [14, 16, 17, 18, 19, 20, 21, 23];
    const dz3Numbers = [26, 28, 29, 30, 31, 32, 33, 35];

    // 3. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.targetLayout = null; // Used during Explosion phase to store the winning layout
        state.lastBetPlaced = false;
    }

    // 4. Progression Logic
    if (spinHistory.length > 0 && state.lastBetPlaced) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;

        if (state.level === 1) {
            // Check if Dozen 2 pattern won
            if (dz2Numbers.includes(lastSpin)) {
                state.level = 2;
                state.targetLayout = dz2Layout;
            } 
            // Check if Dozen 3 pattern won
            else if (dz3Numbers.includes(lastSpin)) {
                state.level = 2;
                state.targetLayout = dz3Layout;
            } 
            // Loss
            else {
                state.level = 1;
                state.targetLayout = null;
            }
        } else if (state.level === 2) {
            // Reset after an explosion bet (whether win or loss) to secure profits/protect bankroll
            state.level = 1;
            state.targetLayout = null;
        }
    }

    // 5. Generate Bets Helper Function
    const generateBets = (level, target) => {
        let currentBets = [];
        let activeLayouts = level === 1 ? [dz2Layout, dz3Layout] : [target];

        for (const layout of activeLayouts) {
            for (const pos of layout) {
                let currentUnits = pos.baseUnits;

                // Apply Level 2 unit increases
                if (level === 2) {
                    if (pos.type === 'line') {
                        currentUnits += 4; // Increase double street by 4 units
                    } else if (pos.type === 'corner' || pos.type === 'split') {
                        currentUnits += 2; // Increase splits and corners by 2 units
                    }
                }

                let amount = baseUnit * currentUnits;
                
                // Clamp to config limits
                amount = Math.max(amount, config.betLimits.min);
                amount = Math.min(amount, config.betLimits.max);

                currentBets.push({
                    type: pos.type,
                    value: pos.value,
                    amount: amount
                });
            }
        }
        return currentBets;
    };

    // 6. Build and Validate Bets
    let bets = generateBets(state.level, state.targetLayout);
    let totalAmount = bets.reduce((sum, b) => sum + b.amount, 0);

    // Bankroll Safety Check
    if (totalAmount > bankroll) {
        if (state.level === 2) {
            // If we can't afford the Explosion press, fall back to base level
            state.level = 1;
            state.targetLayout = null;
            bets = generateBets(state.level, state.targetLayout);
            totalAmount = bets.reduce((sum, b) => sum + b.amount, 0);
            
            // If we still can't afford base level, stop betting
            if (totalAmount > bankroll) return [];
        } else {
            return []; // Completely out of money for base bets
        }
    }

    state.lastBetPlaced = true;
    return bets;
}