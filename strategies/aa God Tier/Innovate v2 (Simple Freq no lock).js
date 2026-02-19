
/**
 * STRATEGY: Innovate 2 (Incremental Locking + Simple Frequency & Recency)
 * SOURCE: YouTube Channel "Bet With Mo" - Video: https://www.youtube.com/watch?v=2lNPusqEMMk
 *
 * LOGIC:
 * 1. Ranking: Rolling Window (Last X=111 spins).
 * - Primary: HIT FREQUENCY (Higher is better).
 * - Tie-Breaker: RECENCY (More recent is better).
 * 2. Incremental Selection: 
 * - Bets are selected only when the Progression requires more streets.
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
    if (!state.lockedStreets) state.lockedStreets = []; 

    // 2. CHECK PREVIOUS SPIN
    if (spinHistory.length > X && state.lastTargets.straights.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        const hitStraight = state.lastTargets.straights.includes(winningNum);
        const hitSplit = state.lastTargets.splits.some(pair => pair.includes(winningNum));

        if (hitStraight) {
            state.level = 1;
            state.lockedStreets = []; // CLEAR LOCKS
        } else if (hitSplit) {
            state.level = state.level; // Rebet
        } else {
            state.level = Math.min(state.level + 1, 11);
        }
    }

    // 3. DATA SUFFICIENCY
    if (spinHistory.length < X) return [];

    // 4. STATISTICAL ANALYSIS (Simple Freq + Recency)
    const stats = [];
    const analysisWindow = spinHistory.slice(-X);

    for (let num = 0; num <= 36; num++) {
        let frequency = 0;
        let lastHitIndex = -1;       
        
        // Loop through window to count freq and find last hit
        for (let i = analysisWindow.length - 1; i >= 0; i--) {
            if (analysisWindow[i].winningNumber === num) {
                frequency++;
                if (lastHitIndex === -1) lastHitIndex = i; // Save most recent index
            }
        }

        // Calculate "Spins Ago" (Lower is better)
        // If never hit, set to 999
        const recency = lastHitIndex !== -1 ? (analysisWindow.length - 1 - lastHitIndex) : 999;

        stats.push({
            number: num,
            frequency: frequency,
            recency: recency
        });
    }

    // Sort: Primary = Frequency (Desc), Secondary = Recency (Asc)
    stats.sort((a, b) => {
        if (a.frequency !== b.frequency) {
            return b.frequency - a.frequency; // Higher freq first
        }
        return a.recency - b.recency; // Lower recency (more recent) first
    });

    const rankMap = new Map();
    stats.forEach((stat, index) => rankMap.set(stat.number, index));

    // --- LOGGING ---
    const rankedNumbersList = stats.map(s => s.number).join(', ');
    const currentSpinNum = spinHistory.length + 1;
    const lockedCount = state.lockedStreets.length;
    
    const logLine = `Spin ${currentSpinNum} | Level: ${state.level} | Locked Streets: ${lockedCount}/5\n` +
                    `   > Freq/Recency Rank (Top 15): [${rankedNumbersList.split(', ').slice(0, 15).join(', ')}...]\n` +
                    `   --------------------------------------------------\n`;

    state.logHistory += logLine;
    if (spinHistory.length % 50 === 0) {
        utils.saveFile("rankings_log.txt", state.logHistory);
    }
    // ----------------

    // 5. DETERMINE REQUIRED STREETS
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
    if (state.lockedStreets.length < targetStreetCount) {
        
        // Score streets based on CURRENT stats (Sum of Ranks, lower is better)
        const streetScores = DOUBLE_STREETS.map((streetNumbers, index) => {
            let score = 0;
            streetNumbers.forEach(num => score += rankMap.get(num));
            return { index: index, numbers: streetNumbers, score: score };
        });
        streetScores.sort((a, b) => a.score - b.score);

        // Filter out already locked streets
        const lockedIndices = state.lockedStreets.map(s => s.streetIndex);
        const availableStreets = streetScores.filter(s => !lockedIndices.includes(s.index));

        // Lock needed streets
        const needed = targetStreetCount - state.lockedStreets.length;
        const newStreetsToLock = availableStreets.slice(0, needed);

        newStreetsToLock.forEach(streetObj => {
            const nums = streetObj.numbers;
            // Sort numbers in street by CURRENT Rank (Freq/Recency)
            const sortedNums = [...nums].sort((a, b) => rankMap.get(a) - rankMap.get(b));
            
            const best1 = sortedNums[0];
            const best2 = sortedNums[1];
            const best3 = sortedNums[2]; // Target for split

            // Split Selection: Include best3, avoid best1/best2 if possible
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

            const candidates = validPairs.filter(p => p.includes(best3));
            let selectedSplit = candidates.find(p => !p.includes(best1) && !p.includes(best2));
            
            if (!selectedSplit && candidates.length > 0) {
                selectedSplit = candidates[0]; // Fallback
            }

            state.lockedStreets.push({
                streetIndex: streetObj.index,
                straights: [best1, best2],
                split: selectedSplit
            });
        });
    }

    // 7. PLACE BETS
    const bets = [];
    state.lastTargets = { straights: [], splits: [] }; 

    state.lockedStreets.forEach(streetConfig => {
        streetConfig.straights.forEach(num => {
            bets.push({ type: 'number', value: num, amount: baseUnit });
            state.lastTargets.straights.push(num);
        });

        if (streetConfig.split) {
            bets.push({ type: 'split', value: streetConfig.split, amount: baseUnit });
            state.lastTargets.splits.push(streetConfig.split);
        }
    });

    return bets;

}