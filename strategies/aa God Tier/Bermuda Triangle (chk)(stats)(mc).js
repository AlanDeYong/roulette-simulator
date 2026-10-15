/**
 * Strategy: The Bermuda Triangle Roulette System
 * Source: https://youtu.be/bkSKn9Fb_kg (The Roulette Master)
 *
 * The Full Logic in details:
 * - The strategy places three simultaneous bets that form a "triangle" on the table layout.
 * - "High Side" Triangle: 3rd Dozen (25-36), Odd, and High (19-36).
 * - "Low Side" Triangle: 1st Dozen (1-12), Even, and Low (1-18).
 * - These 3 outside bets overlap, meaning a single spin can result in a total loss, 
 * a partial loss, or a partial/full win. The system treats the 3 bets as a single group.
 * * The Full Bet Progression in details:
 * - Initial Bet: 1 unit on each of the 3 positions.
 * - After any net LOSS (partial or total loss of the grouped bet): Increase the bet 
 * on EACH position by 1 unit.
 * - After any net WIN: Keep the bet size exactly the same to rapidly dig out of the hole, 
 * UNLESS the bankroll hits a new session high.
 * - When a new session high bankroll is reached (or exceeded), the bet resets back down 
 * to the base 1 unit, and the strategy switches to the opposite side (e.g., High switches 
 * to Low) to mix up the board coverage.
 * * The Goal:
 * - To steadily recover losses utilizing partial wins/losses without the aggressive bankroll 
 * drain of doubling (like a Martingale). The target profit condition is simply hitting a 
 * new session high, at which point the progression resets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and increment step
    const baseUnit = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

    // 2. Initialize State
    if (!state.initialized) {
        state.currentBet = baseUnit;
        state.sessionHigh = bankroll;
        state.side = 'high'; // Start on the High side
        state.initialized = true;
    }

    // Always update the session high if our bankroll breaks a new record
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
    }

    // 3. Process previous spin to adjust progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const numStr = lastSpin.winningNumber;
        const num = parseInt(numStr, 10);
        // Identify zero or double zero
        const isZero = (numStr === 0 || numStr === '00' || numStr === '0');

        // Calculate previous net result
        let totalWin = 0;
        let totalBet = state.currentBet * 3; // Betting 3 positions simultaneously

        // Calculate payout if not a zero
        if (!isZero) {
            if (state.side === 'high') {
                if (num >= 25 && num <= 36) totalWin += state.currentBet * 3; // 3rd Dozen (pays 2:1)
                if (num % 2 !== 0) totalWin += state.currentBet * 2;          // Odd (pays 1:1)
                if (num >= 19 && num <= 36) totalWin += state.currentBet * 2; // High (pays 1:1)
            } else {
                if (num >= 1 && num <= 12) totalWin += state.currentBet * 3;  // 1st Dozen (pays 2:1)
                if (num % 2 === 0) totalWin += state.currentBet * 2;          // Even (pays 1:1)
                if (num >= 1 && num <= 18) totalWin += state.currentBet * 2;  // Low (pays 1:1)
            }
        }

        const netResult = totalWin - totalBet;

        // Apply progression logic based on the net result
        if (netResult < 0) {
            // Net Loss (partial or total) -> Increase bet by 1 step
            state.currentBet += increment;
        } else if (netResult > 0) {
            // Net Win -> Check if we've successfully recovered to a new high
            if (bankroll >= state.sessionHigh) {
                // We reached our target: Reset bet and switch sides
                state.currentBet = baseUnit;
                state.side = state.side === 'high' ? 'low' : 'high';
            }
            // Note: If bankroll < sessionHigh, we keep state.currentBet the exact same.
        }
        // Note: If netResult === 0 (break even), we also keep state.currentBet the exact same.
    }

    // 4. CLAMP TO LIMITS (Crucial to prevent invalid bet errors)
    let amount = state.currentBet;
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);
    
    // Save the clamped amount back to state so our progression math tracks the *actual* wagered amount
    state.currentBet = amount;

    // 5. Build and return the bet array
    if (state.side === 'high') {
        return [
            { type: 'dozen', value: 3, amount: amount }, // 3rd Dozen (25-36)
            { type: 'odd', amount: amount },             // Odd
            { type: 'high', amount: amount }             // High (19-36)
        ];
    } else {
        return [
            { type: 'dozen', value: 1, amount: amount }, // 1st Dozen (1-12)
            { type: 'even', amount: amount },            // Even
            { type: 'low', amount: amount }              // Low (1-18)
        ];
    }
}