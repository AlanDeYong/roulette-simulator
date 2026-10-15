/**
 * Roulette Strategy: Street Walker
 * 
 * Source:
 * - URL: https://youtu.be/hj5gHFZhzf0
 * - Channel: CEG Dealer School
 * 
 * The Full Logic:
 * - "Street Walker" is a conservative positive progression system played on Street (3-number) bets.
 * - The strategy steps up bet sizes and reduces/expands street coverage using accumulated winnings,
 *   allowing the player to stay at the table for a long time and lock in profit during a winning run.
 * 
 * The Full Bet Progression:
 * - Step 1: Bet 1 base unit on 7 distinct Streets (7 units total).
 *   - On Loss: Remain at Step 1 and rebet 1 unit on 7 Streets.
 *   - On Win: Move to Step 2.
 * - Step 2: Bet 1 base unit on 6 distinct Streets (6 units total), pocketing half the previous payout.
 *   - On Loss: Reset to Step 1.
 *   - On Win: Move to Step 3.
 * - Step 3: Bet 2 base units on 7 distinct Streets (14 units total).
 *   - On Loss: Reset to Step 1.
 *   - On Win: Move to Step 4.
 * - Step 4: Bet 3 base units on 7 distinct Streets (21 units total).
 *   - On Win or Loss: Progression series complete. Reset to Step 1.
 * 
 * Goal:
 * - Capitalize on winning streaks through positive press progression while locking in profit along the way.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.step) {
        state.step = 1;
    }

    // 2. Evaluate previous spin outcome to handle progression steps
    if (spinHistory.length > 0 && state.lastBets && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Check if winning number was covered by any placed street bet
        let won = false;
        for (const b of state.lastBets) {
            // Street bet covers numbers from b.value to b.value + 2
            if (winningNum >= b.value && winningNum <= b.value + 2) {
                won = true;
                break;
            }
        }

        if (won) {
            // Advance to next step or reset if series finished
            if (state.step < 4) {
                state.step += 1;
            } else {
                state.step = 1; // Completed Step 4, reset series
            }
        } else {
            // On loss, reset back to Step 1 if in progression steps 2, 3, or 4
            state.step = 1;
        }
    }

    // 3. Define standard 7 street starting values (1-21)
    const availableStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    
    // Select streets based on current step
    let selectedStreets = [];
    if (state.step === 2) {
        // Step 2 uses 6 streets
        selectedStreets = availableStreets.slice(0, 6);
    } else {
        // Steps 1, 3, and 4 use 7 streets
        selectedStreets = availableStreets.slice(0, 7);
    }

    // 4. Calculate unit size & multiplier based on current step
    const minInside = config.betLimits.min;
    const maxLimit = config.betLimits.max;

    let multiplier = 1;
    if (state.step === 1 || state.step === 2) {
        multiplier = 1;
    } else if (state.step === 3) {
        multiplier = 2;
    } else if (state.step === 4) {
        multiplier = 3;
    }

    let unitAmount = minInside * multiplier;
    unitAmount = Math.max(unitAmount, minInside);
    unitAmount = Math.min(unitAmount, maxLimit);

    // 5. Construct bets array
    const bets = selectedStreets.map(streetVal => ({
        type: 'street',
        value: streetVal,
        amount: unitAmount
    }));

    // Save active bets into state for evaluating next spin
    state.lastBets = bets;

    return bets;
}