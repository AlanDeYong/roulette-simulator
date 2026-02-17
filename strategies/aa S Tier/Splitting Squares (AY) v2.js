function bet(spinHistory, bankroll, config, state) {
    // --- 0. Configuration & Limits ---
    const MIN_HISTORY = 20;
    const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, i) => i);
    
    // Ensure we respect the config minimums, defaulting to 2 if not provided or too low
    const baseUnit = Math.max(config.betLimits.min || 1, 2);
    const maxBet = config.betLimits.max || 10000;

    // --- 1. State Initialization ---
    if (!state.initialized) {
        state.peakBankroll = bankroll; // Track High Water Mark
        state.multiplier = 1;          // Progression Multiplier
        state.streetStates = {};       // Track Square vs Split for each Double Street
        state.activeSplitsCount = 0;   // How many streets are currently Splits
        
        // Initialize all 6 Double Streets to 'square'
        // IDs 1-6 correspond to ranges: 1:1-6, 2:7-12, 3:13-18, 4:19-24, 5:25-30, 6:31-36
        for (let i = 1; i <= 6; i++) {
            state.streetStates[i] = 'square';
        }
        
        state.initialized = true;
    }

    // --- 2. History Check ---
    // We need 111 spins for analysis before we start betting (starting spin #112)
    if (spinHistory.length < MIN_HISTORY) {
        return []; 
    }

    // --- 3. Process Previous Result (Progression & Logic) ---
    const lastSpinIndex = spinHistory.length - 1;
    const lastResult = spinHistory[lastSpinIndex];
    const winningNum = lastResult.winningNumber; 

    // Only process logic if we actually placed a bet previously (i.e., we are past the warmup)
    if (spinHistory.length > MIN_HISTORY) {
        const previousBankroll = state.lastBankroll || bankroll;
        const profit = bankroll - previousBankroll;

        if (profit > 0) {
            // --- WIN LOGIC ---
            
            // 1. Peak Bankroll Check
            if (bankroll > state.peakBankroll) {
                state.peakBankroll = bankroll;
                state.multiplier = 1; // Reset progression on new peak (High Water Mark)
            }
            // Note: If we win but don't hit a new peak, multiplier stays current (Plateau)

            // 2. Identify which Double Street (DS) hit
            let hitDS = null;
            if (winningNum !== 0) {
                hitDS = Math.ceil(winningNum / 6);
            }

            // 3. Handle Conversion (Square -> Split)
            if (hitDS && state.streetStates[hitDS] === 'square') {
                if (state.activeSplitsCount < 3) {
                    state.streetStates[hitDS] = 'split';
                    state.activeSplitsCount++;
                } else {
                    // Reset Condition: If cap reached, reset all to squares
                    for (let i = 1; i <= 6; i++) {
                        state.streetStates[i] = 'square';
                    }
                    state.activeSplitsCount = 0;
                }
            }
        } else {
            // --- LOSS LOGIC ---
            // Changed from Doubling (Martingale) to Linear Increase (+1 Unit)
            state.multiplier += 1;
        }
    }

    // Update tracking for next spin
    state.lastBankroll = bankroll;

    // --- 4. Ranking Algorithm (The "Brain") ---
    // Analyze last 111 spins
    const analysisHistory = spinHistory.slice(-111);
    const stats = {};
    
    // Initialize stats
    ROULETTE_NUMBERS.forEach(num => {
        stats[num] = { freq: 0, lastIndex: -1, gaps: [], avgGap: 0, trend: 0, rankScore: 0 };
    });

    // Populate raw metrics
    analysisHistory.forEach((spin, idx) => {
        const num = spin.winningNumber;
        if (stats[num]) {
            const prevIndex = stats[num].lastIndex;
            stats[num].freq++;
            if (prevIndex !== -1) {
                stats[num].gaps.push(idx - prevIndex);
            }
            stats[num].lastIndex = idx;
        }
    });

    // Calculate Final Rank Score
    const totalAnalysisSpins = analysisHistory.length;
    ROULETTE_NUMBERS.forEach(num => {
        const s = stats[num];
        const recency = totalAnalysisSpins - s.lastIndex; 
        
        const sumGaps = s.gaps.reduce((a, b) => a + b, 0);
        s.avgGap = s.gaps.length > 0 ? sumGaps / s.gaps.length : totalAnalysisSpins; 

        const lastGap = s.gaps.length > 0 ? s.gaps[s.gaps.length - 1] : totalAnalysisSpins;
        // Positive trend if gaps are shrinking (avg > last)
        s.trend = s.gaps.length > 1 ? (s.avgGap - lastGap) : 0; 

        // Weighted Scoring
        const freqScore = s.freq * 10; 
        const recencyScore = 1000 / (recency + 1);
        const gapScore = 1000 / (s.avgGap + 1);
        const trendScore = s.trend * 5;

        s.rankScore = freqScore + recencyScore + gapScore + trendScore;
    });

    const getRank = (n) => stats[n].rankScore;

    // --- 5. Bet Construction ---
    const bets = [];
    // Calculate bet amount based on current linear multiplier
    const currentBetAmount = Math.min(baseUnit * state.multiplier, maxBet);

    // Helper to generate numbers in a Double Street
    const getDSNumbers = (dsId) => {
        const start = (dsId - 1) * 6 + 1;
        return Array.from({ length: 6 }, (_, i) => start + i);
    };

    // Helper: Get all possible squares (corners) in a Double Street range
    const getSquaresInDS = (dsId) => {
        const start = (dsId - 1) * 6 + 1;
        return [
            { topLeft: start, numbers: [start, start+1, start+3, start+4] },
            { topLeft: start+1, numbers: [start+1, start+2, start+4, start+5] }
        ];
    };

    // Helper: Get all possible splits in a Double Street range
    const getSplitsInDS = (dsId) => {
        const start = (dsId - 1) * 6 + 1;
        const end = start + 5;
        const splits = [];
        
        // Horizontal splits
        for (let i = start; i < end; i++) {
            if (i % 3 !== 0) splits.push([i, i + 1]);
        }
        // Vertical splits
        for (let i = start; i <= end - 3; i++) {
            splits.push([i, i + 3]);
        }
        return splits;
    };

    // A. Bet on Zero (Fixed unit calculated by multiplier)
    bets.push({
        type: 'number',
        value: 0,
        amount: currentBetAmount
    });

    // B. Bet on 6 Double Streets (Squares or Splits)
    for (let dsId = 1; dsId <= 6; dsId++) {
        const mode = state.streetStates[dsId];

        if (mode === 'square') {
            // Find best Square
            const candidates = getSquaresInDS(dsId);
            let bestCandidate = candidates[0];
            let bestScore = -Infinity;

            candidates.forEach(cand => {
                const score = cand.numbers.reduce((sum, n) => sum + getRank(n), 0);
                if (score > bestScore) {
                    bestScore = score;
                    bestCandidate = cand;
                }
            });

            bets.push({
                type: 'corner',
                value: bestCandidate.topLeft, 
                amount: currentBetAmount
            });

        } else {
            // Mode is 'split'
            // Find best Split
            const candidates = getSplitsInDS(dsId);
            let bestCandidate = candidates[0];
            let bestScore = -Infinity;

            candidates.forEach(cand => {
                const score = cand.reduce((sum, n) => sum + getRank(n), 0);
                if (score > bestScore) {
                    bestScore = score;
                    bestCandidate = cand;
                }
            });

            bets.push({
                type: 'split',
                value: bestCandidate,
                amount: currentBetAmount
            });
        }
    }

    return bets;
}