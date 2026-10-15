/*
 * Strategy: I'm All In (Roger Bennett) - Hot Number Targeted Version
 * Source: https://www.youtube.com/watch?v=ZygTi8G_oWc (The Roulette Master)
 *
 * The Logic: 
 * A progression strategy utilizing inside bets to incrementally expand board coverage.
 * - Phase 1 (Spins 1-36): Betting positions are chosen completely randomly, ensuring no overlaps.
 * - Phase 2 (Spins 37+): Uses a 37-spin rolling window to identify "hot" numbers. 
 *   It attempts to center the required bet shapes (Corners, Streets, etc.) over these hot numbers.
 *   Tie-breaker for hot numbers: Most recently hit.
 *   If a hot number is already covered by a previous bet shape, it skips down the ranked list 
 *   to the next hottest uncovered number.
 *
 * The Progression:
 * - Level 1: 2 Corner bets (1 base unit each).
 * - Level 2 (Loss): Keep Corners, add 2 Street bets. All bets are now 2 units.
 * - Level 3 (Loss): Keep previous, add 2 Split bets. Existing bets increase to 3u, new splits are 1u.
 * - Level 4 (Loss): Keep previous, add 2 Single bets. Existing bets increase to 4u, splits to 2u, new singles are 1u.
 * 
 * - On ANY win: The progression resets to Level 1, and NEW targets are chosen based on the latest 37 spins.
 * - On a Level 4 loss: A "hard stop" triggers. Progression resets to Level 1 (new targets), base unit DOUBLES.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    
    // Helper: Find valid corner top-left numbers that contain 'n'
    const getValidCornersForNumber = (n) => {
        const c = [];
        if (n === 0) return c;
        const candidates = [n, n - 1, n - 3, n - 4];
        candidates.forEach(cand => {
            // Valid corner top-left must be 1-32 and not in the rightmost column (mod 3 != 0)
            if (cand >= 1 && cand <= 32 && cand % 3 !== 0) c.push(cand);
        });
        return c;
    };

    // Helper: Find valid street start number that contains 'n'
    const getStreetForNumber = (n) => {
        if (n === 0) return null;
        return Math.floor((n - 1) / 3) * 3 + 1;
    };

    // Helper: Find valid split arrays that contain 'n'
    const getValidSplitsForNumber = (n) => {
        if (n === 0) return [[0,1], [0,2], [0,3]];
        const splits = [];
        if (n + 3 <= 36) splits.push([n, n + 3]); // vertical down
        if (n - 3 >= 1)  splits.push([n - 3, n]); // vertical up
        if (n % 3 !== 0) splits.push([n, n + 1]); // horizontal right
        if (n % 3 !== 1) splits.push([n - 1, n]); // horizontal left
        return splits;
    };

    // Main Position Generator
    const generatePositions = () => {
        const covered = new Set();
        const pos = { corners: [], streets: [], splits: [], singles: [] };
        
        let hotList = [];
        let unhit = [];
        for (let i = 0; i <= 36; i++) unhit.push(i);

        // Phase 2: If we have enough history, build the ranked hot list
        if (spinHistory.length >= 37) {
            const counts = {};
            const lastSeen = {};
            const window = spinHistory.slice(-37);
            
            window.forEach((spin, index) => {
                const n = spin.winningNumber;
                counts[n] = (counts[n] || 0) + 1;
                lastSeen[n] = index; // Higher index = more recent
            });
            
            // Sort by frequency (desc), then by recency (desc)
            hotList = Object.keys(counts).map(Number).sort((a, b) => {
                if (counts[b] !== counts[a]) return counts[b] - counts[a];
                return lastSeen[b] - lastSeen[a];
            });
            
            // Remove hot numbers from the unhit fallback list
            unhit = unhit.filter(n => !hotList.includes(n));
        }
        
        // Shuffle unhit numbers and append them to ensure we can always fill required bets
        unhit.sort(() => 0.5 - Math.random());
        hotList = hotList.concat(unhit);

        const shuffle = arr => arr.sort(() => 0.5 - Math.random());

        // 1. Pick 2 non-overlapping Corners centered on hottest available numbers
        for (let n of hotList) {
            if (pos.corners.length >= 2) break;
            if (covered.has(n)) continue; // Target number is already covered, move to next hottest
            
            let possibleCorners = getValidCornersForNumber(n);
            shuffle(possibleCorners); // Randomize if multiple corners can cover this hot number
            
            for (let c of possibleCorners) {
                let nums = [c, c + 1, c + 3, c + 4];
                if (!nums.some(x => covered.has(x))) {
                    pos.corners.push(c);
                    nums.forEach(x => covered.add(x));
                    break; 
                }
            }
        }

        // 2. Pick 2 non-overlapping Streets
        for (let n of hotList) {
            if (pos.streets.length >= 2) break;
            if (covered.has(n)) continue;
            
            let s = getStreetForNumber(n);
            if (s !== null) {
                let nums = [s, s + 1, s + 2];
                if (!nums.some(x => covered.has(x))) {
                    pos.streets.push(s);
                    nums.forEach(x => covered.add(x));
                }
            }
        }

        // 3. Pick 2 non-overlapping Splits
        for (let n of hotList) {
            if (pos.splits.length >= 2) break;
            if (covered.has(n)) continue;
            
            let possibleSplits = getValidSplitsForNumber(n);
            shuffle(possibleSplits);
            
            for (let sp of possibleSplits) {
                if (!sp.some(x => covered.has(x))) {
                    pos.splits.push(sp);
                    sp.forEach(x => covered.add(x));
                    break;
                }
            }
        }

        // 4. Pick 2 non-overlapping Singles
        for (let n of hotList) {
            if (pos.singles.length >= 2) break;
            if (!covered.has(n)) {
                pos.singles.push(n);
                covered.add(n);
            }
        }
        
        return pos;
    };

    // --- State Initialization & Progression Engine ---
    
    if (typeof state.level === 'undefined') {
        state.level = 1;
        state.baseUnit = Math.max(config.betLimits.min, 5); 
        state.lastBankroll = bankroll;
        state.highestBankroll = bankroll;
        state.positions = generatePositions(); // Generates random spots initially
    }

    if (spinHistory.length > 0) {
        const lastSpinWon = bankroll > state.lastBankroll;
        
        if (lastSpinWon) {
            state.level = 1;
            state.positions = generatePositions(); // Recalculate based on rolling window
            
            if (bankroll >= state.highestBankroll || bankroll >= config.startingBankroll) {
                state.baseUnit = Math.max(config.betLimits.min, 5);
            }
        } else {
            state.level++;
            
            if (state.level > 4) {
                state.level = 1;
                state.baseUnit = state.baseUnit * 2;
                state.positions = generatePositions(); // Recalculate after hard stop
            }
        }
    }

    state.lastBankroll = bankroll;
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    let bets = [];
    let u = state.baseUnit;

    const addBet = (type, value, units) => {
        let amount = units * u;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        bets.push({ type, value, amount });
    };

    // --- Build Bets Using State-Stored Positions ---
    
    if (state.level >= 1) {
        addBet('corner', state.positions.corners[0], state.level);
        addBet('corner', state.positions.corners[1], state.level);
    }
    
    if (state.level >= 2) {
        addBet('street', state.positions.streets[0], state.level);
        addBet('street', state.positions.streets[1], state.level);
    }
    
    if (state.level >= 3) {
        addBet('split', state.positions.splits[0], state.level - 2);
        addBet('split', state.positions.splits[1], state.level - 2);
    }
    
    if (state.level >= 4) {
        addBet('number', state.positions.singles[0], state.level - 3);
        addBet('number', state.positions.singles[1], state.level - 3);
    }

    return bets;
}