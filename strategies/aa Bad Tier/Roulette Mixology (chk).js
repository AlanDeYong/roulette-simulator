/**
 * ROULETTE MIXOLOGY RULES STRATEGY
 *
 * Source:
 *   Channel: The Roulette Master
 *   Video: "ROULETTE MIXOLOGY RULES! #1 #best #roulette #system"
 *   URL: https://youtu.be/Jr9TLHtzbUQ (Strategy segment starts at ~19:00)
 *
 * Strategy Overview & Bet Placements:
 *   - The system covers 8 out of the 12 Streets (24 numbers total, ~64.8% European / 63.1% American coverage).
 *   - Standard layout covers 8 central streets: 4 (4-6), 7 (7-9), 10 (10-12), 13 (13-15), 16 (16-18),
 *     19 (19-21), 22 (22-24), and 25 (25-27).
 *   - Base Bet: 1 Inside unit (config.betLimits.min) per street (e.g., 8 x $5 = $40 base total).
 *
 * Progression Rules:
 *   1. On Win:
 *      - Add 1 base unit (+config.betLimits.min) to every active street EXCEPT the one that just hit.
 *      - The winning street keeps its current bet amount unchanged.
 *      - If cycle profit reaches +10 base units ($50 with $5 unit) or session profit milestone is achieved,
 *        reset all bets back to base level (1 unit on each of the 8 streets).
 *   2. On Total Loss (Miss on uncovered streets or green zero):
 *      - Double all existing street bet amounts (Martingale progression).
 *      - Continue doubling on consecutive misses.
 *      - Upon hitting a win after doubling, if recovered into profit, reset back to base level.
 *
 * Goal / Bankroll Management:
 *   - Target profit: Lock in +10 units ($50) profit per cycle and reset.
 *   - Stop loss: Protected by table max limit (config.betLimits.max) and available bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // Define the 8 active streets by their starting number
    const activeStreets = [4, 7, 10, 13, 16, 19, 22, 25];

    // Helper: Find which street a number belongs to (returns starting number or -1)
    function getStreetForNumber(num) {
        if (num <= 0 || num > 36) return -1;
        return Math.floor((num - 1) / 3) * 3 + 1;
    }

    // Helper: Full Reset to base bets
    function resetToBase() {
        state.streetBets = {};
        for (const st of activeStreets) {
            state.streetBets[st] = unit;
        }
        state.cycleStartBankroll = bankroll;
        state.inDoubleMode = false;
    }

    // 2. Initialize State
    if (!state.streetBets || Object.keys(state.streetBets).length === 0) {
        resetToBase();
    }

    // 3. Process previous spin result if available
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const hitStreet = getStreetForNumber(winningNum);
        const isHit = activeStreets.includes(hitStreet);

        if (isHit) {
            // A. WIN
            const currentCycleProfit = bankroll - (state.cycleStartBankroll || bankroll);
            const profitTarget = unit * 10; // Target +$50 per cycle with $5 units

            if (currentCycleProfit >= profitTarget || (state.inDoubleMode && currentCycleProfit >= 0)) {
                // Profit target met or recovered from double mode into profit -> Reset
                resetToBase();
            } else {
                // Add 1 base unit to every street EXCEPT the street that just hit
                for (const st of activeStreets) {
                    if (st !== hitStreet) {
                        const increment = (config.incrementMode === 'base') ? unit : (config.minIncrementalBet || unit);
                        state.streetBets[st] = (state.streetBets[st] || unit) + increment;
                    }
                }
                state.inDoubleMode = false;
            }
        } else {
            // B. TOTAL LOSS (Ball landed on 0/00 or uncovered street 1, 28, 31, 34)
            state.inDoubleMode = true;
            for (const st of activeStreets) {
                state.streetBets[st] = (state.streetBets[st] || unit) * 2;
            }
        }
    }

    // 4. Construct bet objects with limits clamping
    const bets = [];
    let totalBetCost = 0;

    for (const st of activeStreets) {
        let amount = state.streetBets[st] || unit;

        // Clamp to min and max table limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, maxBet);

        // Update state to match clamped value
        state.streetBets[st] = amount;

        bets.push({
            type: 'street',
            value: st,
            amount: amount
        });
        totalBetCost += amount;
    }

    // Bankroll safety check
    if (totalBetCost > bankroll) {
        // If bankroll is insufficient for the full progression, reset to base
        resetToBase();
        bets.length = 0;
        for (const st of activeStreets) {
            const amount = Math.min(unit, maxBet);
            state.streetBets[st] = amount;
            bets.push({
                type: 'street',
                value: st,
                amount: amount
            });
        }
    }

    return bets;
}