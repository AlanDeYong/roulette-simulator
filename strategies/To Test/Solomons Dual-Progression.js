/**
 * Solomon's Dual-Progression Roulette Strategy
 * Source: The Roulette Master TV (https://www.youtube.com/watch?v=RBX46Sf0w4Y)
 *
 * The Logic:
 * The strategy bets on the two Dozens that did NOT hit on the previous spin. 
 * The system acts as a state machine, evaluating the result of the very first 
 * "initial" bet to determine which progression track to follow.
 *
 * The Progression:
 * - Initial Bet: 1 base unit on the two un-hit dozens.
 * - Track A (Positive - if 1st spin WINS): Enters a 1-3-2-6 positive sequence.
 * If a bet loses at any point, or the 4-step cycle completes successfully, 
 * the strategy resets back to the Initial Bet.
 * - Track B (Negative - if 1st spin LOSES): Enters a negative progression where 
 * the bet triples after every loss (1-3-9-27...). The moment a win occurs, 
 * the cycle ends and resets back to the Initial Bet.
 *
 * The Goal:
 * Capitalize on winning streaks with a risk-managed positive progression, 
 * while aggressively recovering losses via a Martingale-style multiplier on 
 * a 63% table coverage (two dozens).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using outside bet minimums
    const unit = config.betLimits.minOutside;

    // 2. Initialize State
    if (state.mode === undefined) {
        state.mode = 'init'; // Tracks: 'init', 'positive', 'negative'
        state.step = 0;      // Index of the current progression sequence
        state.lastTargetDozens = [];
        state.lastHitDozen = 1; // Default fallback
    }

    let currentMulti = 1;
    let targetDozens = [1, 2]; // Default to Dozen 1 and 2 if no history

    // 3. Evaluate previous spin and update state
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Determine which dozen just hit
        let hitDozen = 1;
        if (lastNum >= 1 && lastNum <= 12) hitDozen = 1;
        else if (lastNum >= 13 && lastNum <= 24) hitDozen = 2;
        else if (lastNum >= 25 && lastNum <= 36) hitDozen = 3;
        else hitDozen = state.lastHitDozen; // Fallback for 0 or 00, leaving out the same dozen as before

        state.lastHitDozen = hitDozen;

        // Select the two dozens that didn't hit
        targetDozens = [1, 2, 3].filter(d => d !== hitDozen);

        // Check if we won the previous bet
        // A win occurs if the hitDozen was one of the dozens we bet on
        const isWin = state.lastTargetDozens.includes(hitDozen);

        // State Machine: Update progression based on current mode and result
        if (state.lastTargetDozens.length > 0) {
            if (state.mode === 'init') {
                if (isWin) {
                    state.mode = 'positive';
                    state.step = 1; // Move to the '3' in 1-3-2-6
                } else {
                    state.mode = 'negative';
                    state.step = 1; // Move to the '3' in 1-3-9-27
                }
            } else if (state.mode === 'positive') {
                if (isWin) {
                    state.step++;
                    if (state.step >= 4) {
                        // Completed the 1-3-2-6 cycle
                        state.mode = 'init';
                        state.step = 0;
                    }
                } else {
                    // Lost during positive progression
                    state.mode = 'init';
                    state.step = 0;
                }
            } else if (state.mode === 'negative') {
                if (isWin) {
                    // Recovered during negative progression
                    state.mode = 'init';
                    state.step = 0;
                } else {
                    // Lost again, increment multiplier step
                    state.step++;
                }
            }
        }
    }

    // 4. Calculate current multiplier based on mode and step
    if (state.mode === 'init') {
        currentMulti = 1;
    } else if (state.mode === 'positive') {
        const positiveSequence = [1, 3, 2, 6];
        currentMulti = positiveSequence[state.step];
    } else if (state.mode === 'negative') {
        // Triple the bet after every loss: 1, 3, 9, 27, 81...
        currentMulti = Math.pow(3, state.step);
    }

    // 5. Calculate Bet Amount and Clamp to Limits
    let rawAmount = unit * currentMulti;
    let amount = Math.max(rawAmount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // Stop placing bets if the required amount exceeds bankroll limits
    // (Assuming betting on two dozens requires 2x the calculated amount)
    if ((amount * 2) > bankroll) {
        return []; // Insufficient funds, trigger a stop
    }

    // Store targeted dozens in state for evaluation on the next spin
    state.lastTargetDozens = targetDozens;

    // 6. Return Bet Array
    return targetDozens.map(dozenValue => ({
        type: 'dozen',
        value: dozenValue,
        amount: amount
    }));
}