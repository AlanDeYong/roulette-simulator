/**
 * STRATEGY: Innovate 2 (Final: Continuous Virtual Sliding Window)
 * SOURCE: YouTube Channel "Bet With Mo" - Video: https://www.youtube.com/watch?v=2lNPusqEMMk
 *
 * LOGIC:
 * 1. Ranking: Rolling Window (Last X=111 spins). Freq > Recency.
 * 2. Incremental Selection: Locks streets/bets based on progression needs using fresh stats.
 * 3. Progression: Levels 1-11.
 * 4. VIRTUAL BETTING RULE:
 * - If Level 5 bet does NOT hit a straight number (Loss or Split Hit), STOP REAL BETTING.
 * - Enter Virtual Mode.
 * - Continue Virtual Progression indefinitely.
 * - SLIDING CHECK: After every virtual spin, check the last 7 spins window.
 * - Condition: Is (Current Virtual Bankroll) > (Virtual Bankroll 6 spins ago)?
 * - If YES: RESUME Real Betting immediately from current virtual state.
 * - If NO: Continue virtual betting.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 0. CONFIGURATION
    const X = 300;
    const DOUBLE_STREETS = [
        [1, 2, 3, 4, 5, 6],
        [7, 8, 9, 10, 11, 12],
        [13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24],
        [25, 26, 27, 28, 29, 30],
        [31, 32, 33, 34, 35, 36]
    ];

    // 1. INITIALIZATION
    if (!state.level) state.level = 1;
    if (!state.lastTargets) state.lastTargets = { straights: [], splits: [] };
    if (!state.logHistory) state.logHistory = "";
    if (!state.lockedStreets) state.lockedStreets = [];

    // Virtual State Initialization
    if (state.virtualActive === undefined) state.virtualActive = false;
    if (!state.virtualBankroll) state.virtualBankroll = 0;
    if (!state.virtualHistory) state.virtualHistory = []; 
    if (!state.virtualLevel) state.virtualLevel = 1; 
    if (!state.virtualLockedStreets) state.virtualLockedStreets = [];

    // 2. CHECK PREVIOUS SPIN RESULT
    if (spinHistory.length > X) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        // --- REAL BETTING RESULT PROCESSING ---
        if (!state.virtualActive && state.lastTargets.straights.length > 0) {
            const hitStraight = state.lastTargets.straights.includes(winningNum);
            const hitSplit = state.lastTargets.splits.some(pair => pair.includes(winningNum));

            if (state.level === 5 && !hitStraight) {
                // TRIGGER VIRTUAL MODE
                state.virtualActive = true;
                // Start Virtual at Level 1
                state.virtualLevel = 1;
                state.virtualBankroll = 0;
                state.virtualHistory = [0]; // Index 0: Start point
                state.virtualLockedStreets = []; 
                
                // Clear real targets
                state.lastTargets = { straights: [], splits: [] };
            } else {
                // Normal Real Progression
                if (hitStraight) {
                    state.level = 1;
                    state.lockedStreets = [];
                } else if (hitSplit) {
                    state.level = state.level;
                } else {
                    state.level = Math.min(state.level + 1, 11);
                }
            }
        }
        
        // --- VIRTUAL BETTING PROCESSING ---
        else if (state.virtualActive) {
            if (state.lastVirtualTargets && state.lastVirtualTargets.straights.length > 0) {
                const vHitStraight = state.lastVirtualTargets.straights.includes(winningNum);
                const vHitSplit = state.lastVirtualTargets.splits.some(pair => pair.includes(winningNum));
                
                // Calculate Virtual P/L
                let vUnits = getBaseUnit(state.virtualLevel);
                let vStreetCount = getTargetStreetCount(state.virtualLevel);
                let vTotalBet = vStreetCount * 3 * vUnits; 
                
                let vWin = 0;
                if (vHitStraight) vWin = vUnits * 35 + vUnits;
                if (vHitSplit) vWin = vUnits * 17 + vUnits;
                
                state.virtualBankroll = state.virtualBankroll - vTotalBet + vWin;
                
                // Virtual Progression Logic
                if (vHitStraight) {
                    state.virtualLevel = 1;
                    state.virtualLockedStreets = [];
                } else if (vHitSplit) {
                    // Stay same level
                } else {
                    state.virtualLevel = Math.min(state.virtualLevel + 1, 11);
                }
                
                state.virtualHistory.push(state.virtualBankroll);

                // --- SLIDING WINDOW CHECK ---
                // We need at least 7 data points (Start + 6 spins) to compare spin X vs spin X-6
                // virtualHistory: [Start(0), Spin1, Spin2 ... Spin6, Spin7] -> Length 8
                if (state.virtualHistory.length >= 8) {
                    const currentIndex = state.virtualHistory.length - 1;
                    const referenceIndex = currentIndex - 6; // 6 spins back
                    
                    const currentBankroll = state.virtualHistory[currentIndex];
                    const referenceBankroll = state.virtualHistory[referenceIndex];
                    
                    if (currentBankroll > referenceBankroll) {
                        // SUCCESS: Resume Real Betting
                        state.virtualActive = false;
                        
                        // IMPORT VIRTUAL STATE
                        state.level = state.virtualLevel;
                        state.lockedStreets = JSON.parse(JSON.stringify(state.virtualLockedStreets));
                        
                        // Clear virtual history to save memory/reset for next time
                        state.virtualHistory = [];
                    }
                    // If NO: Do nothing. The cycle continues to the next spin.
                }
            }
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
        
        for (let i = analysisWindow.length - 1; i >= 0; i--) {
            if (analysisWindow[i].winningNumber === num) {
                frequency++;
                if (lastHitIndex === -1) lastHitIndex = i; 
            }
        }

        const recency = lastHitIndex !== -1 ? (analysisWindow.length - 1 - lastHitIndex) : 999;
        
        stats.push({
            number: num,
            frequency: frequency,
            recency: recency
        });
    }

    // Sort: Freq (Desc) > Recency (Asc)
    stats.sort((a, b) => {
        if (a.frequency !== b.frequency) return b.frequency - a.frequency;
        return a.recency - b.recency;
    });

    const rankMap = new Map();
    stats.forEach((stat, index) => rankMap.set(stat.number, index));

    // --- LOGGING ---
    const rankedNumbersList = stats.map(s => s.number).join(', ');
    const currentSpinNum = spinHistory.length + 1;
    let logLine = "";
    
    if (state.virtualActive) {
        // Calculate how many spins deep we are in virtual mode
        const vSpins = state.virtualHistory.length - 1; 
        logLine = `Spin ${currentSpinNum} | [VIRTUAL] Spin ${vSpins} | V-Lvl: ${state.virtualLevel} | V-Bal: ${state.virtualBankroll}\n`;
    } else {
        const lockedCount = state.lockedStreets.length;
        logLine = `Spin ${currentSpinNum} | [REAL] Level: ${state.level} | Locked: ${lockedCount}/5\n`;
    }
    
    logLine += `   > Freq/Recency Rank Top 15: [${rankedNumbersList.split(', ').slice(0, 15).join(', ')}...]\n` +
               `   --------------------------------------------------\n`;

    state.logHistory += logLine;
    utils.saveFile("rankings_log.txt", state.logHistory);

    // 5. HELPER FUNCTIONS
    function getTargetStreetCount(lvl) {
        if (lvl === 1) return 2;
        if (lvl === 2) return 4;
        return 5;
    }

    function getBaseUnit(lvl) {
        if (lvl <= 2) return 2;
        if (lvl === 3) return 4;
        if (lvl === 4) return 5;
        if (lvl === 5) return 6;
        if (lvl === 6) return 7;
        if (lvl === 7) return 8;
        if (lvl === 8) return 9;
        if (lvl === 9) return 10;
        if (lvl >= 10) return 20 * Math.pow(2, lvl - 10);
        return 40;
    }

    // 6. SELECT BETS (REAL OR VIRTUAL)
    let activeLevel = state.virtualActive ? state.virtualLevel : state.level;
    let activeLockedStreets = state.virtualActive ? state.virtualLockedStreets : state.lockedStreets;
    
    let targetStreetCount = getTargetStreetCount(activeLevel);
    let baseUnit = getBaseUnit(activeLevel);
    
    baseUnit = Math.max(baseUnit, config.betLimits.min);
    baseUnit = Math.min(baseUnit, config.betLimits.max);

    // INCREMENTAL LOCKING LOGIC
    if (activeLockedStreets.length < targetStreetCount) {
        // Score streets based on CURRENT stats
        const streetScores = DOUBLE_STREETS.map((streetNumbers, index) => {
            let score = 0;
            streetNumbers.forEach(num => score += rankMap.get(num));
            return { index: index, numbers: streetNumbers, score: score };
        });
        streetScores.sort((a, b) => a.score - b.score);

        const lockedIndices = activeLockedStreets.map(s => s.streetIndex);
        const availableStreets = streetScores.filter(s => !lockedIndices.includes(s.index));
        const needed = targetStreetCount - activeLockedStreets.length;
        const newStreetsToLock = availableStreets.slice(0, needed);

        newStreetsToLock.forEach(streetObj => {
            const nums = streetObj.numbers;
            const sortedNums = [...nums].sort((a, b) => rankMap.get(a) - rankMap.get(b));
            
            const best1 = sortedNums[0];
            const best2 = sortedNums[1];
            const best3 = sortedNums[2];

            const validPairs = [];
            if (nums.includes(nums[0]) && nums.includes(nums[1])) validPairs.push([nums[0], nums[1]]);
            if (nums.includes(nums[1]) && nums.includes(nums[2])) validPairs.push([nums[1], nums[2]]);
            if (nums.includes(nums[3]) && nums.includes(nums[4])) validPairs.push([nums[3], nums[4]]);
            if (nums.includes(nums[4]) && nums.includes(nums[5])) validPairs.push([nums[4], nums[5]]);
            validPairs.push([nums[0], nums[3]]);
            validPairs.push([nums[1], nums[4]]);
            validPairs.push([nums[2], nums[5]]);

            const candidates = validPairs.filter(p => p.includes(best3));
            let selectedSplit = candidates.find(p => !p.includes(best1) && !p.includes(best2));
            if (!selectedSplit && candidates.length > 0) selectedSplit = candidates[0];

            activeLockedStreets.push({
                streetIndex: streetObj.index,
                straights: [best1, best2],
                split: selectedSplit
            });
        });
        
        // Save back to state
        if (state.virtualActive) state.virtualLockedStreets = activeLockedStreets;
        else state.lockedStreets = activeLockedStreets;
    }

    // CONSTRUCT BETS
    const bets = [];
    const nextTargets = { straights: [], splits: [] };

    activeLockedStreets.forEach(streetConfig => {
        streetConfig.straights.forEach(num => {
            bets.push({ type: 'number', value: num, amount: baseUnit });
            nextTargets.straights.push(num);
        });
        if (streetConfig.split) {
            bets.push({ type: 'split', value: streetConfig.split, amount: baseUnit });
            nextTargets.splits.push(streetConfig.split);
        }
    });

    // 7. RETURN LOGIC
    if (state.virtualActive) {
        state.lastVirtualTargets = nextTargets;
        return []; // Stop real betting
    } else {
        state.lastTargets = nextTargets;
        return bets; // Place real bets
    }
}