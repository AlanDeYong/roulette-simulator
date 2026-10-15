/*
 * Strategy: I'm All In (Roger Bennett) - Randomized Non-Overlapping Version
 * Source: https://www.youtube.com/watch?v=ZygTi8G_oWc (The Roulette Master)
 *
 * The Logic: 
 * A progression strategy utilizing inside bets to incrementally expand board coverage.
 * This version dynamically randomizes the betting locations every time a new progression 
 * starts. It utilizes a Set tracker to ensure that no single numbers overlap across 
 * the corners, streets, splits, and straight bets within a single progression cycle.
 *
 * The Progression:
 * - Level 1: 2 Random Corner bets (1 base unit each).
 * - Level 2 (Loss): Keep Corners, add 2 Random Street bets. All bets are now 2 units.
 * - Level 3 (Loss): Keep previous, add 2 Random Split bets. Existing bets increase to 3u, new splits are 1u.
 * - Level 4 (Loss): Keep previous, add 2 Random Single bets. Existing bets increase to 4u, splits to 2u, new singles are 1u.
 * 
 * - On ANY win: The progression resets immediately to Level 1, and NEW random spots are chosen.
 * - On a Level 4 loss: A "hard stop" triggers. The progression resets to Level 1 (with new spots), 
 *   but the base unit is DOUBLED to gradually recover the specific drawdown.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper: Generate randomized, non-overlapping board positions
    const generatePositions = () => {
        const covered = new Set();
        const pos = { corners: [], streets: [], splits: [], singles: [] };
        
        // Simple array shuffler
        const shuffle = arr => arr.sort(() => 0.5 - Math.random());

        // 1. Pick 2 non-overlapping Corners
        let cCands = [1,2,4,5,7,8,10,11,13,14,16,17,19,20,22,23,25,26,28,29,31,32,34,35];
        shuffle(cCands);
        for (let c of cCands) {
            if (pos.corners.length >= 2) break;
            let nums = [c, c + 1, c + 3, c + 4]; // The 4 numbers in the corner
            if (!nums.some(n => covered.has(n))) {
                pos.corners.push(c);
                nums.forEach(n => covered.add(n));
            }
        }

        // 2. Pick 2 non-overlapping Streets
        let stCands = [1,4,7,10,13,16,19,22,25,28,31,34];
        shuffle(stCands);
        for (let s of stCands) {
            if (pos.streets.length >= 2) break;
            let nums = [s, s + 1, s + 2]; // The 3 numbers in the street
            if (!nums.some(n => covered.has(n))) {
                pos.streets.push(s);
                nums.forEach(n => covered.add(n));
            }
        }

        // 3. Pick 2 non-overlapping Splits
        let spCands = [];
        for (let i = 1; i <= 33; i++) spCands.push([i, i + 3]); // vertical splits
        for (let i = 1; i <= 36; i++) {
            if (i % 3 !== 0) spCands.push([i, i + 1]); // horizontal splits
        }
        shuffle(spCands);
        for (let sp of spCands) {
            if (pos.splits.length >= 2) break;
            if (!sp.some(n => covered.has(n))) {
                pos.splits.push(sp);
                sp.forEach(n => covered.add(n));
            }
        }

        // 4. Pick 2 non-overlapping Singles
        let sgCands = [];
        for (let i = 0; i <= 36; i++) sgCands.push(i);
        shuffle(sgCands);
        for (let sg of sgCands) {
            if (pos.singles.length >= 2) break;
            if (!covered.has(sg)) {
                pos.singles.push(sg);
                covered.add(sg);
            }
        }
        
        return pos;
    };

    // 1. Initialize State Persistence
    if (typeof state.level === 'undefined') {
        state.level = 1;
        state.baseUnit = Math.max(config.betLimits.min, 5); 
        state.lastBankroll = bankroll;
        state.highestBankroll = bankroll;
        state.positions = generatePositions(); // Generate spots for the first time
    }

    // 2. Determine Win/Loss for the previous spin
    if (spinHistory.length > 0) {
        const lastSpinWon = bankroll > state.lastBankroll;
        
        if (lastSpinWon) {
            // Win Condition
            state.level = 1;
            state.positions = generatePositions(); // Re-randomize spots after a win
            
            if (bankroll >= state.highestBankroll || bankroll >= config.startingBankroll) {
                state.baseUnit = Math.max(config.betLimits.min, 5);
            }
        } else {
            // Loss Condition
            state.level++;
            
            // Hard Stop condition
            if (state.level > 4) {
                state.level = 1;
                state.baseUnit = state.baseUnit * 2;
                state.positions = generatePositions(); // Re-randomize spots after a hard stop
            }
        }
    }

    // Update trackers
    state.lastBankroll = bankroll;
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    let bets = [];
    let u = state.baseUnit;

    // Helper function to calculate amounts and clamp to table limits
    const addBet = (type, value, units) => {
        let amount = units * u;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        bets.push({ type, value, amount });
    };

    // 3. Build the bets using the stored, non-overlapping randomized positions
    if (state.level >= 1) {
        let cUnits = state.level;
        addBet('corner', state.positions.corners[0], cUnits);
        addBet('corner', state.positions.corners[1], cUnits);
    }
    
    if (state.level >= 2) {
        let stUnits = state.level;
        addBet('street', state.positions.streets[0], stUnits);
        addBet('street', state.positions.streets[1], stUnits);
    }
    
    if (state.level >= 3) {
        let spUnits = state.level - 2;
        addBet('split', state.positions.splits[0], spUnits);
        addBet('split', state.positions.splits[1], spUnits);
    }
    
    if (state.level >= 4) {
        let sgUnits = state.level - 3;
        addBet('number', state.positions.singles[0], sgUnits);
        addBet('number', state.positions.singles[1], sgUnits);
    }

    return bets;
}