/**
 * Strategy: Elevate 3.0 (7-Level Custom Progression)
 * Source: Bet With Mo (https://youtu.be/qnK6Ufpa_k0) - Modified Ruleset
 * * * The Logic: 
 * Bets target 9-number blocks (3 Straights, 3 Splits, 3 Streets).
 * Side A targets Dozen 1 (1-9). Side B targets Dozen 3 (28-36). Dozen 2 (13-21) acts as a backup.
 * * * The Progression:
 * - Level 1: Base layout on Side A or Side B.
 * - Level 2 (Loss 1): Add the exact same layout to the middle dozen (Dozen 2).
 * - Level 3 (Loss 2): Rebet both dozens, increase ALL street bets by 2 units.
 * - Level 4 (Loss 3): Rebet both dozens, increase ALL street bets by 2 more units.
 * - Level 5 (Loss 4): Rebet both dozens, increase ALL street bets by 2 more units.
 * - Level 6 (Loss 5): Rebet both dozens, double up ALL bet amounts.
 * - Level 7 (Loss 6): Rebet both dozens, double up ALL bet amounts again.
 * * * The Goal: 
 * - On "Full Win" (hitting a Straight number): Reset to Level 1, clear Dozen 2, and switch starting sides.
 * - On "Small Win/Push" (hitting a Street/Split only): Rebet current level exactly as is.
 * - Survive cold streaks by widening board coverage before aggressively scaling bets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Layout Blueprints
    const layouts = {
        1: { straights: [3, 6, 9], splits: [[2,3], [5,6], [8,9]], streets: [1, 4, 7] },
        2: { straights: [15, 18, 21], splits: [[14,15], [17,18], [20,21]], streets: [13, 16, 19] },
        3: { straights: [30, 33, 36], splits: [[29,30], [32,33], [35,36]], streets: [28, 31, 34] }
    };

    // 2. Initialize State
    if (state.level === undefined) {
        state.level = 1; // Tracks progression 1 through 7
        state.side = 1;  // 1 for Dozen 1 (Side A), 3 for Dozen 3 (Side B)
    }

    // Determine currently active dozens based on level
    let activeDozens = [state.side];
    if (state.level >= 2) {
        activeDozens.push(2); // Add Dozen 2 layout on Level 2 or higher
    }

    // 3. Evaluate Last Spin Result
    if (spinHistory.length > 0) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        
        let isFullWin = false;
        let isSmallWin = false;

        // Check against active layouts
        for (const doz of activeDozens) {
            const layout = layouts[doz];
            
            // Check for Full Win (Jackpot on a Straight)
            if (layout.straights.includes(lastNum)) {
                isFullWin = true;
                break;
            }
            
            // Check for Small Win/Push (Hit within the street boundaries)
            for (const streetStart of layout.streets) {
                if (lastNum >= streetStart && lastNum <= streetStart + 2) {
                    isSmallWin = true;
                }
            }
        }

        // Apply Progression Rules
        if (isFullWin) {
            state.level = 1;
            state.side = state.side === 1 ? 3 : 1; // Switch sides
        } else if (isSmallWin) {
            // Small win or push: Rebet and spin (Level stays exactly the same)
            state.level = state.level; 
        } else {
            // Loss: Advance level (cap at 7)
            state.level = Math.min(7, state.level + 1);
        }
    }

    // Re-evaluate active dozens in case of a level reset/change during evaluation
    activeDozens = [state.side];
    if (state.level >= 2) {
        activeDozens.push(2);
    }

    // 4. Calculate Bet Amounts based on Level
    const unit = Math.max(1, config.betLimits.min);
    
    // Base amounts
    let baseStraight = unit;
    let baseSplit = unit;
    let baseStreet = unit * 2;

    // Apply Level 3, 4, 5 Street Increments (+2 units per level)
    if (state.level >= 3) baseStreet += (unit * 2);
    if (state.level >= 4) baseStreet += (unit * 2);
    if (state.level >= 5) baseStreet += (unit * 2);

    // Apply Level 6, 7 Global Multipliers
    let globalMultiplier = 1;
    if (state.level >= 6) globalMultiplier *= 2;
    if (state.level >= 7) globalMultiplier *= 2;

    let finalStraight = baseStraight * globalMultiplier;
    let finalSplit = baseSplit * globalMultiplier;
    let finalStreet = baseStreet * globalMultiplier;

    // 5. Clamp to Config Limits (Crucial)
    finalStraight = Math.max(config.betLimits.min, Math.min(finalStraight, config.betLimits.max));
    finalSplit = Math.max(config.betLimits.min, Math.min(finalSplit, config.betLimits.max));
    finalStreet = Math.max(config.betLimits.min, Math.min(finalStreet, config.betLimits.max));

    // 6. Generate Bet Array
    const bets = [];

    for (const doz of activeDozens) {
        const layout = layouts[doz];
        
        layout.straights.forEach(num => {
            bets.push({ type: 'number', value: num, amount: finalStraight });
        });
        
        layout.splits.forEach(splitArr => {
            bets.push({ type: 'split', value: splitArr, amount: finalSplit });
        });
        
        layout.streets.forEach(streetNum => {
            bets.push({ type: 'street', value: streetNum, amount: finalStreet });
        });
    }

    return bets;
}