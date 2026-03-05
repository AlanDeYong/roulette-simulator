/**
 * Strategy: Alan's No Boss Strategy
 * Source: https://www.youtube.com/watch?v=K3kEjRJyptI (The Roulette Master)
 *
 * The Logic:
 * The system acts with extreme patience, monitoring the table without betting. 
 * A bet is triggered ONLY when the exact same dozen hits 3 times in a row. 
 * When triggered, bets are placed on the OTHER TWO dozens.
 *
 * The Progression:
 * It utilizes a strict 2-bullet recovery progression. 
 * - Bullet 1: Initial bet (Equivalent to 20x the table minimum per dozen).
 * - Bullet 2: If Bullet 1 loses, fire immediately on the same dozens (Equivalent to 50x the table minimum).
 * - If Bullet 2 loses, the cycle busts. The system resets and waits for a NEW sequence of 3.
 *
 * The Goal:
 * Target small, highly probable wins while avoiding the devastating table-max collisions of
 * deep Martingale runs. Alan aims for a strict daily profit of $200 with a $700 bankroll limit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (typeof state.waitingForResult === 'undefined') state.waitingForResult = false;
    if (typeof state.bullet === 'undefined') state.bullet = 1;
    if (typeof state.triggerDozen === 'undefined') state.triggerDozen = null;
    if (typeof state.ignoreUntilSpin === 'undefined') state.ignoreUntilSpin = 0;

    // Helper to determine dozen (1, 2, 3) or null for 0/00
    const getDozen = (num) => {
        if (num > 0 && num <= 12) return 1;
        if (num > 12 && num <= 24) return 2;
        if (num > 24 && num <= 36) return 3;
        return null; // 0 or 00
    };

    // 2. Evaluate Outcome of Previous Bet
    if (state.waitingForResult && spinHistory.length > 0) {
        const lastSpinNum = spinHistory[spinHistory.length - 1].winningNumber;
        const lastSpinDozen = getDozen(lastSpinNum);
        
        // Win condition: It landed on a dozen, and it wasn't the one we are betting AGAINST
        const didWin = (lastSpinDozen !== null && lastSpinDozen !== state.triggerDozen);

        if (didWin) {
            // Cycle Won - Reset to observation mode
            state.waitingForResult = false;
            state.bullet = 1;
            state.triggerDozen = null;
            state.ignoreUntilSpin = spinHistory.length; // Force waiting for 3 NEW spins
        } else {
            // Cycle Lost
            if (state.bullet === 1) {
                // Move to Bullet 2
                state.bullet = 2;
            } else {
                // Busted on Bullet 2 - Take the loss and reset to observation mode
                state.waitingForResult = false;
                state.bullet = 1;
                state.triggerDozen = null;
                state.ignoreUntilSpin = spinHistory.length; // Force waiting for 3 NEW spins
            }
        }
    }

    // 3. Scan for Triggers (Only if not currently betting)
    if (!state.waitingForResult && (spinHistory.length - state.ignoreUntilSpin) >= 3) {
        const n1 = spinHistory[spinHistory.length - 1].winningNumber;
        const n2 = spinHistory[spinHistory.length - 2].winningNumber;
        const n3 = spinHistory[spinHistory.length - 3].winningNumber;

        const d1 = getDozen(n1);
        const d2 = getDozen(n2);
        const d3 = getDozen(n3);

        // Check for 3 consecutive identical dozens (excluding zeroes)
        if (d1 !== null && d1 === d2 && d2 === d3) {
            state.triggerDozen = d1;
            state.waitingForResult = true;
            state.bullet = 1;
        }
    }

    // 4. Place Bets if Triggered
    if (state.waitingForResult) {
        const baseUnit = config.betLimits.minOutside;
        
        // Replicate Alan's $100 / $250 ratios using multipliers of the base unit
        // Assuming minOutside is 5: 20 * 5 = 100, 50 * 5 = 250
        const unitMultiplier = (state.bullet === 1) ? 20 : 50;
        
        let amount = baseUnit * unitMultiplier;

        // Clamp to limits
        amount = Math.max(amount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);

        // Abort if bankroll cannot cover both dozen bets
        if (bankroll < (amount * 2)) {
            state.waitingForResult = false; // Emergency abort
            return [];
        }

        // Determine which two dozens to bet on
        const targetDozens = [1, 2, 3].filter(d => d !== state.triggerDozen);

        return [
            { type: 'dozen', value: targetDozens[0], amount: amount },
            { type: 'dozen', value: targetDozens[1], amount: amount }
        ];
    }

    // 5. Default Return (Waiting)
    return [];
}