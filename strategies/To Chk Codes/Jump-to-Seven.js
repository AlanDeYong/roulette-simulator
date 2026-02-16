/**
 * STRATEGY: Jump-to-Seven Dozen Progression
 * * SOURCE: 
 * Channel: ROULETTE JACKPOT
 * Video: https://www.youtube.com/watch?v=N_JX6tCeZmw
 * * LOGIC:
 * 1. The strategy bets on Dozens (1-12, 13-24, 25-36).
 * 2. It starts with a base bet of 1 unit.
 * 3. A random Dozen is selected initially. On a win, we switch to a new random Dozen.
 * On a loss, we stay on the same Dozen until it hits.
 * * PROGRESSION (The "Jump"):
 * 1. Base Bet: 1 Unit.
 * 2. Win: Collect profit, reset to 1 Unit.
 * 3. Loss (First Time): Do NOT double. Jump immediately to 7 Units.
 * - Logic: A win at 7 units pays 14 profit. Minus the 7 stake and previous 1 lost, 
 * net profit is substantial.
 * 4. Loss (Subsequent): If the 7-unit bet loses, increase by +1 unit (8, 9, 10...)
 * until a win occurs.
 * * NOTE: 
 * This is a high-risk strategy. The "Jump" to 7 requires a healthy bankroll.
 * If the progression goes deep (e.g., betting 15 units), a win might only break even 
 * or result in a slight loss depending on the specific sequence, but the strategy 
 * relies on hitting early after the jump.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper to determine if a specific dozen won
    const isDozenWin = (number, dozenValue) => {
        if (number === 0 || number === '00') return false;
        if (dozenValue === 1 && number >= 1 && number <= 12) return true;
        if (dozenValue === 2 && number >= 13 && number <= 24) return true;
        if (dozenValue === 3 && number >= 25 && number <= 36) return true;
        return false;
    };

    // 1. Initialize State on first run
    if (state.units === undefined) {
        state.units = 1;
        // Pick a random dozen (1, 2, or 3) to start
        state.targetDozen = Math.floor(Math.random() * 3) + 1; 
    }

    // 2. Process History (unless it's the very first spin)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWin = isDozenWin(lastSpin.winningNumber, state.targetDozen);

        if (lastWin) {
            // WIN: Reset progression and switch target
            state.units = 1;
            // Switch to a new random dozen to mimic the video creator moving around
            state.targetDozen = Math.floor(Math.random() * 3) + 1;
        } else {
            // LOSS: Apply the "Jump-to-Seven" Logic
            if (state.units === 1) {
                // The specific strategy rule: On first loss, jump straight to 7
                state.units = 7;
            } else {
                // If we are already at 7 or higher, increment by 1
                state.units += 1;
            }
            // Note: On loss, we stick to the same dozen (state.targetDozen remains unchanged)
            // to chase the win, which is standard behavior for dozen progressions.
        }
    }

    // 3. Calculate Bet Amount
    // Use minOutside as the base unit value (usually $1 or $5)
    const baseChip = config.betLimits.minOutside;
    let amount = state.units * baseChip;

    // 4. Respect Table Limits & Bankroll
    // Clamp to max limit
    amount = Math.min(amount, config.betLimits.max);
    
    // Ensure we have enough money
    if (amount > bankroll) {
        amount = bankroll; // All-in if insufficient funds
    }

    // If we are broke or amount is less than minimum, stop betting
    if (amount < config.betLimits.minOutside) {
        return []; 
    }

    // 5. Return the Bet
    return [{
        type: 'dozen',
        value: state.targetDozen,
        amount: amount
    }];
}