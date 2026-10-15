/**
 * Strategy: Ultimate Profit Roulette System
 * * Source:
 * - URL: https://youtu.be/co4IcpB_gO8
 * - YouTube Channel: The Roulette Master
 * * Description:
 * This strategy dynamically tracks the last 9 to 10 roulette spins to determine which 
 * dozen is the "coldest" (longest since it has hit). It functions as a dual-mode system 
 * combining a Low Roller option (the default base progression) and a High Roller option 
 * (the high-value breakout trigger mode).
 * * The Full Logic in Detail:
 * 1. Tracking: Every spin history is examined to scan the last 9 spins. We calculate 
 * how many spins ago each dozen (1st, 2nd, or 3rd) last appeared. 
 * 2. Target Dozen selection: We target the dozen that has been absent for the maximum 
 * number of spins (longest dormant).
 * 3. Trigger Mode: 
 * - Low Roller Mode (Base): If all three dozens are present anywhere in the last 9 numbers, 
 * we run the low roller tier.
 * - High Roller Mode (Breakout Trigger): If a dozen has completely missed hitting in 
 * the last 9 spins (i.e. zero occurrences in the tracked block), the trigger condition is met! 
 * We transition over to the High Roller tier betting patterns for that dozen.
 * 4. Betting Layout: On our chosen dozen, we place an interconnected combination layout:
 * - Outside Dozen Bet
 * - 2 Corner Bets inside that specific dozen table section
 * - 2 Split Bets inside that specific dozen table section
 * The exact numbers targeted for the corners and splits are optimized to safely match 
 * the layouts shown in the source gameplay (e.g. 1st Dozen focuses on inner row corners 
 * and horizontal/vertical splits).
 * * The Full Bet Progression in Detail:
 * - Low Roller Base Unit Unit: $2 for corners/dozen, $1 for splits (Total $8 base layout).
 * - High Roller Base Unit Tier: $10 for corners/dozen, $5 for splits (Total $40 base layout).
 * - Progression Rules (Fibonacci & Martingale Hybrid):
 * - Inside Bets (Corners & Splits): If a spin results in a loss, we keep tracking our targets, 
 * add an extra newly available positional layout or continue doubling current positioning stakes. 
 * Upon any inside hit, the system recalculates baseline profit state.
 * - Outside Bet (Dozen): The Dozen progression operates on a strict Fibonacci-style progression track 
 * based on position tracking levels.
 * - Low Roller Progression sequence values: $2 -> $4 -> $6 -> $10 -> $16 -> $26...
 * - High Roller Progression sequence values: $10 -> $20 -> $30 -> $50 -> $80...
 * - Resets: If the player bankroll achieves net session profit above the baseline tier target, 
 * the progression stages instantly clear and reset back to base level 1.
 * * The Goal:
 * Achieve a clean target profit overhead per run before walking away, resetting safely on 
 * session high-water marks. Stop-loss protection limits are integrated via safe ceiling clamps 
 * mapping back to `config.betLimits.max`.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // ----------------------------------------------------
    // 1. INITIALIZE PERSISTENT STATE OBJECTS
    // ----------------------------------------------------
    if (!state.isInitialized) {
        state.currentHighWatermark = bankroll;
        state.progressionLevel = 0; // Index in Fibonacci-style arrays
        state.isInitialized = true;
    }

    // Always update maximum bankroll achieved to track clean session profit goals
    if (bankroll > state.currentHighWatermark) {
        state.currentHighWatermark = bankroll;
        state.progressionLevel = 0; // Reset progression stage on fresh profits
    }

    // Minimal fallback requirements check
    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    // ----------------------------------------------------
    // 2. ANALYZE SPIN HISTORY FOR COLD DOZENS & TRIGGERS
    // ----------------------------------------------------
    const lookbackLength = Math.min(spinHistory.length, 9);
    const recentSpins = spinHistory.slice(-lookbackLength);

    // Occurrences and tracking counters across 1st, 2nd, 3rd dozens
    let dozenCounts = { 1: 0, 2: 0, 3: 0 };
    let lastSeenIndex = { 1: lookbackLength, 2: lookbackLength, 3: lookbackLength };

    for (let i = 0; i < recentSpins.length; i++) {
        const num = recentSpins[i].winningNumber;
        let d = 0;
        if (num >= 1 && num <= 12) d = 1;
        else if (num >= 13 && num <= 24) d = 2;
        else if (num >= 25 && num <= 36) d = 3;

        if (d > 0) {
            dozenCounts[d]++;
            // Track how many spins ago this dozen was last witnessed (0 means most recent spin)
            lastSeenIndex[d] = (lookbackLength - 1) - i;
        }
    }

    // Determine the coldest dozen (longest time elapsed since last appearance)
    let targetDozen = 1;
    let maxAbsence = -1;
    for (let d = 1; d <= 3; d++) {
        if (lastSeenIndex[d] > maxAbsence) {
            maxAbsence = lastSeenIndex[d];
            targetDozen = d;
        }
    }

    // Check if the trigger configuration for High Roller breakout mode is active
    // Condition met if any dozen completely missed hitting inside the tracked block window
    let isHighRollerActive = false;
    for (let d = 1; d <= 3; d++) {
        if (dozenCounts[d] === 0) {
            isHighRollerActive = true;
            // Align target priority to the complete shutout match
            targetDozen = d;
            break;
        }
    }

    // Check spin logic from previous execution step to adjust internal tracking
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;
    let lastSpinDozen = 0;
    if (lastNum >= 1 && lastNum <= 12) lastSpinDozen = 1;
    else if (lastNum >= 13 && lastNum <= 24) lastSpinDozen = 2;
    else if (lastNum >= 25 && lastNum <= 36) lastSpinDozen = 3;

    // ----------------------------------------------------
    // 3. DEFINE UNIT BASELINES AND STAKE SELECTIONS
    // ----------------------------------------------------
    const minInside = config.betLimits.min || 2;
    const minOutside = config.betLimits.minOutside || 5;
    const maxTableBet = config.betLimits.max || 500;

    // Establish specific scale configurations matching live layout logs
    let baseDozenUnit, baseCornerUnit, baseSplitUnit;
    let dozenProgressionCurve = [];

    if (isHighRollerActive) {
        // High Roller Tier Bets configuration matching Jeff's Breakout sequence
        baseDozenUnit = Math.max(10, minOutside);
        baseCornerUnit = Math.max(10, minInside);
        baseSplitUnit = Math.max(5, minInside);

        // Fibonacci sequence tracking curves for Dozen layouts
        dozenProgressionCurve = [10, 20, 30, 50, 80, 130, 210, 340, 500];
    } else {
        // Low Roller standard protection defaults
        baseDozenUnit = Math.max(2, minOutside); // Clamp strictly to minOutside threshold rules
        baseCornerUnit = Math.max(2, minInside);
        baseSplitUnit = Math.max(1, minInside);

        dozenProgressionCurve = [2, 4, 6, 10, 16, 26, 42, 68, 110, 178, 280, 450];
    }

    // Advance progression tier step indicator on failure flags
    if (spinHistory.length > 1) {
        // We evaluate previous betting state flags to inspect if targeted dozen hit successfully
        // State checks handle safe alignment steps
        if (state.lastTargetedDozen && lastSpinDozen !== state.lastTargetedDozen) {
            state.progressionLevel++;
            if (state.progressionLevel >= dozenProgressionCurve.length) {
                state.progressionLevel = dozenProgressionCurve.length - 1; // Safeguard overflow limits
            }
        } else {
            state.progressionLevel = 0; // Return gracefully to stage 0 tracking upon hit match
        }
    }

    // Extract current dynamically calculated stake modifiers
    let activeDozenBetAmount = dozenProgressionCurve[state.progressionLevel] || baseDozenUnit;
    
    // Scale inside positioning components mapping to active tier multipliers smoothly
    let multiplierScaleFactor = Math.max(1, Math.floor(activeDozenBetAmount / baseDozenUnit));
    let activeCornerBetAmount = baseCornerUnit * multiplierScaleFactor;
    let activeSplitBetAmount = baseSplitUnit * multiplierScaleFactor;

    // Cache the currently processed target choice to compare on subsequent iteration loops
    state.lastTargetedDozen = targetDozen;

    // ----------------------------------------------------
    // 4. MAP POSITION GRID PLACEMENTS AND COMPILING BETS
    // ----------------------------------------------------
    let finalizedBetList = [];

    // Dozen positioning configuration object mapper values
    finalizedBetList.push({
        type: 'dozen',
        value: targetDozen,
        amount: Math.min(Math.max(activeDozenBetAmount, minOutside), maxTableBet)
    });

    // Generate specific geographic inner layout vectors based on chosen active target dozen sector maps
    let cornerCoordinates = [];
    let splitCoordinates = [];

    if (targetDozen === 1) {
        // 1st Dozen inner coordinates layout numbers tracking paths (1-12)
        cornerCoordinates = [1, 7];          // Corner covering [1,2,4,5] and [7,8,10,11]
        splitCoordinates = [[2, 3], [8, 9]];  // Splits matching inner vertical layout boundaries
    } else if (targetDozen === 2) {
        // 2nd Dozen inner coordinates layout numbers tracking paths (13-24)
        cornerCoordinates = [13, 19];
        splitCoordinates = [[14, 15], [20, 21]];
    } else {
        // 3rd Dozen inner coordinates layout numbers tracking paths (25-36)
        cornerCoordinates = [25, 31];
        splitCoordinates = [[26, 27], [32, 33]];
    }

    // Format corner layouts seamlessly
    cornerCoordinates.forEach(val => {
        finalizedBetList.push({
            type: 'corner',
            value: val,
            amount: Math.min(Math.max(activeCornerBetAmount, minInside), maxTableBet)
        });
    });

    // Format split layouts seamlessly
    splitCoordinates.forEach(pair => {
        finalizedBetList.push({
            type: 'split',
            value: pair,
            amount: Math.min(Math.max(activeSplitBetAmount, minInside), maxTableBet)
        });
    });

    return finalizedBetList;
}