/**
 * Strategy: "Color Up" Roulette Strategy
 * Source: Gamblers University YouTube Channel (https://youtu.be/00d5ZRc-J20)
 * 
 * Logic:
 * - This strategy places two Dozen bets per spin.
 * - Trigger/Conditions: Always observe the last spun number. Bet on the two dozens 
 *   that did NOT hit on the previous spin. If a 0 or 00 hits, re-bet the same two dozens.
 * 
 * Bet Progression:
 * - The system uses three tiers (colors): Base (1x), Color 1 (2.5x), Color 2 (12.5x).
 * - A loss increases consecutive losses and total level losses. 
 * - A win resets consecutive losses.
 * - If bankroll hits a new session high after a win, reset completely to Base tier.
 * - Color Up (Increase Tier) Condition: If you suffer 3 consecutive losses OR 
 *   a total of 5 losses at the current tier, advance to the next tier and reset loss counts.
 * 
 * Goal / Stop Loss:
 * - Goal: Reach a new session high bankroll to reset the cycle and secure small profits.
 * - Stop-loss: If you suffer 3 consecutive losses at the highest tier (Color 2), the 
 *   session is over, and betting stops.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.level === undefined) {
        state.level = 0; // 0: Base, 1: Color 1 (2.5x), 2: Color 2 (12.5x)
        state.consecutiveLosses = 0;
        state.levelLosses = 0;
        state.sessionHigh = bankroll;
        state.lastBetDozens = [1, 2]; // Default starting dozens
        state.isSessionOver = false;
    }

    if (state.isSessionOver) {
        return []; // Stop betting triggered
    }

    // 2. Analyze Spin History and Update State
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        let hitDozen = null;

        // Determine which dozen hit
        if (num >= 1 && num <= 12) hitDozen = 1;
        else if (num >= 13 && num <= 24) hitDozen = 2;
        else if (num >= 25 && num <= 36) hitDozen = 3;

        // Check Win/Loss based on our last bet
        const won = hitDozen !== null && state.lastBetDozens.includes(hitDozen);

        if (won) {
            state.consecutiveLosses = 0;
            // Reset to base level if we hit a new session high
            if (bankroll > state.sessionHigh) {
                state.sessionHigh = bankroll;
                state.level = 0;
                state.levelLosses = 0;
            }
        } else {
            state.consecutiveLosses++;
            state.levelLosses++;

            // Color Up Logic
            if (state.consecutiveLosses === 3 || state.levelLosses === 5) {
                if (state.level === 2) {
                    // Stop loss hit at max level
                    if (state.consecutiveLosses === 3) {
                        state.isSessionOver = true;
                        return [];
                    }
                } else {
                    // Move to next tier
                    state.level++;
                    state.consecutiveLosses = 0;
                    state.levelLosses = 0;
                }
            }
        }

        // Determine next dozens to bet (the two that didn't just hit)
        // If 0 or 00 hit (hitDozen is null), we re-bet the same dozens
        if (hitDozen !== null) {
            state.lastBetDozens = [1, 2, 3].filter(d => d !== hitDozen);
        }
    }

    // 3. Calculate Bet Amount based on progression multipliers
    // Video used $2 -> $5 -> $25. These map to 1x, 2.5x, and 12.5x multipliers.
    const multipliers = [1, 2.5, 12.5];
    let amount = config.betLimits.minOutside * multipliers[state.level];
    
    // Round to avoid fractional chip sizes
    amount = Math.round(amount);

    // 4. Clamp to Table Limits
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Construct and Return Bets
    return state.lastBetDozens.map(dozen => ({
        type: 'dozen',
        value: dozen,
        amount: amount
    }));
}