/**
 * Strategy: Moving Half Moon Hot
 * * Source: Derived from user prompt "Moving Half Moon Hot" logic.
 * * The Logic:
 * 1. Analysis: Analyze the last 100 spins to rank all numbers by frequency and find the Top 5 "Hot" numbers.
 * 2. Center: Find the "Mid Point" wheel index that minimizes the distance to these Top 5 Hot numbers.
 * 3. Sector Selection: Select exactly 19 numbers centered on the Midpoint (Midpoint + 9 neighbors on the left, 9 on the right).
 * 4. Placement: Bet on all 19 numbers in this sector regardless of whether they are hot, cold, or neutral.
 * * The Progression (Recovery):
 * - Loss: Increase bet unit by 1.
 * - Win (Bankroll < Session Start): Rebet the same unit size (maintain progression).
 * - Win (Bankroll >= Session Start): Reset unit size to base minimum.
 * * The Goal:
 * - Cover ~51% of the wheel (19 numbers) in the most active cluster, utilizing a recovery progression to grind out profits and reset upon reaching new highs.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- Configuration ---
    const MIN_HISTORY = 20;
    const ANALYSIS_WINDOW = 100;
    const BASE_UNIT = config.betLimits.min; 
    
    // European Wheel Sequence
    const WHEEL = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 
        10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    // --- Helpers ---
    const getWheelIndex = (num) => WHEEL.indexOf(num);
    
    // Calculates the shortest distance around the circular wheel
    const getDistance = (idx1, idx2) => {
        const diff = Math.abs(idx1 - idx2);
        return Math.min(diff, 37 - diff);
    };

    // --- Progression Management ---
    if (state.progression === undefined) state.progression = 1;
    if (state.sessionStartBankroll === undefined) state.sessionStartBankroll = bankroll;

    // Check last spin PnL to adjust progression
    if (state.lastBankroll !== undefined) {
        const pnl = bankroll - state.lastBankroll;
        
        if (pnl < 0) {
            // Loss: Increase bets by 1 unit
            state.progression += 1;
        } else if (pnl > 0) {
            // Win
            if (bankroll >= state.sessionStartBankroll) {
                // Recovered all losses + profit: Reset progression
                state.progression = 1;
            } else {
                // Won but still recovering: Maintain current progression (Rebet)
            }
        }
    }
    
    // Store current bankroll for the next spin's comparison
    state.lastBankroll = bankroll;

    // Calculate current Unit Size and clamp to limits
    let unitSize = BASE_UNIT * state.progression;
    unitSize = Math.max(unitSize, config.betLimits.min);
    unitSize = Math.min(unitSize, config.betLimits.max);

    // --- Strategy Logic ---

    // Wait for enough history to calculate hot numbers
    if (spinHistory.length < MIN_HISTORY) return [];

    // 1. Frequency Analysis
    const historySlice = spinHistory.slice(-ANALYSIS_WINDOW);
    const frequencies = {};
    for (let i = 0; i <= 36; i++) frequencies[i] = 0;
    
    historySlice.forEach(spin => {
        if (spin.winningNumber !== undefined && spin.winningNumber !== null) {
            frequencies[spin.winningNumber]++;
        }
    });

    // Create a sorted list of numbers by frequency (Hot to Cold)
    const allStats = Object.keys(frequencies).map(n => ({
        num: parseInt(n),
        count: frequencies[n]
    }));
    allStats.sort((a, b) => b.count - a.count);

    // Identify Top 5 Hot
    const top5Hot = allStats.slice(0, 5).map(s => s.num);

    // 2. Find Midpoint (Cluster Center)
    let bestCenterIndex = 0;
    let minTotalDistance = Infinity;

    for (let i = 0; i < 37; i++) {
        let totalDist = 0;
        top5Hot.forEach(hotNum => {
            const hotIndex = getWheelIndex(hotNum);
            totalDist += getDistance(i, hotIndex);
        });
        
        if (totalDist < minTotalDistance) {
            minTotalDistance = totalDist;
            bestCenterIndex = i;
        }
    }

    // 3. Define the 19-Number Sector
    // Center + 9 to the right (clockwise) + 9 to the left (counter-clockwise)
    const sectorIndices = [];
    sectorIndices.push(bestCenterIndex); // 1 (Center)
    
    for (let k = 1; k <= 9; k++) {
        sectorIndices.push((bestCenterIndex + k) % 37); // 9 Right
        sectorIndices.push((bestCenterIndex - k + 37) % 37); // 9 Left
    }
    
    // Map indices back to actual wheel numbers
    const sectorNumbers = sectorIndices.map(idx => WHEEL[idx]);

    // 4. Return Bet Objects
    // Exactly 19 bets will be returned every time
    return sectorNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: unitSize
    }));
}