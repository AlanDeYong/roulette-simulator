/**
 * STRATEGY: Hopscotch Roulette System
 * * Source: The Roulette Master (YouTube)
 * * URL: https://www.youtube.com/watch?v=xYOqdm3qN-4
 * * THE LOGIC:
 * A high-coverage system covering 20 numbers using 3 "Double Street" bets and 1 Zero hedge.
 * 1. The script WAITS for the first spin to occur without betting to establish a reference number.
 * 2. The first line bet is placed on the double street of that LAST winning number.
 * 3. It determines if that hit was on the "Left" side of its dozen or the "Right" side.
 * 4. Bets 2 & 3 are placed in the OTHER two dozens, strictly on the OPPOSITE side.
 * * THE PROGRESSION:
 * - Martingale: The main double street bets double after a loss and reset to base after ANY win.
 * - Zero Hedge Rule: The zero bet remains flat after the 1st loss, doubling ONLY after 2 concurrent losses.
 * * THE GOAL:
 * - Target steady profit through 20-number coverage, relying on the first observed spin to accurately place the initial pattern.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 0. Wait for the first spin to determine the starting double street
    if (spinHistory.length === 0) {
        return []; 
    }

    // 1. Initialize State
    if (state.multiplier === undefined) state.multiplier = 1;
    if (state.zeroMultiplier === undefined) state.zeroMultiplier = 1;
    if (state.consecutiveLosses === undefined) state.consecutiveLosses = 0;
    if (state.lastBets === undefined) state.lastBets = [];

    // 2. Evaluate previous spin to update progression (Only if we actually placed bets)
    if (state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        let lastNumStr = lastSpin.winningNumber;
        let won = false;

        // Safely parse number. Treat '0' or '00' as 0 for win-checking.
        let actualNum = (lastNumStr === '00' || lastNumStr === 0 || lastNumStr === '0') ? 0 : parseInt(lastNumStr, 10);

        // Manually check if any of our last bets covered the winning number 
        for (let b of state.lastBets) {
            if (b.type === 'line') {
                // A 'line' bet covers 6 numbers starting from b.value
                if (actualNum >= b.value && actualNum <= b.value + 5) {
                    won = true;
                    break;
                }
            } else if (b.type === 'number' || b.type === 'basket') {
                if (actualNum === b.value || (b.type === 'basket' && actualNum <= 3)) {
                    won = true;
                    break;
                }
            }
        }

        // Apply Progression Rules
        if (won) {
            state.multiplier = 1;
            state.zeroMultiplier = 1;
            state.consecutiveLosses = 0;
        } else {
            state.consecutiveLosses++;
            state.multiplier *= 2;
            
            // "The base bet for zero is not doubled until 2 concurrent losses"
            if (state.consecutiveLosses >= 2) {
                state.zeroMultiplier *= 2;
            }
        }
    }

    // 3. Determine placement based on the last number
    let ln = spinHistory[spinHistory.length - 1].winningNumber;
    let referenceNum;
    
    // If the last spin was green (0 or 00), fallback to 1 to pick the double street right next to it
    if (ln === '00' || ln === 0 || ln === '0' || isNaN(parseInt(ln, 10))) {
        referenceNum = 1;
    } else {
        referenceNum = parseInt(ln, 10);
    }

    // Math to figure out the exact Double Street (Line) the number belongs to
    // Lines start at: 1, 7, 13, 19, 25, 31
    const hitLineStart = Math.ceil(referenceNum / 6) * 6 - 5;
    const currentDozen = Math.ceil(referenceNum / 12); // 1, 2, or 3
    
    // Check if the hit was on the Left side (1, 13, 25) or Right side (7, 19, 31) of its dozen
    const isLeft = (hitLineStart === 1 || hitLineStart === 13 || hitLineStart === 25);

    // 4. Calculate Bet Amounts and strictly clamp to Limits
    let mainUnit = config.betLimits.minOutside || 5; 
    let zeroUnit = config.betLimits.min || 1;

    let mainAmount = mainUnit * state.multiplier;
    mainAmount = Math.max(mainAmount, config.betLimits.minOutside || config.betLimits.min);
    mainAmount = Math.min(mainAmount, config.betLimits.max);

    let zeroAmount = zeroUnit * state.zeroMultiplier;
    zeroAmount = Math.max(zeroAmount, config.betLimits.min);
    zeroAmount = Math.min(zeroAmount, config.betLimits.max);

    let bets = [];

    // Bet 1: The Double Street where the last number hit
    bets.push({
        type: 'line',
        value: hitLineStart,
        amount: mainAmount
    });

    // Bets 2 & 3: The opposite sides of the OTHER two dozens
    const otherDozens = [1, 2, 3].filter(d => d !== currentDozen);
    
    otherDozens.forEach(dozen => {
        // If original hit was Left, place on Right (+7). If original was Right, place on Left (+1).
        const oppositeSideStart = isLeft ? ((dozen - 1) * 12 + 7) : ((dozen - 1) * 12 + 1);
        
        bets.push({
            type: 'line',
            value: oppositeSideStart,
            amount: mainAmount
        });
    });

    // Bet 4: The Zero Hedge
    bets.push({
        type: 'number',
        value: 0,
        amount: zeroAmount
    });

    // 5. Store for the next iteration and return
    state.lastBets = bets;
    return bets;
}