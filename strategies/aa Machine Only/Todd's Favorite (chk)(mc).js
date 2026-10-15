/**
 * Strategy: Todd's Favorite (Custom Correction Version)
 * Source: Custom User Specifications based on modifications to The Roulette Master
 * 
 * Logic:
 * - Base coverage includes 2 splits and 5 corners.
 * - On a win:
 *   - If current bankroll reaches or exceeds the session's peak profit, the strategy resets to the initial base state.
 *   - If bankroll is below the peak profit, winning bets are removed, and all remaining active bets are increased by 2 units each.
 * - On a loss:
 *   - The first loss triggers the addition of a 1-unit bet on corner 32/36, and all active bets are increased by 2 units.
 *   - Progressive loss tiers control unit increases for subsequent losses.
 * 
 * Bet Progression Tiers (On Loss):
 * - Loss 1: Add corner 32/36 (1 unit base), then increase ALL active bets by 2 units.
 * - Losses 2-4 (Next 3 losses): Increase all active bets by 2 units each.
 * - Losses 5-9 (Next 5 losses): Increase all active bets by 4 units each.
 * - Losses 10+ (Subsequent losses): Increase all active bets by 10 units each.
 * 
 * Goal:
 * - Capitalize on multi-hit variance inside specific board sectors while dynamically trimming winning locations and accelerating remaining coverages to recover to peak session bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unitSize = config.betLimits.min;

    // Helper to generate initial baseline bets
    function getBaseBets() {
        return [
            { id: 's0_2', type: 'split', value: [0, 2], units: 1 },
            { id: 's17_20', type: 'split', value: [17, 20], units: 1 },
            { id: 'c4', type: 'corner', value: 4, units: 1 },
            { id: 'c8', type: 'corner', value: 8, units: 1 },
            { id: 'c13', type: 'corner', value: 13, units: 1 },
            { id: 'c20', type: 'corner', value: 20, units: 1 },
            { id: 'c25', type: 'corner', value: 25, units: 1 }
        ];
    }

    // Helper to evaluate if a specific layout bet covers the winning number
    function checkIfBetWon(type, value, winningNumber) {
        if (type === 'split') {
            return value.includes(winningNumber);
        }
        if (type === 'corner') {
            const val = parseInt(value);
            if (val === 4) return [4, 5, 7, 8].includes(winningNumber);
            if (val === 8) return [8, 9, 11, 12].includes(winningNumber);
            if (val === 13) return [13, 14, 16, 17].includes(winningNumber);
            if (val === 20) return [20, 21, 23, 24].includes(winningNumber);
            if (val === 25) return [25, 26, 28, 29].includes(winningNumber);
            if (val === 32) return [32, 33, 35, 36].includes(winningNumber);
        }
        return false;
    }

    // Initialize state context variables
    if (state.peakProfit === undefined) {
        state.peakProfit = bankroll;
        state.consecutiveLosses = 0;
        state.activeBets = getBaseBets();
    }

    // Track peak profit threshold
    if (bankroll > state.peakProfit) {
        state.peakProfit = bankroll;
    }

    // Process last spin outcomes if history exists
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        let sessionHit = false;
        state.activeBets.forEach(b => {
            if (checkIfBetWon(b.type, b.value, winNum)) {
                sessionHit = true;
            }
        });

        if (sessionHit) {
            if (bankroll >= state.peakProfit) {
                // Reset session completely if peak achieved
                state.activeBets = getBaseBets();
                state.consecutiveLosses = 0;
                state.peakProfit = bankroll;
            } else {
                // Filter out winners, escalate remaining survivors
                state.activeBets = state.activeBets.filter(b => !checkIfBetWon(b.type, b.value, winNum));
                state.activeBets.forEach(b => {
                    b.units += 2;
                });
                state.consecutiveLosses = 0;
                
                // Safety insurance if all coverage was wiped out without achieving session peak
                if (state.activeBets.length === 0) {
                    state.activeBets = getBaseBets();
                }
            }
        } else {
            // Incremental loss execution path
            state.consecutiveLosses++;

            if (state.consecutiveLosses === 1) {
                // Verify corner 32/36 doesn't exist, inject it at base layer
                if (!state.activeBets.some(b => b.id === 'c32')) {
                    state.activeBets.push({ id: 'c32', type: 'corner', value: 32, units: 1 });
                }
                state.activeBets.forEach(b => { b.units += 2; });
            } else if (state.consecutiveLosses <= 4) {
                // Next 3 losses
                state.activeBets.forEach(b => { b.units += 2; });
            } else if (state.consecutiveLosses <= 9) {
                // Next 5 losses
                state.activeBets.forEach(b => { b.units += 4; });
            } else {
                // Subsequent systemic losses
                state.activeBets.forEach(b => { b.units += 10; });
            }
        }
    }

    // Format final runtime matrix array adjusted to current boundary constraints
    return state.activeBets.map(b => {
        let absoluteAmount = b.units * unitSize;
        absoluteAmount = Math.max(config.betLimits.min, Math.min(absoluteAmount, config.betLimits.max));
        return {
            type: b.type,
            value: b.value,
            amount: absoluteAmount
        };
    });
}