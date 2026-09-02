/**
 * ============================================================================
 * Strategy Name: MAGIC WAND ROULETTE SYSTEM
 * Source: Bet With Mo (YouTube: https://youtu.be/AdEde5-koLY)
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. Base Setup:
 *    - Anchor Bet: Placed on Green (Split 0/00 on American tables, Straight Up 0 on European tables).
 *    - Street Bets: Placed starting from either the LOW end (Streets 1, 4, 7) or HIGH end (Streets 34, 31, 28).
 *    - The starting direction alternates between LOW and HIGH each time a new session high / target reset is achieved.
 * 
 * 2. Progression & Board Coverage:
 *    - Level 0: 1 Anchor + 3 Streets (4 positions) @ 1 unit each = 4 units total.
 *    - Level 1 (Loss 1): Expand to 6 Streets (7 positions) @ 2 units each = 14 units total (+1 unit/bet).
 *    - Level 2 (Loss 2): Expand to 9 Streets (10 positions) @ 4 units each = 40 units total (add 3 streets, double all).
 *    - Level 3 (Loss 3): 10 positions @ 6 units each = 60 units total (+2 units/bet).
 *    - Level 4 (Loss 4): 10 positions @ 11 units each = 110 units total (+5 units/bet).
 *    - Level 5 (Loss 5): 10 positions @ 21 units each = 210 units total (+10 units/bet).
 *    - Level 6 (Loss 6): 10 positions @ 42 units each = 420 units total (2x Double up).
 *    - Total Bankroll requirement for full 7-step cycle: 858 units.
 * 
 * 3. Win/Loss Progression:
 *    - On Loss: Advance to the next step on the progression ladder.
 *    - On Win:
 *      * If bankroll reaches or exceeds the session high (`bankroll >= state.sessionHigh`),
 *        reset progression back to Level 0, update `sessionHigh`, and switch starting side (LOW <-> HIGH).
 *      * If still in recovery (`bankroll < state.sessionHigh`), rebet current level until a new session high is made.
 * 
 * 4. The Goal:
 *    - Continuous profit locking via session-high tracking with board coverage expanding up to ~75-80% on losses.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit (inside bets minimum limit)
    const baseUnit = config.betLimits.min || 1;

    // 2. Progression Ladder definition (unit multipliers and street count per level)
    const PROGRESSION_LADDER = [
        { level: 0, streetsCount: 3, unitsPerBet: 1 },  // Total: 4 bets * 1 = 4 units
        { level: 1, streetsCount: 6, unitsPerBet: 2 },  // Total: 7 bets * 2 = 14 units
        { level: 2, streetsCount: 9, unitsPerBet: 4 },  // Total: 10 bets * 4 = 40 units
        { level: 3, streetsCount: 9, unitsPerBet: 6 },  // Total: 10 bets * 6 = 60 units
        { level: 4, streetsCount: 9, unitsPerBet: 11 }, // Total: 10 bets * 11 = 110 units
        { level: 5, streetsCount: 9, unitsPerBet: 21 }, // Total: 10 bets * 21 = 210 units
        { level: 6, streetsCount: 9, unitsPerBet: 42 }  // Total: 10 bets * 42 = 420 units
    ];

    // 3. Initialize Persistent State
    if (state.level === undefined) state.level = 0;
    if (state.direction === undefined) state.direction = 'LOW'; // 'LOW' or 'HIGH'
    if (state.sessionHigh === undefined) state.sessionHigh = bankroll;
    if (state.prevBankroll === undefined) state.prevBankroll = bankroll;

    // 4. Evaluate Previous Spin Result (if history exists)
    if (spinHistory && spinHistory.length > 0) {
        const won = bankroll > state.prevBankroll;

        if (won) {
            if (bankroll >= state.sessionHigh) {
                // New session peak reached -> Reset and toggle side
                state.sessionHigh = bankroll;
                state.level = 0;
                state.direction = state.direction === 'LOW' ? 'HIGH' : 'LOW';
            }
            // If won but hasn't reached session high, stay at current level to continue recovery
        } else {
            // Loss -> Step up progression
            state.level = Math.min(state.level + 1, PROGRESSION_LADDER.length - 1);
        }
    }

    // Update bankroll tracker for next spin evaluation
    state.prevBankroll = bankroll;

    // 5. Retrieve Current Level Config
    const currentStep = PROGRESSION_LADDER[state.level];
    
    // Calculate and clamp bet amount per spot
    let amountPerSpot = baseUnit * currentStep.unitsPerBet;
    amountPerSpot = Math.max(amountPerSpot, config.betLimits.min);
    amountPerSpot = Math.min(amountPerSpot, config.betLimits.max);

    // 6. Build Bet Array
    const bets = [];

    // Anchor Bet (Green 0 / 00)
    if (config.tableType === 'american') {
        bets.push({
            type: 'split',
            value: [0, '00'],
            amount: amountPerSpot
        });
    } else {
        bets.push({
            type: 'number',
            value: 0,
            amount: amountPerSpot
        });
    }

    // Street Bets Selection based on starting direction
    const lowStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25];
    const highStreets = [34, 31, 28, 25, 22, 19, 16, 13, 10];

    const selectedStreetList = (state.direction === 'LOW' ? lowStreets : highStreets).slice(0, currentStep.streetsCount);

    for (let i = 0; i < selectedStreetList.length; i++) {
        bets.push({
            type: 'street',
            value: selectedStreetList[i],
            amount: amountPerSpot
        });
    }

    return bets;
}