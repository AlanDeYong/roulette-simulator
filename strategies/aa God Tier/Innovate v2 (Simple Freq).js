/**
 * STRATEGY: Innovate 2 (Rolling Frequency X Version)
 * SOURCE: YouTube Channel "Bet With Mo" - Video: https://www.youtube.com/watch?v=2lNPusqEMMk
 *
 * LOGIC:
 * 1. Ranking: Uses the last X spins (Rolling Window) to rank numbers purely by HIT FREQUENCY.
 * 2. Sticky Selection: At Level 1, generates a "Battle Plan" using the frequency of the last X spins.
 * These targets are LOCKED until a full reset (Straight hit), regardless of how stats change during the sequence.
 *
 * PARAMETERS:
 * - X: 111 (The number of past spins to analyze).
 *
 * PROGRESSION (11 Levels):
 * - Level 1: Best 2 Streets (6 bets). Unit 2.
 * - Level 2: Best 4 Streets (12 bets). Unit 2.
 * - Level 3: Best 5 Streets (15 bets). Unit 4 (Doubled Rule).
 * - Level 4-11: Best 5 Streets. Increasing Units.
 *
 * RECOVERY RULES:
 * - STRAIGHT HIT: Reset to Level 1 (Unlocks plan -> Generates new plan based on latest X spins).
 * - SPLIT HIT: REBET (Stay at current level, Keep current plan).
 * - LOSS: Increase Level.
 *
 * LOGGING:
 * - Generates "rankings_log.txt" showing numbers sorted by Frequency over the last X spins.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 0. CONFIGURATION & CONSTANTS
    const X = 111; // Rolling window size for analysis
    
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
    if (!state.lockedPlan) state.lockedPlan = null; 

    // 2. CHECK PREVIOUS SPIN (Progression Logic)
    if (spinHistory.length > X && state.lastTargets.straights.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        const hitStraight = state.lastTargets.straights.includes(winningNum);
        const hitSplit = state.lastTargets.splits.some(pair => pair.includes(winningNum));

        if (hitStraight) {
            state.level = 1;
            state.lockedPlan = null; // Unlock: Force new plan on next bet
        } else if (hitSplit) {
            state.level = state.level; // Rebet same level
        } else {
            state.level = Math.min(state.level + 1, 11);
        }
    }

    // 3. DATA SUFFICIENCY
    // We need at least X spins to start the first calculation
    if (spinHistory.length < X) {
        return []; 
    }

    // 4. STATISTICAL ANALYSIS (ROLLING X)
    // Always analyze exactly the last X spins
    const stats = [];
    const analysisWindow = spinHistory.slice(-X);

    for (let num = 0; num <= 36; num++) {
        let frequency = 0;
        
        // Count hits in the rolling window
        for (let i = 0; i < analysisWindow.length; i++) {
            if (analysisWindow[i].winningNumber === num) {
                frequency++;
            }
        }

        stats.push({
            number: num,
            frequency: frequency
        });
    }

    // Sort Ranks: Highest Frequency First
    stats.sort((a, b) => {
        return b.frequency - a.frequency;
    });

    const rankMap = new Map();
    stats.forEach((stat, index) => rankMap.set(stat.number, index));

    // --- LOGGING ---
    // This logs the status of the "Rolling X" window before the current bet
    const rankedNumbersList = stats.map(s => s.number).join(', ');
    
    // Log hypothetical street ranks for reference
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
    const logLine = `Spin ${currentSpinNum} | Last ${X} Spins Freq: [${rankedNumbersList}]\n` +
                    `   > Stats Targets: [1st: ${top2}] | [2nd: ${next2}] | [3rd: ${last1}]` +
                    (state.lockedPlan ? ` | (LOCKED PLAN ACTIVE)` : ` | (GENERATING NEW PLAN)`) + `\n` +
                    `   --------------------------------------------------\n`;

    state.logHistory += logLine;
    if (spinHistory.length % 50 === 0) {
        utils.saveFile("rankings_log.txt", state.logHistory);
    }
    // ----------------

    // 5. GENERATE OR RETRIEVE LOCKED PLAN
    // If we are unlocked (Level 1), we use the stats from the Last X spins to build the plan
    if (!state.lockedPlan) {
        const plan = [];
        const targetStreets = currentStreetScores.slice(0, 5); // Take top 5 streets

        targetStreets.forEach(streetObj => {
            const nums = streetObj.numbers;
            // Sort numbers in this street by FREQUENCY Rank
            const sortedNumsInStreet = [...nums].sort((a, b) => rankMap.get(a) - rankMap.get(b));
            
            const best1 = sortedNumsInStreet[0];
            const best2 = sortedNumsInStreet[1];

            // Calculate Split (using next best frequencies)
            const remainingNums = sortedNumsInStreet.slice(2);
            let splitPair = null;
            let bestSplitRank = Infinity;
            
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

            for (const pair of validPairs) {
                if (remainingNums.includes(pair[0]) && remainingNums.includes(pair[1])) {
                    const combinedRank = rankMap.get(pair[0]) + rankMap.get(pair[1]);
                    if (combinedRank < bestSplitRank) {
                        bestSplitRank = combinedRank;
                        splitPair = pair;
                    }
                }
            }
            // Fallback
            if (!splitPair) {
                 for (const pair of validPairs) {
                     if (remainingNums.includes(pair[0]) || remainingNums.includes(pair[1])) {
                          splitPair = pair; break; 
                     }
                 }
            }

            plan.push({
                streetIndex: streetObj.index,
                straights: [best1, best2],
                split: splitPair
            });
        });

        state.lockedPlan = plan;
    }

    // 6. DETERMINE BET SIZE
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

    // 7. PLACE BETS FROM PLAN
    const bets = [];
    state.lastTargets = { straights: [], splits: [] }; 

    const activePlan = state.lockedPlan.slice(0, streetsToBetCount);

    activePlan.forEach(streetConfig => {
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