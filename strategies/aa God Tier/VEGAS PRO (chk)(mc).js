/**
 * Vegas Pro Roulette Strategy
 * 
 * Source: YouTube - "Bet with Mo"
 * Strategy Name: Vegas Pro
 * 
 * Strategy Logic:
 * 1. Initial Setup:
 *    - Places bets on 8 horizontal splits: 8/9, 11/12, 14/15, 17/18, 20/21, 23/24, 26/27, 29/30. (Base bet: 1 unit each)
 *    - Places bets on 8 corresponding streets: 7, 10, 13, 16, 19, 22, 25, 28. (Base bet: 2 units each)
 * 
 * 2. Progression & Win/Loss Rules:
 *    - Target Peak: Aims to gain 20 units of profit. Once reached, the session resets to Level 1.
 *    - On Loss:
 *      - Reactivates any inactive splits.
 *      - Resets temporary street increments.
 *      - If the last total bet was >= 100 units (or we are already in doubling mode), we enter "doubling mode" 
 *        (up to 2 steps: 2x, then 4x) to recover quickly.
 *      - Otherwise, we increase the progression level by 1 (adding +1 unit to all splits and +1 unit to all streets).
 *    - On Win:
 *      - If in doubling mode, we decrease the doubling multiplier step-by-step (e.g., from 4x down to 2x, then back to normal).
 *      - If not in doubling mode:
 *        - If the win was on a split: we deactivate that split for subsequent rounds and add +1 unit to all streets.
 *        - If the win was only on a street (and not a split): we keep the identical bet configuration.
 * 
 * @param {Array} spinHistory - Array of past spin results
 * @param {number} bankroll - Current bankroll
 * @param {Object} config - Configuration parameters
 * @param {Object} state - Persistent state container
 * @param {Object} utils - Helper utilities
 * @returns {Array} Array of bet objects
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = Math.max(config.betLimits.min, 1);

    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.peakBankroll = bankroll;
        state.targetProfit = bankroll + 20 * unit;
        state.level = 1;
        state.doubleSteps = 0; // 0 = normal, 1 = 2x, 2 = 4x
        state.inactiveSplits = [];
        state.streetIncrements = 0;
        state.lastActiveSplits = [0, 1, 2, 3, 4, 5, 6, 7];
        state.lastTotalBet = 0;
    }

    // Update Peak Bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Helper functions to check winning slots
    function getWinningSplitIndex(N) {
        if (N < 8 || N > 30) return -1;
        let rem = (N - 8) % 3;
        if (rem === 0 || rem === 1) {
            let i = Math.floor((N - 8) / 3);
            if (i >= 0 && i <= 7) return i;
        }
        return -1;
    }

    function getWinningStreetIndex(N) {
        if (N < 7 || N > 30) return -1;
        let i = Math.floor((N - 7) / 3);
        if (i >= 0 && i <= 7) return i;
        return -1;
    }

    // Process last spin result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const N = lastSpin.winningNumber;

        const winningSplitIdx = getWinningSplitIndex(N);
        const winningStreetIdx = getWinningStreetIndex(N);

        const splitWon = winningSplitIdx !== -1 && state.lastActiveSplits.includes(winningSplitIdx);
        const streetWon = winningStreetIdx !== -1;

        const overallWin = splitWon || streetWon;

        if (overallWin) {
            if (state.doubleSteps > 0) {
                // Step down the doubling multiplier
                state.doubleSteps -= 1;
            } else {
                // Check if target profit milestone reached
                if (bankroll >= state.targetProfit) {
                    state.level = 1;
                    state.inactiveSplits = [];
                    state.streetIncrements = 0;
                    state.peakBankroll = bankroll;
                    state.targetProfit = bankroll + 20 * unit;
                } else {
                    if (splitWon) {
                        // Deactivate the winning split and increase street bets
                        if (!state.inactiveSplits.includes(winningSplitIdx)) {
                            state.inactiveSplits.push(winningSplitIdx);
                        }
                        state.streetIncrements += 1;
                    }
                    // If street won but split did not, maintain identical bets
                }
            }
        } else {
            // Lost: Reset temporary session modifications and progress level
            state.inactiveSplits = [];
            state.streetIncrements = 0;

            const triggerThreshold = 100 * unit;
            if (state.lastTotalBet >= triggerThreshold || state.doubleSteps > 0) {
                state.doubleSteps = Math.min(state.doubleSteps + 1, 2);
            } else {
                state.level += 1;
            }
        }
    }

    // Build list of active splits for this spin
    let activeSplits = [];
    for (let i = 0; i < 8; i++) {
        if (!state.inactiveSplits.includes(i)) {
            activeSplits.push(i);
        }
    }
    state.lastActiveSplits = activeSplits;

    // Calculate bet sizing
    const multiplier = Math.pow(2, state.doubleSteps);
    
    let splitAmount = state.level * unit * multiplier;
    splitAmount = Math.max(splitAmount, config.betLimits.min);
    splitAmount = Math.min(splitAmount, config.betLimits.max);

    let streetAmount = (state.level + 1 + state.streetIncrements) * unit * multiplier;
    streetAmount = Math.max(streetAmount, config.betLimits.min);
    streetAmount = Math.min(streetAmount, config.betLimits.max);

    // Generate bet arrays
    let bets = [];

    // Split positions
    const splitsList = [
        [8, 9], [11, 12], [14, 15], [17, 18],
        [20, 21], [23, 24], [26, 27], [29, 30]
    ];
    activeSplits.forEach(idx => {
        bets.push({
            type: 'split',
            value: splitsList[idx],
            amount: splitAmount
        });
    });

    // Street positions
    const streetsList = [7, 10, 13, 16, 19, 22, 25, 28];
    streetsList.forEach(val => {
        bets.push({
            type: 'street',
            value: val,
            amount: streetAmount
        });
    });

    // Dynamic bankroll protection
    let totalRequested = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalRequested > bankroll) {
        const ratio = bankroll / totalRequested;
        bets.forEach(b => {
            b.amount = Math.floor(b.amount * ratio);
            if (b.amount < config.betLimits.min) {
                b.amount = config.betLimits.min;
            }
        });
        totalRequested = bets.reduce((sum, b) => sum + b.amount, 0);
    }

    state.lastTotalBet = totalRequested;

    return bets;
}