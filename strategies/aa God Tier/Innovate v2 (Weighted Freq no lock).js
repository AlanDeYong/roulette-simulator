
/**
 * STRATEGY: Innovate 2 (Incremental Locking + Weighted Rolling Frequency)
 * SOURCE: YouTube Channel "Bet With Mo" - Video: https://www.youtube.com/watch?v=2lNPusqEMMk
 *
 * LOGIC:
 * 1. Ranking: Rolling Window (Last X=111 spins). Weighted (Freq > Recency > Gap > Trend).
 * 2. Incremental Selection: 
 * - Bets are NOT pre-selected. They are selected only when the Progression requires more streets.
 * - Once selected, a Double Street and its internal bets are LOCKED until a full Reset.
 * 3. Street Internal Logic:
 * - Straight 1: Highest ranked number in street.
 * - Straight 2: 2nd Highest ranked number in street.
 * - Split: Must include 3rd Highest ranked number. Prioritizes a split that does NOT overlap with Straight 1 or 2.
 *
 * PROGRESSION:
 * - Level 1: Lock & Bet Best 2 Streets.
 * - Level 2: Keep Level 1 Bets + Lock & Bet Next Best 2 Streets (Total 4).
 * - Level 3: Keep Level 1-2 Bets + Lock & Bet Next Best 1 Street (Total 5).
 * - Level 4+: Bet all 5 Locked Streets.
 *
 * RECOVERY:
 * - STRAIGHT HIT: Hard Reset (Clear all locked streets, start fresh).
 * - SPLIT HIT: Rebet (Keep current level and locks).
 * - LOSS: Progress Level.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 0. CONFIGURATION
    const X = 90; 
    const DOUBLE_STREETS = [
        [1, 2, 3, 4, 5, 6],
        [7, 8, 9, 10, 11, 12],
        [13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24],
        [25, 26, 27, 28, 29, 30],
        [31, 32, 33, 34, 35, 36]
    ];
    const getStreetName = (nums) => `DS(${nums[0]}-${nums[nums.length - 1]})`;

    // 1. INITIALIZATION
    if (!state.level) state.level = 1;
    if (!state.lastTargets) state.lastTargets = { straights: [], splits: [] };
    if (!state.logHistory) state.logHistory = "";
    // Stores the specific bet objects for streets we have locked in
    if (!state.lockedStreets) state.lockedStreets = []; 

    // 2. CHECK PREVIOUS SPIN
    if (spinHistory.length > X && state.lastTargets.straights.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        const hitStraight = state.lastTargets.straights.includes(winningNum);
        const hitSplit = state.lastTargets.splits.some(pair => pair.includes(winningNum));

        if (hitStraight) {
            state.level = 1;
            state.lockedStreets = []; // CLEAR LOCKS: Enables fresh selection on next bet
        } else if (hitSplit) {
            // Rebet same level, keep locks
            state.level = state.level; 
        } else {
            state.level = Math.min(state.level + 1, 11);
        }
    }

    // 3. DATA SUFFICIENCY
    if (spinHistory.length < X) return [];

    // 4. STATISTICAL ANALYSIS (Weighted Rolling)
    const stats = [];
    const analysisWindow = spinHistory.slice(-X);

    for (let num = 0; num <= 36; num++) {
        let frequency = 0;
        let lastHitIndex = -1;       
        let secondLastHitIndex = -1; 
        
        for (let i = analysisWindow.length - 1; i >= 0; i--) {
            if (analysisWindow[i].winningNumber === num) {
                frequency++;
                if (lastHitIndex === -1) lastHitIndex = i;
                else if (secondLastHitIndex === -1) secondLastHitIndex = i;
            }
        }

        const recency = lastHitIndex !== -1 ? (analysisWindow.length - 1 - lastHitIndex) : 999;
        const currentGap = recency;
        const previousGap = secondLastHitIndex !== -1 ? (lastHitIndex - secondLastHitIndex) : 999;
        const gapGettingSmaller = (currentGap < previousGap);

        stats.push({
            number: num,
            frequency: frequency,
            recency: recency,      
            currentGap: currentGap, 
            trendBonus: gapGettingSmaller ? 1 : 0
        });
    }

    // Sort: Freq > Recency > Gap > Trend
    stats.sort((a, b) => {
        if (a.frequency !== b.frequency) return b.frequency - a.frequency;
        if (a.recency !== b.recency) return a.recency - b.recency;
        if (a.currentGap !== b.currentGap) return a.currentGap - b.currentGap;
        return b.trendBonus - a.trendBonus;
    });

    const rankMap = new Map();
    stats.forEach((stat, index) => rankMap.set(stat.number, index));

    // --- LOGGING ---
    const rankedNumbersList = stats.map(s => s.number).join(', ');
    const currentSpinNum = spinHistory.length + 1;
    const lockedCount = state.lockedStreets.length;
    
    // Log info
    const logLine = `Spin ${currentSpinNum} | Level: ${state.level} | Locked Streets: ${lockedCount}/5\n` +
                    `   > Weighted Rank (Top 15): [${rankedNumbersList.split(', ').slice(0, 15).join(', ')}...]\n` +
                    `   --------------------------------------------------\n`;

    state.logHistory += logLine;
    if (spinHistory.length % 50 === 0) {
        utils.saveFile("rankings_log.txt", state.logHistory);
    }
    // ----------------

    // 5. DETERMINE REQUIRED STREETS BASED ON LEVEL
    let targetStreetCount = 0;
    let baseUnit = 0;

    switch (state.level) {
        case 1: targetStreetCount = 2; baseUnit = 2; break;
        case 2: targetStreetCount = 4; baseUnit = 2; break;
        case 3: targetStreetCount = 5; baseUnit = 4; break; // Doubled
        case 4: targetStreetCount = 5; baseUnit = 5; break;
        case 5: targetStreetCount = 5; baseUnit = 6; break;
        case 6: targetStreetCount = 5; baseUnit = 7; break;
        case 7: targetStreetCount = 5; baseUnit = 8; break;
        case 8: targetStreetCount = 5; baseUnit = 9; break;
        case 9: targetStreetCount = 5; baseUnit = 10; break;
        case 10: targetStreetCount = 5; baseUnit = 20; break;
        case 11: targetStreetCount = 5; baseUnit = 40; break;
        default: targetStreetCount = 5; baseUnit = 40; break;
    }
    
    baseUnit = Math.max(baseUnit, config.betLimits.min);
    baseUnit = Math.min(baseUnit, config.betLimits.max);

    // 6. INCREMENTAL SELECTION LOGIC
    // If we need more streets than we currently have locked, select them now using LATEST stats.
    if (state.lockedStreets.length < targetStreetCount) {
        
        // Score all double streets based on CURRENT stats
        const streetScores = DOUBLE_STREETS.map((streetNumbers, index) => {
            let score = 0;
            streetNumbers.forEach(num => score += rankMap.get(num));
            return { index: index, numbers: streetNumbers, score: score };
        });
        // Sort by best score (lowest sum of ranks)
        streetScores.sort((a, b) => a.score - b.score);

        // Filter out streets we have ALREADY locked
        const lockedIndices = state.lockedStreets.map(s => s.streetIndex);
        const availableStreets = streetScores.filter(s => !lockedIndices.includes(s.index));

        // How many new ones do we need?
        const needed = targetStreetCount - state.lockedStreets.length;
        const newStreetsToLock = availableStreets.slice(0, needed);

        // Configure the bets for these new streets
        newStreetsToLock.forEach(streetObj => {
            const nums = streetObj.numbers;
            // Sort numbers in this street by CURRENT Rank
            const sortedNums = [...nums].sort((a, b) => rankMap.get(a) - rankMap.get(b));
            
            // 1. Highest Rank -> Straight
            const best1 = sortedNums[0];
            // 2. Next Highest Rank -> Straight
            const best2 = sortedNums[1];
            // 3. Next Highest (3rd) -> Target for Split
            const best3 = sortedNums[2];

            // 4. Split Selection Logic:
            // "choose a split does not yet has any bets which contain the next highest ranked number"
            // We need a split involving best3, but ideally not touching best1 or best2.
            
            // Valid pairs logic for 2x3 grid (Standard Double Street)
            const validPairs = [];
            // Horizontal
            if (nums.includes(nums[0]) && nums.includes(nums[1])) validPairs.push([nums[0], nums[1]]);
            if (nums.includes(nums[1]) && nums.includes(nums[2])) validPairs.push([nums[1], nums[2]]);
            if (nums.includes(nums[3]) && nums.includes(nums[4])) validPairs.push([nums[3], nums[4]]);
            if (nums.includes(nums[4]) && nums.includes(nums[5])) validPairs.push([nums[4], nums[5]]);
            // Vertical
            validPairs.push([nums[0], nums[3]]);
            validPairs.push([nums[1], nums[4]]);
            validPairs.push([nums[2], nums[5]]);

            // Filter pairs that include the 3rd best number
            const candidates = validPairs.filter(p => p.includes(best3));
            
            let selectedSplit = null;

            // Priority: Find a pair that DOES NOT include best1 or best2
            const cleanSplit = candidates.find(p => !p.includes(best1) && !p.includes(best2));
            
            if (cleanSplit) {
                selectedSplit = cleanSplit;
            } else {
                // Fallback: If 3rd number is sandwiched (e.g., 1, 2 are straights, 3 is target),
                // we must split with 1 or 2. We pick the first available valid split.
                if (candidates.length > 0) selectedSplit = candidates[0];
            }

            // Lock this configuration
            state.lockedStreets.push({
                streetIndex: streetObj.index,
                straights: [best1, best2],
                split: selectedSplit
            });
        });
    }

    // 7. PLACE BETS (From Locked State)
    const bets = [];
    state.lastTargets = { straights: [], splits: [] }; 

    state.lockedStreets.forEach(streetConfig => {
        // Place Straights
        streetConfig.straights.forEach(num => {
            bets.push({ type: 'number', value: num, amount: baseUnit });
            state.lastTargets.straights.push(num);
        });

        // Place Split
        if (streetConfig.split) {
            bets.push({ type: 'split', value: streetConfig.split, amount: baseUnit });
            state.lastTargets.splits.push(streetConfig.split);
        }
    });

    return bets;

}