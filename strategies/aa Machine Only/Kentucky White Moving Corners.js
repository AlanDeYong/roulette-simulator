
/**
 * Strategy: Moving Corners
 * Source: YouTube - The Roulette Master TV (https://www.youtube.com/watch?v=c6_0_o9Ielk)
 * Channel: THEROULETTEMASTERTV
 *
 * The Logic:
 * This strategy is a "coverage progression" system that starts small and expands to cover more of the board as losses occur.
 * - Start: 2 Corners (8 numbers covered).
 * - "Moving": The name implies picking new corners every time, but for automation, randomizing or rotating valid corners is sufficient.
 * * The Progression (Stages):
 * 1. Stage 1: 2 Corners @ Base Unit (Win -> Reset / Loss -> Go to Stage 2)
 * 2. Stage 2: 3 Corners @ Base Unit (Win -> Reset / Loss -> Go to Stage 3)
 * 3. Stage 3: 4 Corners @ 2x Base Unit (Win -> Reset / Loss -> Go to Stage 4)
 * 4. Stage 4: 5 Corners @ 4x Base Unit (Win -> Reset / Loss -> Go to Stage 5)
 * 5. Stage 5: 6 Corners @ 8x Base Unit (Win -> Reset / Loss -> Go to Stage 6)
 * 6. Stage 6: 6 Corners @ 16x Base Unit (Double bet size on same coverage)
 * - Win at Stage 6: Remove the winning corner (drop to 5 corners coverage) and assess profit. 
 * Usually safer to Reset if profit is positive.
 * - Loss at Stage 6: Stop Loss / Bankruptcy risk (System limit).
 *
 * The Goal:
 * To use the 8:1 payout of corners to secure small wins quickly with low coverage, 
 * but expand coverage (up to ~65%) and bet size to recover if early bets fail.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    // Use 'min' for corners (Inside bet)
    const BASE_UNIT = config.betLimits.min; 
    const MAX_BET = config.betLimits.max;

    // 2. Initialize State
    if (!state.initialized) {
        state.stage = 1;            // Current progression stage (1-6)
        state.currentCorners = [];  // Array of corner values currently targeted
        state.betMultiplier = 1;    // Multiplier for the base unit
        state.logData = "Spin,Stage,CornersCount,Multiplier,Result,Profit\n";
        state.totalProfit = 0;
        state.startBankroll = bankroll;
        state.initialized = true;
    }

    // 3. Helper: Generate unique random corners
    // Valid corners are top-left numbers. Not all numbers are valid top-lefts for corners.
    // e.g., 1, 2, 4, 5... 3 is invalid (right edge), 34 is invalid (bottom row)
    const getValidCorners = () => {
        const valid = [];
        // Rows 1 to 11 (values 1 to 33)
        // Cols 1 and 2 (mod 3 !== 0)
        for (let i = 1; i <= 32; i++) { // 32 is max valid top-left (covers 32,33,35,36)
            if (i % 3 !== 0) { 
                valid.push(i);
            }
        }
        return valid;
    };

    const pickRandomCorners = (count, current) => {
        const valid = getValidCorners();
        const selected = [];
        
        // If we want to keep some "moving" logic, we can just purely randomize every spin
        // or keep existing ones and add new ones. The video implies "Moving" means picking new spots.
        // We will randomize completely on Reset, but append on Loss to simulate "adding".
        
        // If we are adding (current has items), keep them and add new unique ones
        if (current && current.length > 0 && current.length < count) {
            selected.push(...current);
            while (selected.length < count) {
                const pick = valid[Math.floor(Math.random() * valid.length)];
                if (!selected.includes(pick)) {
                    selected.push(pick);
                }
            }
        } else {
            // Fresh selection (Reset or same count)
            while (selected.length < count) {
                const pick = valid[Math.floor(Math.random() * valid.length)];
                if (!selected.includes(pick)) {
                    selected.push(pick);
                }
            }
        }
        return selected;
    };

    const isCornerWin = (winningNum, cornerVal) => {
        // A corner at 'C' covers C, C+1, C+3, C+4
        const covers = [cornerVal, cornerVal + 1, cornerVal + 3, cornerVal + 4];
        return covers.includes(winningNum);
    };

    // 4. Process Previous Result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Did we win?
        let won = false;
        let winningCornerIndex = -1;

        if (state.currentCorners && state.currentCorners.length > 0) {
            for (let i = 0; i < state.currentCorners.length; i++) {
                if (isCornerWin(lastNum, state.currentCorners[i])) {
                    won = true;
                    winningCornerIndex = i;
                    break;
                }
            }
        }

        // Calculate Profit for logging
        // Cost = corners * (unit * multiplier)
        // Win = (unit * multiplier) * 8 (plus return of stake, but usually API handles net)
        // We track abstract profit for logs
        const currentBetSize = BASE_UNIT * state.betMultiplier;
        const totalWager = state.currentCorners.length * currentBetSize;
        let spinProfit = -totalWager;
        if (won) spinProfit += (currentBetSize * 9); // 8:1 payout + 1 stake returned

        state.totalProfit += spinProfit;
        state.logData += `${spinHistory.length},${state.stage},${state.currentCorners.length},${state.betMultiplier},${won ? 'WIN' : 'LOSS'},${state.totalProfit}\n`;

        // PROGRESSION LOGIC
        if (won) {
            if (state.stage === 6) {
                // Special Rule for Stage 6 Win:
                // "Remove the winning corner" -> Drop to 5 corners.
                // Reset multiplier? Video suggests "check profit". 
                // For automation safety, if Total Profit is positive relative to start, RESET.
                // If still negative, we might drop to Stage 4 or 5 logic.
                // Simplification: Win at Stage 6 -> Hard Reset to Stage 1 to lock profit/minimize risk.
                state.stage = 1;
            } else {
                // Standard Win -> Reset
                state.stage = 1;
            }
        } else {
            // Loss Logic
            if (state.stage === 1) state.stage = 2;       // 2 -> 3 corners
            else if (state.stage === 2) state.stage = 3;  // 3 -> 4 corners
            else if (state.stage === 3) state.stage = 4;  // 4 -> 5 corners
            else if (state.stage === 4) state.stage = 5;  // 5 -> 6 corners
            else if (state.stage === 5) state.stage = 6;  // 6 -> 6 corners (Double Bet)
            else if (state.stage === 6) {
                // Loss at Max Stage. 
                // Option A: Stop betting. 
                // Option B: Reset to 1. 
                // We will Reset to 1 to continue the session, but this is a major bankroll hit.
                state.stage = 1;
            }
        }
    }

    // 5. Determine Parameters for Next Bet
    let cornersCount = 2;
    let multiplier = 1;

    switch (state.stage) {
        case 1: cornersCount = 2; multiplier = 1; break;
        case 2: cornersCount = 3; multiplier = 1; break;
        case 3: cornersCount = 4; multiplier = 2; break; // Double bet
        case 4: cornersCount = 5; multiplier = 4; break; // Double again
        case 5: cornersCount = 6; multiplier = 8; break; // Double again
        case 6: cornersCount = 6; multiplier = 16; break; // Double again (Max coverage)
    }

    state.betMultiplier = multiplier;

    // 6. Select Corners
    // If we just reset (Stage 1), pick fresh.
    // If we progressed (Loss), add to existing if possible, or pick fresh if count dropped (rare).
    if (state.stage === 1) {
        state.currentCorners = pickRandomCorners(cornersCount, []);
    } else {
        // We are escalating. Keep previous losing corners (if they exist) and add new ones.
        // This simulates "Moving Corners" by adding coverage.
        state.currentCorners = pickRandomCorners(cornersCount, state.currentCorners);
    }

    // 7. Construct Bet Objects
    const bets = [];
    
    // Calculate amount ensuring limits
    let rawAmount = BASE_UNIT * state.betMultiplier;
    
    // Clamp limits
    let finalAmount = Math.max(rawAmount, config.betLimits.min);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    for (const cornerVal of state.currentCorners) {
        bets.push({
            type: 'corner',
            value: cornerVal,
            amount: finalAmount
        });
    }

    // 8. Periodic Logging (Every 50 spins)
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        utils.saveFile("moving_corners_log.csv", state.logData)
            .then(() => {}) // Silent success
            .catch(err => console.error("Log save failed", err));
    }

    return bets;

}