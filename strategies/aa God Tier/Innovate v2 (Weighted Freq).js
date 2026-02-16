<<<<<<< HEAD
/**
 * STRATEGY: Innovate 2 (Sticky Plan Version)
 * SOURCE: YouTube Channel "Bet With Mo" - Video: https://www.youtube.com/watch?v=2lNPusqEMMk
 *
 * LOGIC:
 * 1. Ranking: Uses 111 spins of history to rank numbers.
 * 2. Sticky Selection: At the start of a sequence (Level 1), the strategy generates a "Battle Plan".
 * It identifies the Top 2, Next 2, and Last 1 Double Streets and the specific numbers to bet.
 * These targets are LOCKED. The strategy will not change numbers based on new rankings until a Reset.
 *
 * PROGRESSION (11 Levels):
 * - Level 1: Bet Locked Group A (Top 2 Streets). Unit 2.
 * - Level 2: Bet Locked Groups A + B (Top 4 Streets). Unit 2.
 * - Level 3: Bet Locked Groups A + B + C (All 5 Streets). Unit 4.
 * - Level 4-11: Bet All 5 Locked Groups. Increasing Units.
 *
 * RECOVERY RULES:
 * - STRAIGHT HIT: Reset to Level 1 (Triggers new Ranking/Plan).
 * - SPLIT HIT: REBET (Stay at current level, Keep current plan).
 * - LOSS: Increase Level (Add streets/units from the locked plan).
 *
 * LOGGING:
 * - Saves "rankings_log.txt" showing the live statistical rankings for every spin.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 0. CONFIGURATION & CONSTANTS
    const MIN_HISTORY = 90;
    const DOUBLE_STREETS = [
        [1, 2, 3, 4, 5, 6],
        [7, 8, 9, 10, 11, 12],
        [13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24],
        [25, 26, 27, 28, 29, 30],
        [31, 32, 33, 34, 35, 36]
    ];

    // Helper for logging
    const getStreetName = (nums) => `DS(${nums[0]}-${nums[nums.length - 1]})`;

    // 1. INITIALIZATION
    if (!state.level) state.level = 1;
    if (!state.lastTargets) state.lastTargets = { straights: [], splits: [] };
    if (!state.logHistory) state.logHistory = "";
    if (!state.lockedPlan) state.lockedPlan = null; // Stores the sticky bets

    // 2. CHECK PREVIOUS SPIN (Progression & Reset Logic)
    let resetTriggered = false;

    if (spinHistory.length > MIN_HISTORY && state.lastTargets.straights.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        const hitStraight = state.lastTargets.straights.includes(winningNum);
        const hitSplit = state.lastTargets.splits.some(pair => pair.includes(winningNum));

        if (hitStraight) {
            state.level = 1;
            state.lockedPlan = null; // Unlock: Force new plan on next bet
            resetTriggered = true;
        } else if (hitSplit) {
            state.level = state.level; // Rebet same level
            // Do NOT clear lockedPlan (Stick to bets)
        } else {
            state.level = Math.min(state.level + 1, 11);
            // Do NOT clear lockedPlan (Stick to bets)
        }
    }

    // 3. DATA SUFFICIENCY
    if (spinHistory.length < MIN_HISTORY) {
        return []; 
    }

    // 4. STATISTICAL ANALYSIS (Running every spin for LOGGING purposes)
    const stats = [];
    for (let num = 0; num <= 36; num++) {
        let frequency = 0;
        let lastHitIndex = -1;
        let secondLastHitIndex = -1;
        const analysisWindow = spinHistory.slice(-MIN_HISTORY);
        
        for (let i = analysisWindow.length - 1; i >= 0; i--) {
            if (analysisWindow[i].winningNumber === num) {
                frequency++;
                if (lastHitIndex === -1) {
                    lastHitIndex = i;
                } else if (secondLastHitIndex === -1) {
                    secondLastHitIndex = i;
                }
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

    // Sort Ranks
    stats.sort((a, b) => {
        if (a.frequency !== b.frequency) return b.frequency - a.frequency;
        if (a.recency !== b.recency) return a.recency - b.recency;
        if (a.currentGap !== b.currentGap) return a.currentGap - b.currentGap;
        return b.trendBonus - a.trendBonus;
    });

    const rankMap = new Map();
    stats.forEach((stat, index) => rankMap.set(stat.number, index));

    // --- LOGGING (Always log the *current* reality, even if bets are old) ---
    const rankedNumbersList = stats.map(s => s.number).join(', ');
    
    // Calculate current hypothetical street rankings for the log
    const currentStreetScores = DOUBLE_STREETS.map((streetNumbers, index) => {
        let score = 0;
        streetNumbers.forEach(num => score += rankMap.get(num));
        return { index: index, numbers: streetNumbers, score: score };
    });
    currentStreetScores.sort((a, b) => a.score - b.score);
    
    const top2 = currentStreetScores.slice(0, 2).map(s => getStreetName(s.numbers)).join(', ');
    const next2 = currentStreetScores.slice(2, 4).map(s => getStreetName(s.numbers)).join(', ');
    const last1 = currentStreetScores.slice(4, 5).map(s => getStreetName(s.numbers)).join(', ');

    const currentSpinNum = spinHistory.length + 1;
    const logLine = `Spin ${currentSpinNum} | Ranked: [${rankedNumbersList}]\n` +
                    `   > Stats Targets: [1st: ${top2}] | [2nd: ${next2}] | [3rd: ${last1}]` +
                    (state.lockedPlan ? ` | (BETTING LOCKED PLAN)` : ` | (NEW PLAN GENERATED)`) + `\n` +
                    `   --------------------------------------------------\n`;

    state.logHistory += logLine;
    if (spinHistory.length % 50 === 0) {
        utils.saveFile("rankings_log.txt", state.logHistory);
    }
    // -----------------------------------------------------------------------

    // 5. GENERATE OR RETRIEVE LOCKED PLAN
    // We only generate a new plan if we don't have one (Level 1 start)
    if (!state.lockedPlan) {
        // We use the 'currentStreetScores' we just calculated for logging
        // But we need to define the specific bets for ALL 5 potential streets now.
        
        const plan = [];
        // We take the top 5 streets
        const targetStreets = currentStreetScores.slice(0, 5);

        targetStreets.forEach(streetObj => {
            const nums = streetObj.numbers;
            // Sort numbers in this street by CURRENT rank
            const sortedNumsInStreet = [...nums].sort((a, b) => rankMap.get(a) - rankMap.get(b));
            
            const best1 = sortedNumsInStreet[0];
            const best2 = sortedNumsInStreet[1];

            // Calculate Split
            const remainingNums = sortedNumsInStreet.slice(2);
            let splitPair = null;
            let bestSplitRank = Infinity;
            
            // Valid pairs logic
            const validPairs = [];
            if (nums.includes(nums[0]) && nums.includes(nums[1])) validPairs.push([nums[0], nums[1]]);
            if (nums.includes(nums[1]) && nums.includes(nums[2])) validPairs.push([nums[1], nums[2]]);
            if (nums.includes(nums[3]) && nums.includes(nums[4])) validPairs.push([nums[3], nums[4]]);
            if (nums.includes(nums[4]) && nums.includes(nums[5])) validPairs.push([nums[4], nums[5]]);
            validPairs.push([nums[0], nums[3]]);
            validPairs.push([nums[1], nums[4]]);
            validPairs.push([nums[2], nums[5]]);

            for (const pair of validPairs) {
                if (remainingNums.includes(pair[0]) && remainingNums.includes(pair[1])) {
                    const combinedRank = rankMap.get(pair[0]) + rankMap.get(pair[1]);
                    if (combinedRank < bestSplitRank) {
                        bestSplitRank = combinedRank;
                        splitPair = pair;
                    }
                }
            }
            if (!splitPair) {
                 for (const pair of validPairs) {
                     if (remainingNums.includes(pair[0]) || remainingNums.includes(pair[1])) {
                          splitPair = pair; break; 
                     }
                 }
            }

            // Save the specific betting details for this street
            plan.push({
                streetIndex: streetObj.index,
                straights: [best1, best2],
                split: splitPair
            });
        });

        // Store in state: Group 1 (0-1), Group 2 (2-3), Group 3 (4)
        state.lockedPlan = plan;
    }

    // 6. DETERMINE ACTIVE BETS FROM PLAN
    // Now we ignore current ranks and just pull from state.lockedPlan
    
    let streetsToBetCount = 0;
    let baseUnit = 0;

    switch (state.level) {
        case 1: streetsToBetCount = 2; baseUnit = 2; break;
        case 2: streetsToBetCount = 4; baseUnit = 2; break;
        case 3: streetsToBetCount = 5; baseUnit = 4; break; // Doubled
        case 4: streetsToBetCount = 5; baseUnit = 5; break;
        case 5: streetsToBetCount = 5; baseUnit = 6; break;
        case 6: streetsToBetCount = 5; baseUnit = 7; break;
        case 7: streetsToBetCount = 5; baseUnit = 8; break;
        case 8: streetsToBetCount = 5; baseUnit = 9; break;
        case 9: streetsToBetCount = 5; baseUnit = 10; break;
        case 10: streetsToBetCount = 5; baseUnit = 20; break;
        case 11: streetsToBetCount = 5; baseUnit = 40; break;
        default: streetsToBetCount = 5; baseUnit = 40; break;
    }

    baseUnit = Math.max(baseUnit, config.betLimits.min);
    baseUnit = Math.min(baseUnit, config.betLimits.max);

    // 7. CONSTRUCT BETS
    const bets = [];
    state.lastTargets = { straights: [], splits: [] }; 

    // Retrieve the active portion of the locked plan
    const activePlan = state.lockedPlan.slice(0, streetsToBetCount);

    activePlan.forEach(streetConfig => {
        // Place Straight Bets
        streetConfig.straights.forEach(num => {
            bets.push({ type: 'number', value: num, amount: baseUnit });
            state.lastTargets.straights.push(num);
        });

        // Place Split Bet
        if (streetConfig.split) {
            bets.push({ type: 'split', value: streetConfig.split, amount: baseUnit });
            state.lastTargets.splits.push(streetConfig.split);
        }
    });

    return bets;
=======
/**
 * STRATEGY: Innovate 2 (Sticky Plan Version)
 * SOURCE: YouTube Channel "Bet With Mo" - Video: https://www.youtube.com/watch?v=2lNPusqEMMk
 *
 * LOGIC:
 * 1. Ranking: Uses 111 spins of history to rank numbers.
 * 2. Sticky Selection: At the start of a sequence (Level 1), the strategy generates a "Battle Plan".
 * It identifies the Top 2, Next 2, and Last 1 Double Streets and the specific numbers to bet.
 * These targets are LOCKED. The strategy will not change numbers based on new rankings until a Reset.
 *
 * PROGRESSION (11 Levels):
 * - Level 1: Bet Locked Group A (Top 2 Streets). Unit 2.
 * - Level 2: Bet Locked Groups A + B (Top 4 Streets). Unit 2.
 * - Level 3: Bet Locked Groups A + B + C (All 5 Streets). Unit 4.
 * - Level 4-11: Bet All 5 Locked Groups. Increasing Units.
 *
 * RECOVERY RULES:
 * - STRAIGHT HIT: Reset to Level 1 (Triggers new Ranking/Plan).
 * - SPLIT HIT: REBET (Stay at current level, Keep current plan).
 * - LOSS: Increase Level (Add streets/units from the locked plan).
 *
 * LOGGING:
 * - Saves "rankings_log.txt" showing the live statistical rankings for every spin.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 0. CONFIGURATION & CONSTANTS
    const MIN_HISTORY = 90;
    const DOUBLE_STREETS = [
        [1, 2, 3, 4, 5, 6],
        [7, 8, 9, 10, 11, 12],
        [13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24],
        [25, 26, 27, 28, 29, 30],
        [31, 32, 33, 34, 35, 36]
    ];

    // Helper for logging
    const getStreetName = (nums) => `DS(${nums[0]}-${nums[nums.length - 1]})`;

    // 1. INITIALIZATION
    if (!state.level) state.level = 1;
    if (!state.lastTargets) state.lastTargets = { straights: [], splits: [] };
    if (!state.logHistory) state.logHistory = "";
    if (!state.lockedPlan) state.lockedPlan = null; // Stores the sticky bets

    // 2. CHECK PREVIOUS SPIN (Progression & Reset Logic)
    let resetTriggered = false;

    if (spinHistory.length > MIN_HISTORY && state.lastTargets.straights.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        const hitStraight = state.lastTargets.straights.includes(winningNum);
        const hitSplit = state.lastTargets.splits.some(pair => pair.includes(winningNum));

        if (hitStraight) {
            state.level = 1;
            state.lockedPlan = null; // Unlock: Force new plan on next bet
            resetTriggered = true;
        } else if (hitSplit) {
            state.level = state.level; // Rebet same level
            // Do NOT clear lockedPlan (Stick to bets)
        } else {
            state.level = Math.min(state.level + 1, 11);
            // Do NOT clear lockedPlan (Stick to bets)
        }
    }

    // 3. DATA SUFFICIENCY
    if (spinHistory.length < MIN_HISTORY) {
        return []; 
    }

    // 4. STATISTICAL ANALYSIS (Running every spin for LOGGING purposes)
    const stats = [];
    for (let num = 0; num <= 36; num++) {
        let frequency = 0;
        let lastHitIndex = -1;
        let secondLastHitIndex = -1;
        const analysisWindow = spinHistory.slice(-MIN_HISTORY);
        
        for (let i = analysisWindow.length - 1; i >= 0; i--) {
            if (analysisWindow[i].winningNumber === num) {
                frequency++;
                if (lastHitIndex === -1) {
                    lastHitIndex = i;
                } else if (secondLastHitIndex === -1) {
                    secondLastHitIndex = i;
                }
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

    // Sort Ranks
    stats.sort((a, b) => {
        if (a.frequency !== b.frequency) return b.frequency - a.frequency;
        if (a.recency !== b.recency) return a.recency - b.recency;
        if (a.currentGap !== b.currentGap) return a.currentGap - b.currentGap;
        return b.trendBonus - a.trendBonus;
    });

    const rankMap = new Map();
    stats.forEach((stat, index) => rankMap.set(stat.number, index));

    // --- LOGGING (Always log the *current* reality, even if bets are old) ---
    const rankedNumbersList = stats.map(s => s.number).join(', ');
    
    // Calculate current hypothetical street rankings for the log
    const currentStreetScores = DOUBLE_STREETS.map((streetNumbers, index) => {
        let score = 0;
        streetNumbers.forEach(num => score += rankMap.get(num));
        return { index: index, numbers: streetNumbers, score: score };
    });
    currentStreetScores.sort((a, b) => a.score - b.score);
    
    const top2 = currentStreetScores.slice(0, 2).map(s => getStreetName(s.numbers)).join(', ');
    const next2 = currentStreetScores.slice(2, 4).map(s => getStreetName(s.numbers)).join(', ');
    const last1 = currentStreetScores.slice(4, 5).map(s => getStreetName(s.numbers)).join(', ');

    const currentSpinNum = spinHistory.length + 1;
    const logLine = `Spin ${currentSpinNum} | Ranked: [${rankedNumbersList}]\n` +
                    `   > Stats Targets: [1st: ${top2}] | [2nd: ${next2}] | [3rd: ${last1}]` +
                    (state.lockedPlan ? ` | (BETTING LOCKED PLAN)` : ` | (NEW PLAN GENERATED)`) + `\n` +
                    `   --------------------------------------------------\n`;

    state.logHistory += logLine;
    if (spinHistory.length % 50 === 0) {
        utils.saveFile("rankings_log.txt", state.logHistory);
    }
    // -----------------------------------------------------------------------

    // 5. GENERATE OR RETRIEVE LOCKED PLAN
    // We only generate a new plan if we don't have one (Level 1 start)
    if (!state.lockedPlan) {
        // We use the 'currentStreetScores' we just calculated for logging
        // But we need to define the specific bets for ALL 5 potential streets now.
        
        const plan = [];
        // We take the top 5 streets
        const targetStreets = currentStreetScores.slice(0, 5);

        targetStreets.forEach(streetObj => {
            const nums = streetObj.numbers;
            // Sort numbers in this street by CURRENT rank
            const sortedNumsInStreet = [...nums].sort((a, b) => rankMap.get(a) - rankMap.get(b));
            
            const best1 = sortedNumsInStreet[0];
            const best2 = sortedNumsInStreet[1];

            // Calculate Split
            const remainingNums = sortedNumsInStreet.slice(2);
            let splitPair = null;
            let bestSplitRank = Infinity;
            
            // Valid pairs logic
            const validPairs = [];
            if (nums.includes(nums[0]) && nums.includes(nums[1])) validPairs.push([nums[0], nums[1]]);
            if (nums.includes(nums[1]) && nums.includes(nums[2])) validPairs.push([nums[1], nums[2]]);
            if (nums.includes(nums[3]) && nums.includes(nums[4])) validPairs.push([nums[3], nums[4]]);
            if (nums.includes(nums[4]) && nums.includes(nums[5])) validPairs.push([nums[4], nums[5]]);
            validPairs.push([nums[0], nums[3]]);
            validPairs.push([nums[1], nums[4]]);
            validPairs.push([nums[2], nums[5]]);

            for (const pair of validPairs) {
                if (remainingNums.includes(pair[0]) && remainingNums.includes(pair[1])) {
                    const combinedRank = rankMap.get(pair[0]) + rankMap.get(pair[1]);
                    if (combinedRank < bestSplitRank) {
                        bestSplitRank = combinedRank;
                        splitPair = pair;
                    }
                }
            }
            if (!splitPair) {
                 for (const pair of validPairs) {
                     if (remainingNums.includes(pair[0]) || remainingNums.includes(pair[1])) {
                          splitPair = pair; break; 
                     }
                 }
            }

            // Save the specific betting details for this street
            plan.push({
                streetIndex: streetObj.index,
                straights: [best1, best2],
                split: splitPair
            });
        });

        // Store in state: Group 1 (0-1), Group 2 (2-3), Group 3 (4)
        state.lockedPlan = plan;
    }

    // 6. DETERMINE ACTIVE BETS FROM PLAN
    // Now we ignore current ranks and just pull from state.lockedPlan
    
    let streetsToBetCount = 0;
    let baseUnit = 0;

    switch (state.level) {
        case 1: streetsToBetCount = 2; baseUnit = 2; break;
        case 2: streetsToBetCount = 4; baseUnit = 2; break;
        case 3: streetsToBetCount = 5; baseUnit = 4; break; // Doubled
        case 4: streetsToBetCount = 5; baseUnit = 5; break;
        case 5: streetsToBetCount = 5; baseUnit = 6; break;
        case 6: streetsToBetCount = 5; baseUnit = 7; break;
        case 7: streetsToBetCount = 5; baseUnit = 8; break;
        case 8: streetsToBetCount = 5; baseUnit = 9; break;
        case 9: streetsToBetCount = 5; baseUnit = 10; break;
        case 10: streetsToBetCount = 5; baseUnit = 20; break;
        case 11: streetsToBetCount = 5; baseUnit = 40; break;
        default: streetsToBetCount = 5; baseUnit = 40; break;
    }

    baseUnit = Math.max(baseUnit, config.betLimits.min);
    baseUnit = Math.min(baseUnit, config.betLimits.max);

    // 7. CONSTRUCT BETS
    const bets = [];
    state.lastTargets = { straights: [], splits: [] }; 

    // Retrieve the active portion of the locked plan
    const activePlan = state.lockedPlan.slice(0, streetsToBetCount);

    activePlan.forEach(streetConfig => {
        // Place Straight Bets
        streetConfig.straights.forEach(num => {
            bets.push({ type: 'number', value: num, amount: baseUnit });
            state.lastTargets.straights.push(num);
        });

        // Place Split Bet
        if (streetConfig.split) {
            bets.push({ type: 'split', value: streetConfig.split, amount: baseUnit });
            state.lastTargets.splits.push(streetConfig.split);
        }
    });

    return bets;
>>>>>>> origin/main
}