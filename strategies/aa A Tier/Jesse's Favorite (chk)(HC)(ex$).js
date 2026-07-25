/**
 * Jesse's Favorite Strategy (Dynamic Hot Numbers Variant)
 * 
 * SOURCE:
 * - Channel: The Roulette Master
 * - Video URL: https://youtu.be/cKMOHbIfqhI
 * 
 * STRATEGY LOGIC DETAILS:
 * - Base Setup:
 *   - The strategy observes the wheel for 37 spins without placing bets to calculate frequency 
 *     for each number and identify the top 16 "hot numbers" (most frequently spun in the last 37 spins).
 *   - Initial bets of 1 unit are placed strictly on these 16 hot numbers.
 * - Target / Reset Condition:
 *   - The goal is to reach a new peak session bankroll (net profit).
 *   - Upon a full reset (when bankroll meets or exceeds the session high), the function looks back 
 *     at the most recent 37 spins to recalculate and select the 16 hottest numbers for the new session.
 * 
 * BET PROGRESSION DETAILS:
 * 1. Initial / Reset State:
 *    - Wait for 37 spins before placing initial bets.
 *    - Place 1 base unit (clamped to config.betLimits.min) on each of the 16 hottest numbers.
 * 
 * 2. On Loss:
 *    - Expansion & Doubling: Add 3 new numbers to the active bet list (1 unbet number randomly 
 *      chosen from each of the 3 dozens: 1-12, 13-24, 25-36).
 *    - Exclude recently winning numbers (from the last 10 spins) when selecting new numbers.
 *    - Double the unit bet size per number (1 unit -> 2 units -> 4 units -> 8 units...).
 * 
 * 3. On Win (Recovery Mode - Not at Peak Bankroll):
 *    - If a spin wins but net bankroll remains below the highest session peak, remove the winning 
 *      number from the active bet list (reducing coverage count by 1).
 *    - Maintain the current unit bet size for remaining active numbers.
 * 
 * GOAL:
 * - Reach a new session profit peak and reset to a freshly calculated set of 16 hot numbers.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Check spin history length requirement (Must have at least 37 spins)
    if (!spinHistory || spinHistory.length < 37) {
        return []; // Spin without betting for the first 37 spins
    }

    // Limits & Constants
    const baseUnit = config?.betLimits?.min || 1;
    const maxBet = config?.betLimits?.max || 500;
    const dozenRanges = [
        [1, 12],
        [13, 24],
        [25, 36]
    ];

    // Helper: Find top 16 hottest numbers over the last 37 spins
    function getHotNumbers(history) {
        const last37 = history.slice(-37);
        const counts = {};

        // Count frequencies for numbers 0 to 36
        for (let i = 0; i <= 36; i++) {
            counts[i] = 0;
        }
        last37.forEach(spin => {
            counts[spin.winningNumber] = (counts[spin.winningNumber] || 0) + 1;
        });

        // Sort numbers by frequency descending, then randomly pick ties
        const sortedNumbers = Object.keys(counts).map(Number).sort((a, b) => {
            if (counts[b] !== counts[a]) {
                return counts[b] - counts[a];
            }
            return 0.5 - Math.random(); // Randomize order on count ties
        });

        return sortedNumbers.slice(0, 16);
    }

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.peakBankroll = bankroll;
        state.unitSize = baseUnit;
        state.activeNumbers = getHotNumbers(spinHistory);
        state.initialized = true;
    }

    // Update peak bankroll if current bankroll strictly exceeds previous peak
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Process Spin Results
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Check if last bet hit a new session peak / target condition
    const isSessionProfit = bankroll >= state.peakBankroll;

    if (isSessionProfit) {
        // Target achieved / Full Reset: Recalculate top 16 hot numbers from past 37 spins
        state.unitSize = baseUnit;
        state.activeNumbers = getHotNumbers(spinHistory);
    } else {
        // Evaluate outcome of last spin
        const wasHit = state.activeNumbers.includes(winningNum);

        if (wasHit) {
            // Recovery Win: Remove the winning number from active bet list, keep unit size same
            state.activeNumbers = state.activeNumbers.filter(num => num !== winningNum);
        } else {
            // Loss: Double unit size and add 1 unbet number from each of the 3 dozens
            state.unitSize = state.unitSize * 2;

            // Track recently winning numbers from history (last 10 spins)
            const recentHistory = spinHistory.slice(-10);
            const recentlyWonNumbers = new Set(recentHistory.map(spin => spin.winningNumber));

            dozenRanges.forEach(([start, end]) => {
                // Gather unbet candidates in this dozen range
                let candidates = [];
                for (let n = start; n <= end; n++) {
                    if (!state.activeNumbers.includes(n)) {
                        candidates.push(n);
                    }
                }

                // Filter out candidates that recently won
                let eligibleCandidates = candidates.filter(num => !recentlyWonNumbers.has(num));

                // Fallback to all unbet candidates if all numbers in dozen recently won
                if (eligibleCandidates.length === 0) {
                    eligibleCandidates = candidates;
                }

                // Select 1 candidate randomly
                if (eligibleCandidates.length > 0) {
                    const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
                    state.activeNumbers.push(eligibleCandidates[randomIndex]);
                }
            });
        }
    }

    // Fallback: If active numbers array gets emptied out, reset to hot numbers
    if (!state.activeNumbers || state.activeNumbers.length === 0) {
        state.activeNumbers = getHotNumbers(spinHistory);
        state.unitSize = baseUnit;
    }

    // 4. Calculate Bet Amounts with Limits Clamping
    let clampedAmount = Math.max(state.unitSize, baseUnit);
    clampedAmount = Math.min(clampedAmount, maxBet);

    // 5. Construct & Return Bet Array
    const bets = state.activeNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: clampedAmount
    }));

    return bets;
}