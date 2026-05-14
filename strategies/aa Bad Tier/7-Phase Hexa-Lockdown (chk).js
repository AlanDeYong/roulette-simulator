/**
 * Strategy: 7-Phase Hexa-Lockdown (Corrected Logic)
 * Source: Spin Till You Win Creator of Wheel Pulse Pro Max (https://www.youtube.com/watch?v=t3c92cdvQF8)
 * * * The Logic: 
 * Tracks the most recent winning number and targets its respective Dozen and Column. 
 * Upon a loss, the strategy escalates the bets on the Dozen/Column and introduces Straight-Up 
 * bets on previous winning numbers. Crucially, these straight-up numbers are filtered: 
 * they must have hit *before* the most recent win, and they must NOT be located inside 
 * the actively targeted Dozen or Column to maximize layout coverage without overlap.
 * * * The Progression:
 * - Phase 1 (Start/Reset): 1 unit on the Dozen, 1 unit on the Column of the last winning number.
 * - Phase 2 (After loss): 5 units on Doz/Col. Straight-up bets: 1 unit on 2 recent valid numbers.
 * - Phase 3 (After loss): 23 units on Doz/Col. Straight-up bets: 2 units on 4 recent valid numbers.
 * - Phase 4 (After loss): 141 units on Doz/Col. Straight-up bets: 12 units on 6 recent valid numbers.
 * - On Win: Reset back to Phase 1. (A loss at Phase 4 also resets to prevent total bankroll wipeout).
 * * * The Goal: 
 * Systematically increase layout coverage and bet sizes to recover previous losses 
 * while hunting for a massive overlapping payout on the straight-up numbers.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.level === undefined) state.level = 0;
    if (!state.recentNumbers) state.recentNumbers = [];
    if (!state.lastBets) state.lastBets = [];
    if (!state.targetDoz) state.targetDoz = null;
    if (!state.targetCol) state.targetCol = null;

    // Await first spin to establish a target
    if (spinHistory.length === 0) return []; 

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    // Track unique recent numbers (excluding 0 as it breaks doz/col math)
    if (lastNum !== 0) {
        // Remove it if it exists so we can push it to the front (most recent)
        state.recentNumbers = state.recentNumbers.filter(n => n !== lastNum);
        state.recentNumbers.unshift(lastNum);
        
        // Keep a deep enough history to find non-overlapping numbers later
        if (state.recentNumbers.length > 25) state.recentNumbers.pop();
    }

    // 2. Evaluate Previous Bets for Win/Loss
    let isWin = false;
    if (state.lastBets.length > 0) {
        for (let bet of state.lastBets) {
            if (bet.type === 'number' && bet.value === lastNum) isWin = true;
            if (bet.type === 'dozen') {
                if (bet.value === 1 && lastNum >= 1 && lastNum <= 12) isWin = true;
                if (bet.value === 2 && lastNum >= 13 && lastNum <= 24) isWin = true;
                if (bet.value === 3 && lastNum >= 25 && lastNum <= 36) isWin = true;
            }
            if (bet.type === 'column' && lastNum !== 0) {
                let col = lastNum % 3 === 0 ? 3 : lastNum % 3;
                if (bet.value === col) isWin = true;
            }
        }

        // Progression logic based on result
        if (isWin) {
            state.level = 0; // Reset on win
        } else {
            state.level++;   // Escalate on loss
            if (state.level > 3) state.level = 0; // Stop-loss/Reset after Phase 4
        }
    }

    // 3. Set Targets based on the MOST RECENT winning number
    if (lastNum !== 0) {
        state.targetDoz = Math.ceil(lastNum / 12);
        state.targetCol = lastNum % 3 === 0 ? 3 : lastNum % 3;
    }

    // If zero hit on the first spin, wait for a valid number
    if (!state.targetDoz || !state.targetCol) return [];

    // 4. Define the Phase Progression Constraints
    const phases = [
        { outMult: 1, inQty: 0, inMult: 0 },    // Phase 1 (Index 0)
        { outMult: 5, inQty: 2, inMult: 1 },    // Phase 2 (Index 1)
        { outMult: 23, inQty: 4, inMult: 2 },   // Phase 3 (Index 2)
        { outMult: 141, inQty: 6, inMult: 12 }  // Phase 4 (Index 3)
    ];

    const currentPhase = phases[state.level];
    let currentBets = [];

    // 5. Calculate Amounts & Clamp to Config Limits
    let outAmount = Math.max(currentPhase.outMult * config.betLimits.minOutside, config.betLimits.minOutside);
    outAmount = Math.min(outAmount, config.betLimits.max);

    let inAmount = Math.max(currentPhase.inMult * config.betLimits.min, config.betLimits.min);
    inAmount = Math.min(inAmount, config.betLimits.max);

    // 6. Construct Bet Array
    
    // Always place the Dozen and Column bets based on the most recent number
    currentBets.push({ type: 'dozen', value: state.targetDoz, amount: outAmount });
    currentBets.push({ type: 'column', value: state.targetCol, amount: outAmount });

    // Place Straight-up bets if required by the current phase
    if (currentPhase.inQty > 0) {
        let validStraightUpTargets = [];
        
        // Scan history to find numbers meeting the criteria
        for (let num of state.recentNumbers) {
            // Must have won BEFORE the most recent win
            if (num === lastNum) continue; 

            let numDoz = Math.ceil(num / 12);
            let numCol = num % 3 === 0 ? 3 : num % 3;

            // Must NOT be in the currently targeted Dozen AND NOT in targeted Column
            if (numDoz !== state.targetDoz && numCol !== state.targetCol) {
                validStraightUpTargets.push(num);
            }

            // Stop once we have enough targets for the current phase
            if (validStraightUpTargets.length === currentPhase.inQty) break;
        }

        // Add the filtered valid targets to the betting array
        for (let targetNum of validStraightUpTargets) {
            currentBets.push({ type: 'number', value: targetNum, amount: inAmount });
        }
    }

    // Save bets to evaluate win/loss on the next spin
    state.lastBets = currentBets;

    return currentBets;
}