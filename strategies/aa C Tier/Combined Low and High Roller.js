
/**
 * STRATEGY: Combined Low and High Roller System
 * * SOURCE: 
 * URL: https://www.youtube.com/watch?v=Lyh5ojLu35I
 * Channel: CEG Dealer School / Casino Quest
 * * THE LOGIC:
 * This strategy alternates between two modes based on identifying a specific pattern (The "Trigger").
 * * 1. LOW ROLLER PHASE (The Grind):
 * - Purpose: Generate small wins to sustain bankroll while waiting for the trigger.
 * - Bets: Two Dozen bets placed simultaneously.
 * a. The "Last Dozen to Hit" (Follow the trend).
 * b. The "Longest Since Hit" Dozen (The Coldest).
 * *Note: Since the last hit dozen cannot be the coldest, these are always two different dozens.*
 * * 2. HIGH ROLLER PHASE (The Trigger):
 * - Trigger: Occurs when the SAME Dozen hits 3 times in a row (e.g., Dozen 1, Dozen 1, Dozen 1).
 * - Bets: Bet heavily on the OTHER two Dozens (e.g., if Dozen 1 streaked, bet Dozen 2 and Dozen 3).
 * * THE PROGRESSION:
 * 1. Low Roller: 
 * - Uses a Triple Martingale on loss: 1 unit -> 3 units -> 9 units.
 * - Reset to 1 unit after a win.
 * - If the 3rd level loses, reset to 1 unit (Stop Loss).
 * * 2. High Roller:
 * - Level 1: High Base Bet (approx 20x low unit).
 * - Level 2: Increased High Bet (approx 2.5x Level 1) if Level 1 loses.
 * - Reset to Low Roller Phase after a win or after Level 2 loss.
 * * THE GOAL:
 * - Survive the grind with the Low Roller strategy.
 * - Capitalize on the statistical probability that a Dozen rarely hits 4 or 5 times in a row using the High Roller strategy.
 * - Stop Loss: Recommended daily stop loss or if High Roller Level 2 fails.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPERS ---
    
    // Define base units based on config limits
    const UNIT = config.betLimits.minOutside; // Standard Low Roller Unit (e.g., $5)
    const MAX_BET = config.betLimits.max;
    
    // Progression Multipliers
    const LOW_PROG = [1, 3, 9]; 
    // High Roller approximates the video's $5 vs $100 ratio (20x) and $250 (50x)
    const HIGH_PROG = [20, 50]; 

    // Helper: Identify Dozen (1, 2, 3) or 0
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.phase = 'LOW';        // 'LOW' or 'HIGH'
        state.lowLevel = 0;         // Index for LOW_PROG
        state.highLevel = 0;        // Index for HIGH_PROG
        state.lastBets = [];        // To track win/loss of previous spin
        state.logBuffer = [];       // Buffer for logging
        state.totalProfit = 0;
        state.initialized = true;
    }

    // Need at least 3 spins to detect the High Roller trigger
    if (spinHistory.length < 3) {
        return [];
    }

    // --- 3. ANALYZE HISTORY & DETECT TRIGGER ---
    
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    const lastDozen = getDozen(lastNum);

    // Check for High Roller Trigger: Same Dozen 3 times in a row
    const doz1 = getDozen(spinHistory[spinHistory.length - 1].winningNumber);
    const doz2 = getDozen(spinHistory[spinHistory.length - 2].winningNumber);
    const doz3 = getDozen(spinHistory[spinHistory.length - 3].winningNumber);

    const isTrigger = (doz1 !== 0 && doz1 === doz2 && doz2 === doz3);
    
    // Find "Coldest" Dozen (Longest since hit)
    // Initialize counts with large numbers
    let gaps = { 1: 0, 2: 0, 3: 0 };
    let found = { 1: false, 2: false, 3: false };
    
    // Look back up to 50 spins to find last occurrence
    for (let i = spinHistory.length - 2; i >= 0; i--) {
        const d = getDozen(spinHistory[i].winningNumber);
        if (d !== 0) {
            if (!found[1] && d !== 1) gaps[1]++; else if(d===1) found[1] = true;
            if (!found[2] && d !== 2) gaps[2]++; else if(d===2) found[2] = true;
            if (!found[3] && d !== 3) gaps[3]++; else if(d===3) found[3] = true;
        }
        // If all found, break
        if (found[1] && found[2] && found[3]) break;
    }
    
    // Sort to find the one with highest gap
    const coldestDozen = Object.keys(gaps).reduce((a, b) => gaps[a] > gaps[b] ? parseInt(a) : parseInt(b));

    // --- 4. DETERMINE PREVIOUS WIN/LOSS ---
    
    let wonLast = false;
    // Simple check: Did the winning dozen match any of our previous bets?
    if (state.lastBets.length > 0 && lastDozen !== 0) {
        // If any of our bets covered the winning dozen, we count it as a win 
        // (Simplified logic: usually net positive in this strat if hit)
        wonLast = state.lastBets.includes(lastDozen);
    }

    // --- 5. PROGRESSION LOGIC ---

    // Logic to switch phases
    if (state.phase === 'HIGH') {
        if (wonLast) {
            // Won High Roller -> Reset to Low
            state.phase = 'LOW';
            state.highLevel = 0;
            state.lowLevel = 0; // Start fresh
            state.logBuffer.push(`High Roller WIN. Resetting to Low.`);
        } else {
            // Lost High Roller -> Increase Level
            state.highLevel++;
            if (state.highLevel >= HIGH_PROG.length) {
                // Max High Roller loss -> Reset to Low (Stop Loss)
                state.phase = 'LOW';
                state.highLevel = 0;
                state.lowLevel = 0;
                state.logBuffer.push(`High Roller MAX LOSS. Resetting to Low.`);
            }
        }
    } else {
        // Phase is LOW
        if (isTrigger) {
            // IMMEDIATE SWITCH TO HIGH ROLLER
            state.phase = 'HIGH';
            state.highLevel = 0; // Start at level 1
            state.logBuffer.push(`TRIGGER DETECTED: Dozen ${doz1} hit 3x. Switching to High Roller.`);
        } else {
            // Continue Low Roller
            if (wonLast) {
                state.lowLevel = 0; // Reset on win
            } else if (state.lastBets.length > 0) {
                // Only increase if we actually bet last time
                state.lowLevel++;
                if (state.lowLevel >= LOW_PROG.length) {
                    state.lowLevel = 0; // Reset after 3 losses (Stop loss)
                }
            }
        }
    }

    // --- 6. CALCULATE BETS & CLAMP LIMITS ---

    let bets = [];
    let currentBets = []; // To store in state for next comparison

    if (state.phase === 'HIGH') {
        // Bet on the two dozens that are NOT the trigger dozen
        const triggerDozen = doz1; // The one that hit 3x
        
        // Target Dozens
        const targets = [1, 2, 3].filter(d => d !== triggerDozen);
        
        // Calculate Amount
        let rawAmount = UNIT * HIGH_PROG[state.highLevel];
        
        // Clamp Amount
        let finalAmount = Math.max(config.betLimits.minOutside, Math.min(rawAmount, MAX_BET));

        targets.forEach(d => {
            bets.push({ type: 'dozen', value: d, amount: finalAmount });
            currentBets.push(d);
        });

    } else {
        // LOW ROLLER
        // Bet 1: Last Dozen Hit (Trend)
        // Bet 2: Coldest Dozen (Anti-Trend)
        
        const targets = [];
        
        // Add Last Dozen (if valid)
        if (lastDozen !== 0) targets.push(lastDozen);
        else targets.push(1); // Default to 1 if 0 hit, just to keep game moving
        
        // Add Coldest Dozen
        // Ensure we don't bet the same dozen twice. If Coldest == Last, find 2nd coldest?
        // Actually, logic dictates: Last Dozen Hit implies it has gap 0. 
        // Coldest implies gap > 0. They should usually be distinct.
        if (coldestDozen !== targets[0]) {
            targets.push(coldestDozen);
        } else {
             // If for some edge case they are same, pick the next coldest
             // (This block is a fallback to ensure 2 bets usually)
             const nextColdest = [1,2,3].filter(d => d !== targets[0])[0];
             targets.push(nextColdest);
        }

        // Calculate Amount
        let rawAmount = UNIT * LOW_PROG[state.lowLevel];
        
        // Clamp Amount
        let finalAmount = Math.max(config.betLimits.minOutside, Math.min(rawAmount, MAX_BET));

        targets.forEach(d => {
            bets.push({ type: 'dozen', value: d, amount: finalAmount });
            currentBets.push(d);
        });
    }

    // Update State with current bets for next turn's verification
    state.lastBets = currentBets;

    // --- 7. UTILS & LOGGING ---
    
    // Periodically save logs (every 50 spins)
    if (spinHistory.length % 50 === 0) {
        const logContent = state.logBuffer.join('\n');
        utils.saveFile(`strategy_log_${Date.now()}.txt`, logContent)
            .then(() => { state.logBuffer = []; }) // Clear buffer on success
            .catch(err => console.error("Save failed", err));
    }

    return bets;

}