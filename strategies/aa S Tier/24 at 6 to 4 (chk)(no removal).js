/**
 * Strategy: 24 at 6 to 4 Strategy (With Verification/No-Bet Delay Phase)
 * Source: https://youtu.be/rgJx39WWwjQ (Channel: The Roulette Master)
 * * Logic:
 * - Monitors the history of dozens (1st, 2nd, 3rd) to identify the two "longest since hit".
 * - CRITICAL: Stays idle and does NOT bet during the initial spins until at least 2 unique dozens have hit.
 * - The longest sleeping dozen gets a straight Dozen bet ($6 base).
 * - The second longest sleeping dozen gets its individual streets covered ($1 base each).
 * * Bet Progression:
 * - On Win (Main Dozen or Street): Reset multiplier to 1 and recalculate the longest sleeping dozens.
 * - On Loss: Double the bet amounts on the exact same positions for the next spin.
 * * Goal:
 * - Target profit of +$100 or stop-loss based on bankroll limits.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.multiplier) state.multiplier = 1;
    if (!state.isLossStreak) state.isLossStreak = false;
    if (!state.lastTargetDozen) state.lastTargetDozen = null;
    if (!state.lastStreetDozen) state.lastStreetDozen = null;

    const baseDozenAmount = 6;
    const baseStreetAmount = 1;

    // Helper to convert winning number to dozen index (1, 2, or 3)
    const getDozen = (num) => {
        if (num === 0 || num === 37) return 0; // Zero / Double Zero
        return Math.ceil(num / 12);
    };

    // 2. Initial Setup: Check if we have enough distinct dozen data to track "longest since hit"
    let uniqueDozensSeen = new Set();
    for (let i = 0; i < spinHistory.length; i++) {
        const doz = getDozen(spinHistory[i].winningNumber);
        if (doz >= 1 && doz <= 3) {
            uniqueDozensSeen.add(doz);
        }
    }

    // If we haven't even seen 2 unique dozens yet, we cannot accurately define a 1st and 2nd longest sleeper.
    if (uniqueDozensSeen.size < 2) {
        return []; // Do not place any bets yet
    }

    // 3. Track Win / Loss from last spin to adjust progression
    if (spinHistory.length > 0 && state.lastTargetDozen !== null) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNumber = lastSpin.winningNumber;
        const lastWinningDozen = getDozen(lastWinningNumber);

        const hitMainDozen = (lastWinningDozen === state.lastTargetDozen);
        const hitStreetDozen = (lastWinningDozen === state.lastStreetDozen);

        if (hitMainDozen || hitStreetDozen) {
            // Reset progression on any win
            state.multiplier = 1;
            state.isLossStreak = false;
        } else {
            // Double progression on loss
            state.multiplier *= 2;
            state.isLossStreak = true;
        }
    }

    // 4. Determine Dozens based on Spin History if not locked in a loss streak
    let targetDozen = state.lastTargetDozen;
    let streetDozen = state.lastStreetDozen;

    if (!state.isLossStreak) {
        // Find intervals since last hit for each dozen
        let lastSeen = { 1: Infinity, 2: Infinity, 3: Infinity };
        let count = 0;

        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const doz = getDozen(spinHistory[i].winningNumber);
            if (doz >= 1 && doz <= 3 && lastSeen[doz] === Infinity) {
                lastSeen[doz] = count;
            }
            count++;
        }

        // Sort dozens by distance since last hit (descending = longest sleeping first)
        let sortedDozens = [1, 2, 3].sort((a, b) => lastSeen[b] - lastSeen[a]);

        targetDozen = sortedDozens[0]; // Longest since hit
        streetDozen = sortedDozens[1]; // Second longest since hit

        // Save to state
        state.lastTargetDozen = targetDozen;
        state.lastStreetDozen = streetDozen;
    }

    // 5. Calculate and Clamp Bets
    let bets = [];

    // Main Dozen Bet
    let dozenAmount = baseDozenAmount * state.multiplier;
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);
    
    bets.push({ type: 'dozen', value: targetDozen, amount: dozenAmount });

    // Streets calculation for the second dozen
    const startStreet = (streetDozen - 1) * 12 + 1;
    let streetAmount = baseStreetAmount * state.multiplier;
    streetAmount = Math.max(streetAmount, config.betLimits.min);
    streetAmount = Math.min(streetAmount, config.betLimits.max);

    for (let s = 0; s < 4; s++) {
        bets.push({ 
            type: 'street', 
            value: startStreet + (s * 3), 
            amount: streetAmount 
        });
    }

    return bets;
}