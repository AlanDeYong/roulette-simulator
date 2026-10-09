/**
 * THE EQUALIZER ROULETTE STRATEGY
 *
 * Source:
 * - YouTube Channel: Roulette Strategy Lab (Terry)
 * - Video URL: https://youtu.be/jvQCC2dqslg
 * - Strategy Originator: Todd Hoover ("The Lucky Felt")
 *
 * The Full Logic in Detail:
 * 1. Target Selection:
 *    - The player targets a specific dozen (1st, 2nd, or 3rd). A dozen is targeted for up to
 *      3 hits before rotating to an under-represented dozen, or picked based on recent distribution.
 * 2. Two-Stage Cycle per Progression Step:
 *    - Stage 1 (Primary Bet): Place a single dozen bet equal to the current Fibonacci tier (F_n units).
 *      * If Win: Increment hit counter on the dozen. If net session profit is reached, reset progression
 *        to base level (1 unit). If target dozen reached 3 hits, rotate to the least-hit dozen.
 *      * If Loss: The strategy triggers the "Equalizer" recovery spin (Stage 2) without advancing the sequence yet.
 *    - Stage 2 (Equalizer Recovery Bet):
 *      * Double the dozen bet: 2 * (F_n units) on the chosen dozen.
 *      * Hedge on the opposing dozen: Find which dozen the last ball landed in. That dozen consists of
 *        4 streets. Place hedge bets on the 3 streets in that dozen that did NOT hit.
 *      * Each street bet amount = Half of the primary dozen bet (0.5 * F_n units).
 *      * If Stage 2 Wins (either on the doubled dozen or one of the 3 hedge streets):
 *        Payout covers previous losses. If net profit is reached, reset progression to step 1.
 *        Otherwise, step back down the Fibonacci ladder.
 *      * If Stage 2 Loses (neither dozen nor any of the 3 streets hits):
 *        Advance to the next Fibonacci tier (1, 2, 3, 5, 8, 13, ...) and return to Stage 1.
 *
 * The Goal:
 * - Target Profit: +10 base units (e.g. +$100 with $10 units), aligning with the 81-89% walk-away rate.
 * - Stop Loss: When bankroll drops below 20% of starting bankroll or insufficient to place next bet.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit respecting min outside and min inside bet limits
    // Note: Street bets require 0.5 * dozen unit, so dozen unit must be >= 2 * min inside bet.
    const minInside = config.betLimits.min || 2;
    const minOutside = config.betLimits.minOutside || 5;
    const maxLimit = config.betLimits.max || 500;
    const baseUnit = Math.max(minOutside, minInside * 2);

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.fibSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
        state.fibIndex = 0;
        state.stage = 'PRIMARY'; // 'PRIMARY' or 'RECOVERY'
        state.targetDozen = 3;   // Initial dozen selection (1, 2, or 3)
        state.dozenHits = 0;     // Track hits in current dozen (rotates at 3)
        state.startBankroll = bankroll;
        state.targetProfit = baseUnit * 1000; // Target +10 base units walk-away
        state.stopLoss = config.startingBankroll ? config.startingBankroll * 0.2 : bankroll * 0.2;
    }

    // Helper functions for roulette dozen & street mapping
    function getDozen(num) {
        if (num < 1 || num > 36) return 0;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    }

    function getStreetStart(num) {
        if (num < 1 || num > 36) return null;
        return Math.floor((num - 1) / 3) * 3 + 1;
    }

    function getStreetsForDozen(dozenNum) {
        const start = (dozenNum - 1) * 12 + 1;
        return [start, start + 3, start + 6, start + 9];
    }

    // Select dozen with the fewest hits in recent history to balance the board
    function getLeastHitDozen() {
        const counts = { 1: 0, 2: 0, 3: 0 };
        const lookback = Math.min(spinHistory.length, 36);
        for (let i = spinHistory.length - lookback; i < spinHistory.length; i++) {
            const d = getDozen(spinHistory[i].winningNumber);
            if (d >= 1 && d <= 3) counts[d]++;
        }
        let leastDozen = 1;
        let minCount = Infinity;
        for (let d = 1; d <= 3; d++) {
            if (counts[d] < minCount) {
                minCount = counts[d];
                leastDozen = d;
            }
        }
        return leastDozen;
    }

    // 3. Process Result of Previous Spin
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        const lastDozen = getDozen(lastNumber);

        if (state.stage === 'PRIMARY') {
            // Evaluated after a PRIMARY dozen bet
            if (lastDozen === state.targetDozen) {
                // Primary Bet Won
                state.dozenHits++;
                // If in overall session profit, reset progression
                if (bankroll >= state.startBankroll) {
                    state.fibIndex = 0;
                }
                // Check if reached 3 hits on this dozen
                if (state.dozenHits >= 3) {
                    state.targetDozen = getLeastHitDozen();
                    state.dozenHits = 0;
                }
                state.stage = 'PRIMARY';
            } else {
                // Primary Bet Lost -> Trigger Equalizer Recovery Stage
                state.stage = 'RECOVERY';
                state.lastHitNumber = lastNumber;
                state.lastHitDozen = lastDozen;
            }
        } else if (state.stage === 'RECOVERY') {
            // Evaluated after an EQUALIZER RECOVERY bet
            const hitTargetDozen = (lastDozen === state.targetDozen);
            const streetOfLastNumber = getStreetStart(lastNumber);
            const hitHedgeStreet = (state.activeStreets && state.activeStreets.includes(streetOfLastNumber));

            if (hitTargetDozen || hitHedgeStreet) {
                // Recovery Bet Won
                if (hitTargetDozen) state.dozenHits++;

                if (bankroll >= state.startBankroll) {
                    state.fibIndex = 0;
                } else {
                    // Step down 1-2 steps in Fibonacci progression
                    state.fibIndex = Math.max(0, state.fibIndex - 2);
                }

                if (state.dozenHits >= 3) {
                    state.targetDozen = getLeastHitDozen();
                    state.dozenHits = 0;
                }
                state.stage = 'PRIMARY';
            } else {
                // Recovery Bet Lost -> Advance Fibonacci progression
                state.fibIndex = Math.min(state.fibIndex + 1, state.fibSequence.length - 1);
                // Rotate dozen if stuck
                if (state.dozenHits === 0) {
                    state.targetDozen = getLeastHitDozen();
                }
                state.stage = 'PRIMARY';
            }
            state.activeStreets = null;
        }
    }

    // 4. Target Profit or Stop-Loss Verification
    if (bankroll >= state.startBankroll + state.targetProfit) {
        return []; // Walk away with target profit
    }
    if (bankroll <= state.stopLoss) {
        return []; // Stop loss triggered
    }

    // 5. Construct Bets
    const fibMultiplier = state.fibSequence[state.fibIndex];
    const currentBaseDozen = baseUnit * fibMultiplier;
    const bets = [];

    if (state.stage === 'PRIMARY') {
        // Stage 1: Single Dozen Bet
        let dozenBetAmount = Math.max(currentBaseDozen, minOutside);
        dozenBetAmount = Math.min(dozenBetAmount, maxLimit);

        if (dozenBetAmount > bankroll) return [];

        bets.push({
            type: 'dozen',
            value: state.targetDozen,
            amount: dozenBetAmount
        });
    } else {
        // Stage 2: Equalizer Recovery Bet
        // 1. Double the dozen bet
        let doubledDozenAmount = Math.max(currentBaseDozen * 2, minOutside);
        doubledDozenAmount = Math.min(doubledDozenAmount, maxLimit);

        // 2. Three streets in the opposing dozen where the last ball landed (excluding the winning street)
        let streetAmount = Math.max(Math.floor(currentBaseDozen / 2), minInside);
        streetAmount = Math.min(streetAmount, maxLimit);

        let hedgeStreets = [];
        if (state.lastHitDozen >= 1 && state.lastHitDozen <= 3) {
            const allStreets = getStreetsForDozen(state.lastHitDozen);
            const winningStreet = getStreetStart(state.lastHitNumber);
            hedgeStreets = allStreets.filter(st => st !== winningStreet);
        } else {
            // If ball landed on 0 / 00, hedge the first 3 streets of the opposite dozen
            const opposingDozen = state.targetDozen === 1 ? 2 : 1;
            hedgeStreets = getStreetsForDozen(opposingDozen).slice(0, 3);
        }

        const totalCost = doubledDozenAmount + (streetAmount * hedgeStreets.length);
        if (totalCost > bankroll) return [];

        state.activeStreets = hedgeStreets;

        bets.push({
            type: 'dozen',
            value: state.targetDozen,
            amount: doubledDozenAmount
        });

        for (const st of hedgeStreets) {
            bets.push({
                type: 'street',
                value: st,
                amount: streetAmount
            });
        }
    }

    return bets;
}