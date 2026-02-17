<<<<<<< HEAD
/**
 * STRATEGY: "Trust the Process" (Low Roller System)
 * * SOURCE: 
 * Channel: Bet With Mo
 * Video: https://www.youtube.com/watch?v=__svmhqJf5k
 * Title: NEW ROULETTE SYSTEM FOR LOW ROLLERS HUGE PROFITS SMALL BANKROLL STRATEGY
 * * LOGIC:
 * This strategy focuses on covering specific "zones" of the board using a combination of 
 * Straight Up (Single Number) bets and Street bets to maximize coverage while hunting for high payouts.
 * * ZONES:
 * 1. Low Zone (Stage 0): Numbers 2,3,5,6,8,9 + Streets 1-3, 4-6, 7-9.
 * 2. High Zone (Stage 0 Alt): Numbers 29,30,32,33,35,36 + Streets 28-30, 31-33, 34-36.
 * 3. Mid Zone (Stage 1 Recovery): Numbers 14,15,17,18,20,21 + Streets 13-15, 16-18, 19-21.
 * 4. Deep Recovery (Stage 2): Numbers 8,9,11,12 + Streets 7-9, 10-12.
 * * PROGRESSION:
 * - Start at Stage 0 (Base Unit).
 * - WIN: 
 * - Reset to Stage 0.
 * - Toggle between Low and High Zones (Ping-Pong).
 * - LOSS:
 * - If Stage 0 -> Move to Stage 1 (Mid Zone). Keep Base Unit.
 * - If Stage 1 -> Move to Stage 2 (Deep Recovery). DOUBLE the Unit.
 * - If Stage 2 -> Reset to Stage 0 (Stop Loss) to protect bankroll.
 * * GOAL:
 * - Grind small consistent profits using the 9-chip cover.
 * - Use the "Deep Recovery" spike to recover losses + profit if the first two stages fail.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. CONFIGURATION & CONSTANTS
    const MIN_CHIP = config.betLimits.min || 1;
    const MAX_BET = config.betLimits.max || 500;

    // Define the distinct betting zones based on the strategy
    const ZONES = {
        low: {
            numbers: [2, 3, 5, 6, 8, 9],
            streets: [1, 4, 7] // Street starting numbers
        },
        high: {
            numbers: [29, 30, 32, 33, 35, 36],
            streets: [28, 31, 34]
        },
        mid: {
            numbers: [14, 15, 17, 18, 20, 21],
            streets: [13, 16, 19]
        },
        recovery: {
            numbers: [8, 9, 11, 12],
            streets: [7, 10]
        }
    };

    // 2. STATE INITIALIZATION
    if (state.stage === undefined) state.stage = 0; // 0: Base, 1: Mid, 2: Deep Recovery
    if (!state.currentZone) state.currentZone = 'low'; // Start with Low numbers
    if (state.lastBetAmount === undefined) state.lastBetAmount = 0; // Track total bet for win/loss check

    // 3. ANALYZE PREVIOUS SPIN (If not first spin)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.totalPayout || 0; // Assuming simulator provides this, otherwise strictly we can't know purely from history without recalculating
        
        // We can determine Win/Loss by checking if Payout > Last Total Bet
        // (Or implies a hit if payout > 0, given the coverage nature)
        const isWin = lastWinAmount > state.lastBetAmount;

        if (isWin) {
            // WIN LOGIC: Reset progression, switch sides
            state.stage = 0;
            state.currentZone = (state.currentZone === 'low') ? 'high' : 'low';
        } else {
            // LOSS LOGIC: Progress through stages
            if (state.stage === 0) {
                state.stage = 1; // Move to Mid
            } else if (state.stage === 1) {
                state.stage = 2; // Move to Deep Recovery
            } else if (state.stage === 2) {
                state.stage = 0; // Stop Loss triggered, reset to Base
                state.currentZone = 'low'; // Reset position
            }
        }
    }

    // 4. DETERMINE ACTIVE ZONE & BET SIZE
    let activeZoneKey = 'low';
    let unitMultiplier = 1;

    if (state.stage === 0) {
        activeZoneKey = state.currentZone; // 'low' or 'high'
        unitMultiplier = 1;
    } else if (state.stage === 1) {
        activeZoneKey = 'mid';
        unitMultiplier = 1;
    } else if (state.stage === 2) {
        activeZoneKey = 'recovery';
        unitMultiplier = 2; // Double units for recovery
    }

    const targetZone = ZONES[activeZoneKey];
    
    // Calculate Chip Value (respecting limits)
    let chipValue = MIN_CHIP * unitMultiplier;
    chipValue = Math.min(chipValue, MAX_BET); 
    
    // 5. CONSTRUCT BETS
    const bets = [];
    let totalBetForTurn = 0;

    // Place Straight Up Bets
    targetZone.numbers.forEach(num => {
        bets.push({
            type: 'number',
            value: num,
            amount: chipValue
        });
        totalBetForTurn += chipValue;
    });

    // Place Street Bets
    targetZone.streets.forEach(streetStart => {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: chipValue
        });
        totalBetForTurn += chipValue;
    });

    // 6. UPDATE STATE & RETURN
    // Check if we can afford the bet
    if (totalBetForTurn > bankroll) {
        // If insufficient funds, try to bet base unit or return null
        if (bankroll < (targetZone.numbers.length + targetZone.streets.length) * MIN_CHIP) {
             return null; // Bankrupt
        }
        // Fallback: Reset to stage 0 logic implies cheaper bets? 
        // For simplicity, we just return empty if we can't afford the calculated strategy
        return []; 
    }

    state.lastBetAmount = totalBetForTurn;
    return bets;
=======
/**
 * STRATEGY: "Trust the Process" (Low Roller System)
 * * SOURCE: 
 * Channel: Bet With Mo
 * Video: https://www.youtube.com/watch?v=__svmhqJf5k
 * Title: NEW ROULETTE SYSTEM FOR LOW ROLLERS HUGE PROFITS SMALL BANKROLL STRATEGY
 * * LOGIC:
 * This strategy focuses on covering specific "zones" of the board using a combination of 
 * Straight Up (Single Number) bets and Street bets to maximize coverage while hunting for high payouts.
 * * ZONES:
 * 1. Low Zone (Stage 0): Numbers 2,3,5,6,8,9 + Streets 1-3, 4-6, 7-9.
 * 2. High Zone (Stage 0 Alt): Numbers 29,30,32,33,35,36 + Streets 28-30, 31-33, 34-36.
 * 3. Mid Zone (Stage 1 Recovery): Numbers 14,15,17,18,20,21 + Streets 13-15, 16-18, 19-21.
 * 4. Deep Recovery (Stage 2): Numbers 8,9,11,12 + Streets 7-9, 10-12.
 * * PROGRESSION:
 * - Start at Stage 0 (Base Unit).
 * - WIN: 
 * - Reset to Stage 0.
 * - Toggle between Low and High Zones (Ping-Pong).
 * - LOSS:
 * - If Stage 0 -> Move to Stage 1 (Mid Zone). Keep Base Unit.
 * - If Stage 1 -> Move to Stage 2 (Deep Recovery). DOUBLE the Unit.
 * - If Stage 2 -> Reset to Stage 0 (Stop Loss) to protect bankroll.
 * * GOAL:
 * - Grind small consistent profits using the 9-chip cover.
 * - Use the "Deep Recovery" spike to recover losses + profit if the first two stages fail.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. CONFIGURATION & CONSTANTS
    const MIN_CHIP = config.betLimits.min || 1;
    const MAX_BET = config.betLimits.max || 500;

    // Define the distinct betting zones based on the strategy
    const ZONES = {
        low: {
            numbers: [2, 3, 5, 6, 8, 9],
            streets: [1, 4, 7] // Street starting numbers
        },
        high: {
            numbers: [29, 30, 32, 33, 35, 36],
            streets: [28, 31, 34]
        },
        mid: {
            numbers: [14, 15, 17, 18, 20, 21],
            streets: [13, 16, 19]
        },
        recovery: {
            numbers: [8, 9, 11, 12],
            streets: [7, 10]
        }
    };

    // 2. STATE INITIALIZATION
    if (state.stage === undefined) state.stage = 0; // 0: Base, 1: Mid, 2: Deep Recovery
    if (!state.currentZone) state.currentZone = 'low'; // Start with Low numbers
    if (state.lastBetAmount === undefined) state.lastBetAmount = 0; // Track total bet for win/loss check

    // 3. ANALYZE PREVIOUS SPIN (If not first spin)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.totalPayout || 0; // Assuming simulator provides this, otherwise strictly we can't know purely from history without recalculating
        
        // We can determine Win/Loss by checking if Payout > Last Total Bet
        // (Or implies a hit if payout > 0, given the coverage nature)
        const isWin = lastWinAmount > state.lastBetAmount;

        if (isWin) {
            // WIN LOGIC: Reset progression, switch sides
            state.stage = 0;
            state.currentZone = (state.currentZone === 'low') ? 'high' : 'low';
        } else {
            // LOSS LOGIC: Progress through stages
            if (state.stage === 0) {
                state.stage = 1; // Move to Mid
            } else if (state.stage === 1) {
                state.stage = 2; // Move to Deep Recovery
            } else if (state.stage === 2) {
                state.stage = 0; // Stop Loss triggered, reset to Base
                state.currentZone = 'low'; // Reset position
            }
        }
    }

    // 4. DETERMINE ACTIVE ZONE & BET SIZE
    let activeZoneKey = 'low';
    let unitMultiplier = 1;

    if (state.stage === 0) {
        activeZoneKey = state.currentZone; // 'low' or 'high'
        unitMultiplier = 1;
    } else if (state.stage === 1) {
        activeZoneKey = 'mid';
        unitMultiplier = 1;
    } else if (state.stage === 2) {
        activeZoneKey = 'recovery';
        unitMultiplier = 2; // Double units for recovery
    }

    const targetZone = ZONES[activeZoneKey];
    
    // Calculate Chip Value (respecting limits)
    let chipValue = MIN_CHIP * unitMultiplier;
    chipValue = Math.min(chipValue, MAX_BET); 
    
    // 5. CONSTRUCT BETS
    const bets = [];
    let totalBetForTurn = 0;

    // Place Straight Up Bets
    targetZone.numbers.forEach(num => {
        bets.push({
            type: 'number',
            value: num,
            amount: chipValue
        });
        totalBetForTurn += chipValue;
    });

    // Place Street Bets
    targetZone.streets.forEach(streetStart => {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: chipValue
        });
        totalBetForTurn += chipValue;
    });

    // 6. UPDATE STATE & RETURN
    // Check if we can afford the bet
    if (totalBetForTurn > bankroll) {
        // If insufficient funds, try to bet base unit or return null
        if (bankroll < (targetZone.numbers.length + targetZone.streets.length) * MIN_CHIP) {
             return null; // Bankrupt
        }
        // Fallback: Reset to stage 0 logic implies cheaper bets? 
        // For simplicity, we just return empty if we can't afford the calculated strategy
        return []; 
    }

    state.lastBetAmount = totalBetForTurn;
    return bets;
>>>>>>> origin/main
}