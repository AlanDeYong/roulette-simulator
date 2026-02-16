<<<<<<< HEAD
/**
 * Modified "Five Crosses" (Moving Corners) Strategy
 *
 * Source:
 * "INCREDIBLE NEW TAMMY'S CORNER-TOWN ROULETTE SYSTEM!" by The Roulette Master
 * Video Segment: Starts approx 15:30 (referred to as a "blast from the past")
 * Video URL: https://youtu.be/N4JUBZQFugk
 *
 * The Logic (Moving Corners):
 * 1. Start by placing a bet on a single Corner.
 * 2. If you WIN: Reset to 1 Corner.
 * 3. If you LOSE: Add a NEW Corner to the board (do not remove the old one).
 * - Continue adding corners after each loss until you have 5 Corners on the board.
 * - Corners should be placed to avoid overlap if possible (or just randomly selected),
 * but essentially you just keep adding coverage.
 *
 * The Progression (Delayed Martingale):
 * 1. Base Unit: Table minimum for inside bets.
 * 2. Multiplier increases ONLY if you lose while holding 5 Corners.
 * - Levels 1-4 (1 to 4 corners): Bet amount stays at Base Unit (1 unit).
 * - Level 5 (5 corners):
 * - If you win: Reset to 1 Corner @ 1 unit.
 * - If you lose at Level 5: DOUBLE the bet unit (Martingale style) for the NEXT spin.
 * - Continue betting 5 Corners at the doubled unit until a win occurs, or you lose again and double again.
 *
 * The Goal:
 * - Reach "Session Profit" (Current Bankroll > Starting Bankroll).
 * - "Take the Money and Run": The video emphasizes resetting if you are very close (e.g., within $5)
 * to the session profit target during a recovery, rather than risking a large bet for a small gain.
 * (In this simulation code, we strictly reset on any actual session profit).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.initialBankroll === undefined) state.initialBankroll = bankroll;
    if (state.activeCorners === undefined) state.activeCorners = []; // Array of corner start numbers
    if (state.unitMultiplier === undefined) state.unitMultiplier = 1;

    // Helper: Valid corner top-left numbers (excluding bottom row/far right to stay safe)
    // A corner covers x, x+1, x+3, x+4.
    // Valid top-lefts: 1,2, 4,5, 7,8 ... up to 32.
    // We can generate a list of all valid corner start indices.
    const validCornerStarts = [
        1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 
        22, 23, 25, 26, 28, 29, 31, 32
    ];

    // Helper: Function to get a random valid corner not currently active
    const getNewCorner = (active) => {
        // Filter out corners that are already active
        const available = validCornerStarts.filter(c => !active.includes(c));
        if (available.length === 0) return active[0]; // Fallback if full (unlikely with limit 5)
        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex];
    };

    // 2. Process Last Spin (if any)
    if (spinHistory.length > 0) {
        const lastBankroll = state.lastBankroll || state.initialBankroll;
        const wonLastSpin = bankroll > lastBankroll;
        const sessionProfit = bankroll - state.initialBankroll;

        if (wonLastSpin) {
            // WIN Logic
            // If we are in overall profit (Session Profit reached), RESET completely.
            // Video Rule: "If you're close (within $5-$10), reset." 
            // We'll treat any profit > 0 as a reset trigger.
            if (sessionProfit > 0) {
                state.activeCorners = [getNewCorner([])]; // Start with 1 fresh corner
                state.unitMultiplier = 1; // Reset bet size
            } else {
                // If we won but are still recovering (negative session profit):
                // The video implies resetting the *number* of corners if we hit a win,
                // effectively restarting the "Moving Corners" cycle but keeping the multiplier?
                // Actually, standard Moving Corners usually resets to 1 corner on a hit.
                // Given the goal is safety, we reset the count to 1 corner, 
                // but if we are deep in a hole, we might keep the multiplier?
                // Video at 25:00: "You win... Reset... Pick a new bet."
                // So on ANY win, we reset to 1 Corner.
                state.activeCorners = [getNewCorner([])];
                
                // Do we reset the multiplier?
                // In standard Martingale/Recovery, a win usually resets the multiplier.
                // The video says "Once we're in session profit we restart".
                // If NOT in session profit, but we won, we likely keep the multiplier high 
                // to recover, OR we drop back.
                // However, the video at 20:50 implies restarting the progression loop 
                // but checking session profit. 
                // To adhere to "Safety", if we win, we reset the shape to 1 corner.
                // We will typically reset multiplier only if we clear the loss, 
                // but standard practice here often resets multiplier to 1 to avoid massive risk.
                // Let's reset multiplier to 1 on win for safety (as hinted "reset... pick a new bet").
                state.unitMultiplier = 1; 
            }
        } else {
            // LOSS Logic
            // If we have fewer than 5 corners, add one.
            if (state.activeCorners.length < 5) {
                state.activeCorners.push(getNewCorner(state.activeCorners));
                // Do NOT increase multiplier yet (Delayed doubling).
            } else {
                // We have 5 corners and lost.
                // NOW we double the bet.
                state.unitMultiplier *= 2;
                // Keep the same 5 corners (or shuffle them, implementation choice, keeping same is standard).
            }
        }
    } else {
        // First Spin initialization
        state.activeCorners = [getNewCorner([])];
    }

    // 3. Determine Bet Amount
    const baseUnit = config.betLimits.min; // Usually min for inside bets
    let betAmount = baseUnit * state.unitMultiplier;

    // 4. Clamp to Limits
    // Ensure we don't go below min or above max
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Update lastBankroll for next spin comparison
    state.lastBankroll = bankroll;

    // 5. Construct Bets
    const bets = state.activeCorners.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: betAmount
    }));

    return bets;
=======
/**
 * Modified "Five Crosses" (Moving Corners) Strategy
 *
 * Source:
 * "INCREDIBLE NEW TAMMY'S CORNER-TOWN ROULETTE SYSTEM!" by The Roulette Master
 * Video Segment: Starts approx 15:30 (referred to as a "blast from the past")
 * Video URL: https://youtu.be/N4JUBZQFugk
 *
 * The Logic (Moving Corners):
 * 1. Start by placing a bet on a single Corner.
 * 2. If you WIN: Reset to 1 Corner.
 * 3. If you LOSE: Add a NEW Corner to the board (do not remove the old one).
 * - Continue adding corners after each loss until you have 5 Corners on the board.
 * - Corners should be placed to avoid overlap if possible (or just randomly selected),
 * but essentially you just keep adding coverage.
 *
 * The Progression (Delayed Martingale):
 * 1. Base Unit: Table minimum for inside bets.
 * 2. Multiplier increases ONLY if you lose while holding 5 Corners.
 * - Levels 1-4 (1 to 4 corners): Bet amount stays at Base Unit (1 unit).
 * - Level 5 (5 corners):
 * - If you win: Reset to 1 Corner @ 1 unit.
 * - If you lose at Level 5: DOUBLE the bet unit (Martingale style) for the NEXT spin.
 * - Continue betting 5 Corners at the doubled unit until a win occurs, or you lose again and double again.
 *
 * The Goal:
 * - Reach "Session Profit" (Current Bankroll > Starting Bankroll).
 * - "Take the Money and Run": The video emphasizes resetting if you are very close (e.g., within $5)
 * to the session profit target during a recovery, rather than risking a large bet for a small gain.
 * (In this simulation code, we strictly reset on any actual session profit).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.initialBankroll === undefined) state.initialBankroll = bankroll;
    if (state.activeCorners === undefined) state.activeCorners = []; // Array of corner start numbers
    if (state.unitMultiplier === undefined) state.unitMultiplier = 1;

    // Helper: Valid corner top-left numbers (excluding bottom row/far right to stay safe)
    // A corner covers x, x+1, x+3, x+4.
    // Valid top-lefts: 1,2, 4,5, 7,8 ... up to 32.
    // We can generate a list of all valid corner start indices.
    const validCornerStarts = [
        1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 
        22, 23, 25, 26, 28, 29, 31, 32
    ];

    // Helper: Function to get a random valid corner not currently active
    const getNewCorner = (active) => {
        // Filter out corners that are already active
        const available = validCornerStarts.filter(c => !active.includes(c));
        if (available.length === 0) return active[0]; // Fallback if full (unlikely with limit 5)
        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex];
    };

    // 2. Process Last Spin (if any)
    if (spinHistory.length > 0) {
        const lastBankroll = state.lastBankroll || state.initialBankroll;
        const wonLastSpin = bankroll > lastBankroll;
        const sessionProfit = bankroll - state.initialBankroll;

        if (wonLastSpin) {
            // WIN Logic
            // If we are in overall profit (Session Profit reached), RESET completely.
            // Video Rule: "If you're close (within $5-$10), reset." 
            // We'll treat any profit > 0 as a reset trigger.
            if (sessionProfit > 0) {
                state.activeCorners = [getNewCorner([])]; // Start with 1 fresh corner
                state.unitMultiplier = 1; // Reset bet size
            } else {
                // If we won but are still recovering (negative session profit):
                // The video implies resetting the *number* of corners if we hit a win,
                // effectively restarting the "Moving Corners" cycle but keeping the multiplier?
                // Actually, standard Moving Corners usually resets to 1 corner on a hit.
                // Given the goal is safety, we reset the count to 1 corner, 
                // but if we are deep in a hole, we might keep the multiplier?
                // Video at 25:00: "You win... Reset... Pick a new bet."
                // So on ANY win, we reset to 1 Corner.
                state.activeCorners = [getNewCorner([])];
                
                // Do we reset the multiplier?
                // In standard Martingale/Recovery, a win usually resets the multiplier.
                // The video says "Once we're in session profit we restart".
                // If NOT in session profit, but we won, we likely keep the multiplier high 
                // to recover, OR we drop back.
                // However, the video at 20:50 implies restarting the progression loop 
                // but checking session profit. 
                // To adhere to "Safety", if we win, we reset the shape to 1 corner.
                // We will typically reset multiplier only if we clear the loss, 
                // but standard practice here often resets multiplier to 1 to avoid massive risk.
                // Let's reset multiplier to 1 on win for safety (as hinted "reset... pick a new bet").
                state.unitMultiplier = 1; 
            }
        } else {
            // LOSS Logic
            // If we have fewer than 5 corners, add one.
            if (state.activeCorners.length < 5) {
                state.activeCorners.push(getNewCorner(state.activeCorners));
                // Do NOT increase multiplier yet (Delayed doubling).
            } else {
                // We have 5 corners and lost.
                // NOW we double the bet.
                state.unitMultiplier *= 2;
                // Keep the same 5 corners (or shuffle them, implementation choice, keeping same is standard).
            }
        }
    } else {
        // First Spin initialization
        state.activeCorners = [getNewCorner([])];
    }

    // 3. Determine Bet Amount
    const baseUnit = config.betLimits.min; // Usually min for inside bets
    let betAmount = baseUnit * state.unitMultiplier;

    // 4. Clamp to Limits
    // Ensure we don't go below min or above max
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Update lastBankroll for next spin comparison
    state.lastBankroll = bankroll;

    // 5. Construct Bets
    const bets = state.activeCorners.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: betAmount
    }));

    return bets;
>>>>>>> origin/main
}