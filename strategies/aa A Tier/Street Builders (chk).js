/**
 * ============================================================================
 * STRATEGY: 'Street Builders' Roulette Strategy
 * ============================================================================
 * Source: Gamblers University (YouTube)
 * URL: https://youtu.be/YFAPbyQw4rk
 * 
 * THE FULL LOGIC IN DETAIL:
 * ----------------------------------------------------------------------------
 * 1. Coverage:
 *    - Covers 27 numbers across 9 selected streets (leaving 3 streets and zero open):
 *      - Streets: 4, 7, 10 (1st Dozen), 16, 19, 22 (2nd Dozen), 28, 31, 34 (3rd Dozen).
 *    - On progressive levels after losses, "builds" upon the streets by adding:
 *      - 6 Corners ("Foundation"): Corners starting at 4, 7, 16, 19, 28, 31.
 *      - 3 Splits ("Roof / Top"): Splits on [8, 9], [20, 21], [32, 33].
 * 
 * 2. THE BET PROGRESSION IN DETAIL:
 *    - Base Unit: Minimum inside bet unit (`config.betLimits.min`).
 *    - The progression cycles through 3 building stages (Cycle `c`, starting at 1):
 *      * Stage 1 (Streets):
 *        - 9 Streets @ (c * 1) unit each
 *        - 6 Corners @ ((c - 1) * 2) units each (0 units in Cycle 1)
 *        - 3 Splits  @ ((c - 1) * 3) units each (0 units in Cycle 1)
 *        - Cycle 1 Bet: 9 units ($9). Cycle 2 Bet: 39 units ($39).
 *      * Stage 2 (Foundation / Corners added):
 *        - Triggered if Stage 1 loses.
 *        - 9 Streets @ (c * 1) unit each
 *        - 6 Corners @ (c * 2) units each
 *        - 3 Splits  @ ((c - 1) * 3) units each (0 units in Cycle 1)
 *        - Cycle 1 Bet: 21 units ($21). Cycle 2 Bet: 51 units ($51).
 *      * Stage 3 (Roof / Splits added):
 *        - Triggered if Stage 2 loses.
 *        - 9 Streets @ (c * 1) unit each
 *        - 6 Corners @ (c * 2) units each
 *        - 3 Splits  @ (c * 3) units each
 *        - Cycle 1 Bet: 30 units ($30). Cycle 2 Bet: 60 units ($60).
 *      * Further Losses:
 *        - If Stage 3 loses, advance to Cycle `c + 1` and return to Stage 1.
 * 
 * 3. WIN / RECOVERY RESET:
 *    - Whenever current bankroll reaches or exceeds the highest recorded session bankroll
 *      (`bankroll >= state.sessionHigh`), reset immediately back to Cycle 1, Stage 1.
 * 
 * 4. THE GOAL:
 *    - Default win target: +$50 profit (or user session target).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minUnit = config.betLimits.min;
    const maxLimit = config.betLimits.max;

    // 1. Initialize State
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.cycle = 1;
        state.stage = 1; // 1: Streets, 2: +Corners, 3: +Splits
        state.winGoal = bankroll + 50000;
    }

    // 2. Process Win/Loss from Previous Spin
    if (spinHistory.length > 0) {
        if (bankroll >= state.sessionHigh) {
            // Reached or surpassed session peak - reset to base level
            state.sessionHigh = bankroll;
            state.cycle = 1;
            state.stage = 1;
        } else {
            // Did not recover session high - advance stage / cycle on loss
            if (state.stage === 1) {
                state.stage = 2;
            } else if (state.stage === 2) {
                state.stage = 3;
            } else if (state.stage === 3) {
                state.cycle += 1;
                state.stage = 1;
            }
        }
    }

    // Stop if target profit reached
    if (bankroll >= state.winGoal) {
        return [];
    }

    // 3. Board Placements Configuration
    const streetPositions = [4, 7, 10, 16, 19, 22, 28, 31, 34];
    const cornerPositions = [4, 7, 16, 19, 28, 31];
    const splitPositions  = [[8, 9], [20, 21], [32, 33]];

    // 4. Calculate Unit Multipliers per Bet Type
    const c = state.cycle;
    const s = state.stage;

    // Street units: c * 1
    const streetUnits = c * 1;

    // Corner units: c * 2 if stage >= 2, else (c - 1) * 2
    const cornerUnits = (s >= 2) ? (c * 2) : ((c - 1) * 2);

    // Split units: c * 3 if stage === 3, else (c - 1) * 3
    const splitUnits = (s === 3) ? (c * 3) : ((c - 1) * 3);

    const bets = [];

    // Helper to clamp bet amounts within table limits
    function createClampedBet(type, value, units) {
        if (units <= 0) return null;
        let amount = units * minUnit;
        amount = Math.max(amount, minUnit);
        amount = Math.min(amount, maxLimit);
        return { type: type, value: value, amount: amount };
    }

    // Place Street Bets
    if (streetUnits > 0) {
        for (let i = 0; i < streetPositions.length; i++) {
            const b = createClampedBet('street', streetPositions[i], streetUnits);
            if (b) bets.push(b);
        }
    }

    // Place Corner Bets
    if (cornerUnits > 0) {
        for (let i = 0; i < cornerPositions.length; i++) {
            const b = createClampedBet('corner', cornerPositions[i], cornerUnits);
            if (b) bets.push(b);
        }
    }

    // Place Split Bets
    if (splitUnits > 0) {
        for (let i = 0; i < splitPositions.length; i++) {
            const b = createClampedBet('split', splitPositions[i], splitUnits);
            if (b) bets.push(b);
        }
    }

    return bets;
}