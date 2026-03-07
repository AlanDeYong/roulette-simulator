/**
 * STRATEGY: Fast and Dirty (Modified with Hot Number Analysis)
 * 
 * Source: https://www.youtube.com/watch?v=XoRhbg7jQ78 (CEG Dealer School)
 * 
 * Logic:
 * 1. This is a 4-step negative progression system designed for a quick +$45 profit.
 * 2. Positioning: When a reset occurs, the script analyzes the last 37 spins.
 * 3. Bet Selection: Corners, Lines, and Dozens are selected based on the 
 *    most frequent numbers in that 37-spin window.
 * 4. Progression:
 *    - Step 1: 2 Corners (1 unit each).
 *    - Step 2: 2 Corners (1u) + 1 Double Street/Line (2u).
 *    - Step 3: 3 Corners (2u) + 1 Double Street/Line (3u).
 *    - Step 4 (Recovery): 2 Dozens (scaled: 18u and 12u). Requires 3 wins to reset.
 * 5. The Goal: Target +$45 profit, then reset the progression and recalculate hot numbers.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const unit = minInside; 
    const targetProfit = 45;

    // 1. Initialize State
    if (state.step === undefined) {
        state.step = 1;
        state.initialBankroll = bankroll;
        state.step4Wins = 0;
        state.activePositions = null;
    }

    // 2. Win/Loss Detection (Using foolproof bankroll tracking instead of utils)
    let wonLastRound = false;
    if (state.lastBankroll !== undefined) {
        wonLastRound = bankroll > state.lastBankroll;
    }

    // 3. Check for Profit Target Reset
    let justReset = false;
    const currentProfit = bankroll - state.initialBankroll;
    
    if (currentProfit >= targetProfit) {
        state.step = 1;
        state.initialBankroll = bankroll; // Reset our profit baseline
        state.step4Wins = 0;
        state.activePositions = null; // Force recalculation of hot numbers
        justReset = true;
    }

    // 4. Handle Progression Logic (Only if we didn't just reset from profit)
    if (spinHistory.length > 0 && !justReset) {
        if (state.step < 4) {
            if (wonLastRound) {
                state.step = 1;
                state.activePositions = null; // Recalculate hot areas on a win
            } else {
                state.step++; // Loss moves to next step
            }
        } else {
            // Step 4 Logic: Recovery phase requires 3 wins
            if (wonLastRound) {
                state.step4Wins++;
                if (state.step4Wins >= 3) {
                    state.step = 1;
                    state.step4Wins = 0;
                    state.activePositions = null;
                }
            } else {
                // Loss on Step 4 typically breaks the system; resetting to base
                state.step = 1;
                state.step4Wins = 0;
                state.activePositions = null;
            }
        }
    }

    // 5. Hot Number Analysis (Triggered on Reset/Initial)
    if (!state.activePositions) {
        const analysisWindow = spinHistory.slice(-37);
        const counts = {};
        for (let i = 0; i <= 36; i++) counts[i] = 0;
        
        // Safely count occurrences 
        analysisWindow.forEach(s => {
            if (s && s.winningNumber !== undefined) {
                counts[s.winningNumber]++;
            }
        });

        // Find best Corners
        const validCorners = [1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29, 31, 32];
        const cornerScores = validCorners.map(val => {
            const score = counts[val] + counts[val+1] + counts[val+3] + counts[val+4];
            return { val, score };
        }).sort((a, b) => b.score - a.score);

        // Find best Lines
        const validLines = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31];
        const lineScores = validLines.map(val => {
            let score = 0;
            for(let i=0; i<6; i++) score += counts[val+i];
            return { val, score };
        }).sort((a, b) => b.score - a.score);

        // Find best Dozens
        const dozenScores = [
            { val: 1, score: 0 }, { val: 2, score: 0 }, { val: 3, score: 0 }
        ];
        for(let i=1; i<=36; i++) {
            const d = Math.ceil(i/12);
            if (d >= 1 && d <= 3) {
                dozenScores[d-1].score += counts[i];
            }
        }
        dozenScores.sort((a, b) => b.score - a.score);

        state.activePositions = {
            corners: cornerScores.slice(0, 3).map(c => c.val),
            line: lineScores[0].val,
            dozens: dozenScores.slice(0, 2).map(d => d.val)
        };
    }

    // 6. Build Bets based on Step
    let currentBets = [];
    const pos = state.activePositions;

    if (state.step === 1) {
        currentBets = [
            { type: 'corner', value: pos.corners[0], amount: unit },
            { type: 'corner', value: pos.corners[1], amount: unit }
        ];
    } 
    else if (state.step === 2) {
        currentBets = [
            { type: 'corner', value: pos.corners[0], amount: unit },
            { type: 'corner', value: pos.corners[1], amount: unit },
            { type: 'line', value: pos.line, amount: unit * 2 }
        ];
    } 
    else if (state.step === 3) {
        currentBets = [
            { type: 'corner', value: pos.corners[0], amount: unit * 2 },
            { type: 'corner', value: pos.corners[1], amount: unit * 2 },
            { type: 'corner', value: pos.corners[2], amount: unit * 2 },
            { type: 'line', value: pos.line, amount: unit * 3 }
        ];
    } 
    else if (state.step === 4) {
        // Step 4 Recovery: Clamp dozen bets to minimum Outside limit
        const amt1 = Math.max(unit * 18, minOutside);
        const amt2 = Math.max(unit * 12, minOutside);
        currentBets = [
            { type: 'dozen', value: pos.dozens[0], amount: amt1 },
            { type: 'dozen', value: pos.dozens[1], amount: amt2 }
        ];
    }

    // 7. Final Clamping and State Update
    currentBets = currentBets.map(b => ({
        ...b,
        amount: Math.min(b.amount, config.betLimits.max)
    }));

    // Save the bankroll AFTER bets are deducted, to compare against the payout on the next spin
    state.lastBankroll = bankroll; 
    
    return currentBets;
}