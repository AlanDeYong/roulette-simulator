/**
 * Jesse's Favorite Strategy
 * 
 * SOURCE:
 * - Channel: The Roulette Master
 * - Video URL: https://youtu.be/cKMOHbIfqhI
 * 
 * STRATEGY LOGIC DETAILS:
 * - Base Setup: The strategy begins by placing a 1-unit straight-up bet on 16 specific initial numbers 
 *   (5, 7, 8, 9, 11, 16, 17, 18, 19, 20, 21, 26, 28, 29, 30, 32).
 * - Target / Reset Condition: The goal is to reach a new peak session bankroll (net profit). Whenever 
 *   the bankroll hits or exceeds the highest recorded peak (session high), all bets reset back to 
 *   the initial 16 numbers at base unit size (1 unit).
 * 
 * BET PROGRESSION DETAILS:
 * 1. Initial / Reset State:
 *    - Bet 16 initial straight-up numbers at 1 base unit (clamped to config.betLimits.min).
 * 
 * 2. On Loss:
 *    - Expansion & Doubling: Add 3 new numbers to the active bet list (1 unbet number randomly 
 *      chosen from each of the 3 dozens, ensuring the selected numbers are NOT numbers that recently won).
 *    - Double the unit bet size per number (e.g., 1 unit -> 2 units -> 4 units -> 8 units -> 16 units...).
 * 
 * 3. On Win (Recovery Mode - Not at Peak Bankroll):
 *    - If a spin wins but net bankroll remains below the highest session peak, remove the winning number 
 *      from the active bet list (reducing coverage count by 1).
 *    - Maintain the current unit bet size for the remaining active numbers without doubling or resetting.
 * 
 * GOAL:
 * - Reach a new session profit peak and reset the progression back to base level.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Minimum unit for inside bets (straight-up numbers)
    const baseUnit = config?.betLimits?.min || 1;
    const maxBet = config?.betLimits?.max || 500;

    // Initial 16 numbers based on corrected pattern
    const default16Numbers = [5, 7, 8, 9, 11, 16, 17, 18, 19, 20, 21, 26, 28, 29, 30, 32];

    // Helper: Dozen group ranges (1-12, 13-24, 25-36)
    const dozenRanges = [
        [1, 12],
        [13, 24],
        [25, 36]
    ];

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.peakBankroll = bankroll;
        state.unitSize = baseUnit;
        state.activeNumbers = [...default16Numbers];
        state.initialized = true;
    }

    // Update peak bankroll if current bankroll strictly exceeds previous peak
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Process Spin Results (if any exist)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Check if last bet hit a new session peak / target condition
        const isSessionProfit = bankroll >= state.peakBankroll;

        if (isSessionProfit) {
            // Target achieved: Reset to base 16 numbers and base unit size
            state.unitSize = baseUnit;
            state.activeNumbers = [...default16Numbers];
        } else {
            // Evaluate outcome of last spin
            const wasHit = state.activeNumbers.includes(winningNum);

            if (wasHit) {
                // Recovery Win: Remove the winning number from active bet list, keep unit size same
                state.activeNumbers = state.activeNumbers.filter(num => num !== winningNum);
            } else {
                // Loss: Double the unit size and add 1 unbet number from each of the 3 dozens
                state.unitSize = state.unitSize * 2;

                // Track recently winning numbers from history (e.g., last 10 spins)
                const recentHistory = spinHistory.slice(-10);
                const recentlyWonNumbers = new Set(recentHistory.map(spin => spin.winningNumber));

                dozenRanges.forEach(([start, end]) => {
                    // Gather all unbet candidates in this dozen range
                    let candidates = [];
                    for (let n = start; n <= end; n++) {
                        if (!state.activeNumbers.includes(n)) {
                            candidates.push(n);
                        }
                    }

                    // Filter out candidates that recently won
                    let eligibleCandidates = candidates.filter(num => !recentlyWonNumbers.has(num));

                    // Fallback to all unbet candidates if all numbers in the dozen recently won
                    if (eligibleCandidates.length === 0) {
                        eligibleCandidates = candidates;
                    }

                    // Select 1 candidate completely at random
                    if (eligibleCandidates.length > 0) {
                        const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
                        state.activeNumbers.push(eligibleCandidates[randomIndex]);
                    }
                });
            }
        }
    }

    // Fallback: If active numbers array gets emptied out during recovery, reset to base
    if (!state.activeNumbers || state.activeNumbers.length === 0) {
        state.activeNumbers = [...default16Numbers];
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