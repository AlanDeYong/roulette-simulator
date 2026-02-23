/**
 * Strategy: Moving Half Moon Hot Cold (Guaranteed 19 Numbers)
 * * Source: Derived from user prompt "Moving Half Moon Hot Cold" logic.
 * * The Logic:
 * 1. Analysis: Analyze the last 100 spins to rank all numbers by frequency.
 * 2. Hot/Cold: Identify Top 5 "Hot" and Bottom 5 "Cold".
 * 3. Sector: Find the "Mid Point" closest to the Hot numbers. Select a 19-number sector (Center + 9 Left + 9 Right).
 * 4. Filtering (The Fix):
 * - Check every number in the 19-number sector.
 * - If a number is "Cold" (matches Bottom 5), it MUST be removed.
 * - REPLACEMENT: Replace it with the best available number OUTSIDE the sector (highest frequency available).
 * - This ensures we always bet exactly 19 numbers.
 * * The Progression:
 * - Loss: Increase bet unit by +1.
 * - Win (Bankroll < Start): Rebet same unit.
 * - Win (Bankroll >= Start): Reset to base unit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- Configuration ---
    const MIN_HISTORY = 20;
    const ANALYSIS_WINDOW = 100;
    const BASE_UNIT = config.betLimits.min; 
    const WHEEL = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 
        10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    // --- Helpers ---
    const getWheelIndex = (num) => WHEEL.indexOf(num);
    const getDistance = (idx1, idx2) => {
        const diff = Math.abs(idx1 - idx2);
        return Math.min(diff, 37 - diff);
    };

    // --- Progression Management ---
    if (state.progression === undefined) state.progression = 1;
    if (state.sessionStartBankroll === undefined) state.sessionStartBankroll = bankroll;

    // Check last spin result
    if (state.lastBankroll !== undefined) {
        const pnl = bankroll - state.lastBankroll;
        
        if (pnl < 0) {
            // Loss: Increase bets
            state.progression += 1;
        } else if (pnl > 0) {
            // Win
            if (bankroll >= state.sessionStartBankroll) {
                // Recovered all losses + profit: Reset
                state.progression = 1;
            } else {
                // Won but still recovering: Maintain size
            }
        }
    }
    state.lastBankroll = bankroll;

    // Calculate Unit
    let unitSize = BASE_UNIT * state.progression;
    unitSize = Math.max(unitSize, config.betLimits.min);
    unitSize = Math.min(unitSize, config.betLimits.max);

    // --- Strategy Logic ---

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

    // Create a sorted list of all numbers by frequency (Hot to Cold)
    const allStats = Object.keys(frequencies).map(n => ({
        num: parseInt(n),
        count: frequencies[n]
    }));
    allStats.sort((a, b) => b.count - a.count);

    // Identify specific groups
    const top5Hot = allStats.slice(0, 5).map(s => s.num);
    const bottom5Cold = allStats.slice(-5).map(s => s.num);

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

    // 3. Define Initial Sector (19 Numbers)
    // Center + 9 Left + 9 Right
    const sectorIndices = [];
    sectorIndices.push(bestCenterIndex); // Center
    for (let k = 1; k <= 9; k++) {
        sectorIndices.push((bestCenterIndex + k) % 37); // Right
        sectorIndices.push((bestCenterIndex - k + 37) % 37); // Left
    }
    const sectorNumbers = sectorIndices.map(idx => WHEEL[idx]);

    // 4. Prepare Substitutes
    // Get all numbers NOT in the sector
    let potentialSubstitutes = WHEEL.filter(n => !sectorNumbers.includes(n));
    
    // Sort substitutes by frequency (Hotness) so we pick the best ones first
    potentialSubstitutes.sort((a, b) => {
        const countA = frequencies[a] || 0;
        const countB = frequencies[b] || 0;
        return countB - countA; // Descending
    });

    // 5. Build Final Bet List
    const finalBets = [];
    let subIndex = 0;

    sectorNumbers.forEach(targetNum => {
        // Is this number Cold?
        if (bottom5Cold.includes(targetNum)) {
            // YES: Swap it out.
            // Do we have substitutes left?
            if (subIndex < potentialSubstitutes.length) {
                finalBets.push(potentialSubstitutes[subIndex]);
                subIndex++; // Move to next substitute
            } else {
                // If we somehow run out of substitutes (impossible with 18 outside numbers and max 5 cold),
                // we would just skip, but math guarantees we have enough.
            }
        } else {
            // NO: It's safe to bet.
            finalBets.push(targetNum);
        }
    });

    // 6. Return Bet Objects
    return finalBets.map(num => ({
        type: 'number',
        value: num,
        amount: unitSize
    }));
}