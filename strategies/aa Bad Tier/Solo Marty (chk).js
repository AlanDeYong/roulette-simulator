/**
 * Strategy: Prime Press with Jackpot Street
 * Source: https://youtu.be/4Dth0pbPEm4 (LunchMoneyMo)
 *
 * The Full Logic in details:
 * - The player bets on 3 Double Streets (Lines) and 1 Single Street (The "Jackpot Street").
 * - Total coverage is 21 numbers.
 * - The positions selected for this implementation are Lines covering 4-9, 16-21, 28-33 and a Street covering 25-27.
 * 
 * The Full Bet Progression in details:
 * - Let `units` be the base multiplier for each bet position (starts at 1).
 * - Let `isPressed` track if the current bet is doubled after a win.
 * - Let `lastSpinWasWin` track if the immediately preceding spin was a win.
 * - On a Win (Jackpot or Line):
 *   - Reset `units` back to 1 and `isPressed` to false IF the last spin was also a win OR if the winning number is 25, 26, or 27.
 *   - ELSE, rebet and double up all units (`units *= 2`, set `isPressed = true`).
 * - On a Loss:
 *   - If the bet was pressed (`isPressed == true`): Revert to the base bet before the press, and add 1 unit. `units = (units / 2) + 1`. Set `isPressed = false`.
 *   - If the bet was NOT pressed: Add 1 unit to the current bet. `units += 1`.
 *
 * The Goal:
 * - To capitalize on consecutive wins by pressing (doubling) bets, while steadily recovering from losses by adding units linearly. A hit on the "Jackpot Street" or consecutive wins resets the cycle and secures profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.units === undefined) {
        state.units = 1;
        state.isPressed = false;
        state.lastSpinWasWin = false;
    }

    // 2. Evaluate Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        
        let hitType = 'loss';
        
        // Determine hit type based on our specific static positions
        if (winNum >= 25 && winNum <= 27) {
            hitType = 'jackpot'; // Hit the Single Street
        } else if (
            (winNum >= 4 && winNum <= 9) || 
            (winNum >= 16 && winNum <= 21) || 
            (winNum >= 28 && winNum <= 33)
        ) {
            hitType = 'line';    // Hit one of the Double Streets
        }

        // Apply Progression Logic
        if (hitType === 'jackpot' || hitType === 'line') {
            if (state.lastSpinWasWin || hitType === 'jackpot') {
                // Reset if last spin was a win OR winning number is 25, 26, or 27
                state.units = 1;
                state.isPressed = false;
            } else {
                // Else, rebet and double up all units
                state.units *= 2;
                state.isPressed = true;
            }
            state.lastSpinWasWin = true;
        } else if (hitType === 'loss') {
            if (state.isPressed) {
                // First whack after a press -> revert to base and add a unit
                state.units = (state.units / 2) + 1;
                state.isPressed = false;
            } else {
                // Regular loss -> add a unit
                state.units += 1;
            }
            state.lastSpinWasWin = false;
        }
    }

    // 3. Calculate Bet Amount
    const unitSize = config.minIncrementalBet || config.betLimits.min;
    let targetAmount = state.units * unitSize;

    // 4. CLAMP TO LIMITS
    targetAmount = Math.max(targetAmount, config.betLimits.min);
    targetAmount = Math.min(targetAmount, config.betLimits.max);

    // 5. Return Bets
    return [
        { type: 'line', value: 4, amount: targetAmount },   // Line 4-9
        { type: 'line', value: 16, amount: targetAmount },  // Line 16-21
        { type: 'line', value: 28, amount: targetAmount },  // Line 28-33
        { type: 'street', value: 25, amount: targetAmount } // Jackpot Street 25-27
    ];
}