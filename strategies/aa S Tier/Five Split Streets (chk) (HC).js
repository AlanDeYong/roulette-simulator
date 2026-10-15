/**
 * ============================================================================
 * STRATEGY: Five Split Streets - Dynamic Hot/Cold Rolling Window Variant
 * ============================================================================
 * Source: 
 *   - Base Strategy: "Five Split Streets Roulette Strategy" (Ninja Gamblers / Jack Ace)
 *   - Video: https://youtu.be/23EB2AdSQqE
 *
 * Modifications:
 *   1. Observation Period:
 *      - Observes for the first 37 spins without placing any bets.
 *   2. Dynamic Selection (Rolling 37-Spin Window):
 *      - Ranks numbers 0-36 by frequency over the last 37 spins.
 *      - Selects the 5 hottest 3-number streets.
 *      - Selects 5 high-scoring, non-overlapping splits from the remaining rows
 *        to ensure 25 distinct numbers are covered while avoiding cold numbers.
 *   3. Position Persistence:
 *      - The selected 5 streets and 5 splits stay locked across spins until a 
 *        reset occurs (split win or return to Tier 1).
 *      - Upon a reset, the algorithm re-evaluates the latest rolling 37 spins 
 *        to determine the next set of bets.
 *
 * Bet Progression:
 *   - Tier 1 to Tier 4 (1 unit increase per spot after a miss).
 *   - Split Win: Resets progression to Tier 1 and triggers re-selection.
 *   - Street Win: Steps down 1 tier (to minimum Tier 1).
 *   - Target Profit: +100 units; Max Progression: Tier 4.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits && config.betLimits.min ? config.betLimits.min : 1;
    const maxAllowed = config.betLimits && config.betLimits.max ? config.betLimits.max : 500;

    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.tier = 1;
        state.maxTier = 4;
        state.targetProfit = 10000 * unit;
        state.activeBets = null;
        state.needsRecalculation = true;
        state.lastBankroll = bankroll;
    }

    // Stop betting if profit target reached
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        return [];
    }

    // 2. Observation Phase: Must have at least 37 spins before placing bets
    if (!spinHistory || spinHistory.length < 37) {
        return [];
    }

    // 3. Evaluate previous spin outcome if active bets were placed
    if (state.activeBets && state.activeBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        let hitSplit = false;
        let hitStreet = false;

        for (const b of state.activeBets) {
            if (b.type === 'split' && b.value.includes(lastNum)) {
                hitSplit = true;
                break;
            } else if (b.type === 'street' && (lastNum >= b.value && lastNum <= b.value + 2)) {
                hitStreet = true;
                break;
            }
        }

        if (hitSplit) {
            // Full recovery: Reset tier and flag for recalculation using rolling 37 spins
            state.tier = 1;
            state.needsRecalculation = true;
        } else if (hitStreet) {
            // Partial recovery: Step down 1 tier
            state.tier = Math.max(1, state.tier - 1);
            if (state.tier === 1) {
                state.needsRecalculation = true;
            }
        } else {
            // Miss: Step up progression, lock existing bet positions
            state.tier = Math.min(state.maxTier, state.tier + 1);
        }
    }

    // 4. Determine / Re-evaluate Bet Positions if reset
    if (state.needsRecalculation || !state.activeBets) {
        const windowSpins = spinHistory.slice(-37);
        const freq = {};
        for (let i = 0; i <= 36; i++) freq[i] = 0;
        for (const spin of windowSpins) {
            if (typeof spin.winningNumber === 'number') {
                freq[spin.winningNumber] = (freq[spin.winningNumber] || 0) + 1;
            }
        }

        // Evaluate all 12 standard street rows (starts: 1, 4, 7, ..., 34)
        const streetRows = [];
        for (let s = 1; s <= 34; s += 3) {
            const score = (freq[s] || 0) + (freq[s + 1] || 0) + (freq[s + 2] || 0);
            streetRows.push({ start: s, score: score });
        }

        // Sort rows by hottest combined frequency
        streetRows.sort((a, b) => b.score - a.score);

        // Select top 5 hottest rows for Street bets
        const chosenStreets = streetRows.slice(0, 5);
        const remainingRows = streetRows.slice(5);

        // From remaining 7 rows, pick top 5 rows to place 5 non-overlapping splits
        remainingRows.sort((a, b) => b.score - a.score);
        const chosenSplitRows = remainingRows.slice(0, 5);

        // Within each split row [s, s+1, s+2], choose the hotter split pair
        const chosenSplits = chosenSplitRows.map(row => {
            const s = row.start;
            const pairA = [s, s + 1];
            const pairB = [s + 1, s + 2];
            const scoreA = (freq[s] || 0) + (freq[s + 1] || 0);
            const scoreB = (freq[s + 1] || 0) + (freq[s + 2] || 0);
            return scoreA >= scoreB ? pairA : pairB;
        });

        state.activeBets = {
            streets: chosenStreets.map(r => r.start),
            splits: chosenSplits
        };
        state.needsRecalculation = false;
    }

    // 5. Calculate Bet Sizing
    let betPerSpot = unit * state.tier;
    betPerSpot = Math.max(betPerSpot, config.betLimits.min);
    betPerSpot = Math.min(betPerSpot, maxAllowed);

    const totalRequired = betPerSpot * 10;
    if (bankroll < totalRequired) {
        return []; // Insufficient bankroll
    }

    state.lastBankroll = bankroll;

    // 6. Build and Return Formatted Bets
    const bets = [];

    // 5 Street bets
    for (const streetStart of state.activeBets.streets) {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: betPerSpot
        });
    }

    // 5 Split bets
    for (const splitPair of state.activeBets.splits) {
        bets.push({
            type: 'split',
            value: splitPair,
            amount: betPerSpot
        });
    }

    return bets;
}