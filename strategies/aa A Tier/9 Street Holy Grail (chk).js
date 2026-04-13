/**
 * Strategy: The 9 Street "Holy Grail"
 * Source: https://www.youtube.com/watch?v=ZsNQ3UUojIY (Casino Matchmaker)
 *
 * The Logic:
 * We place equal bets on 9 specific streets, covering a total of 27 numbers.
 * This provides roughly a 73% win probability. Based on the video, we cover
 * the middle section of the board, skipping the first two streets (1, 4) 
 * and the last street (34). The selected streets are: 7, 10, 13, 16, 19, 22, 25, 28, 31.
 *
 * The Progression:
 * This is a positive/negative progression hybrid:
 * - On a Win: Repeat the bet and ADD 1 unit to every street.
 * - On a Loss: Repeat the bet and ADD 2 units to every street.
 * - Smart Pause (Safety Net): If the current bet size means a single win would 
 * cross the profit target, do NOT increase the bet size. Just repeat the current bet.
 *
 * The Goal:
 * Reach a predetermined session profit milestone (e.g., 20x the base unit).
 * Once this target is reached, the progression resets back to the base unit,
 * and a new session baseline is established.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Constants
    const streets = [7, 10, 13, 16, 19, 22, 25, 28, 31];
    
    // Determine the base unit, respecting the minimum inside bet limit
    const minInside = config.betLimits.min;
    const baseUnit = Math.max(minInside, config.minIncrementalBet || 1);
    
    // Target profit before resetting (e.g., $20 milestone on a $1 unit)
    const targetProfit = 20 * baseUnit;

    // Determine the increment amount based on user config mode
    const unitIncrement = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

    // 2. Initialize State
    if (typeof state.currentUnits === 'undefined') {
        state.currentUnits = baseUnit;
        state.sessionStartBankroll = bankroll;
    }

    // 3. Process Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        let isWin = false;

        // Check if the winning number falls within any of our covered streets
        if (winNum !== 0 && winNum !== '00') {
            for (let s of streets) {
                // A street starting at 's' covers 's', 's+1', and 's+2'
                if (winNum >= s && winNum <= s + 2) {
                    isWin = true;
                    break;
                }
            }
        }

        const currentProfit = bankroll - state.sessionStartBankroll;

        // Goal Check: Did we hit or exceed our target profit?
        if (currentProfit >= targetProfit) {
            // Milestone reached! Reset progression and establish new baseline
            state.currentUnits = baseUnit;
            state.sessionStartBankroll = bankroll;
        } else {
            // Calculate potential net profit on a win: 
            // A winning street pays 11:1. We win 11 * unit, but lose the 8 other street bets (8 * unit).
            // Net win = +3 units per win.
            const expectedProfitOnWin = 3 * state.currentUnits;

            // Smart Pause: If winning this spin puts us at/over the target, don't increment.
            if (currentProfit + expectedProfitOnWin >= targetProfit) {
                // Do nothing to state.currentUnits, just repeat the bet
            } else {
                // Apply the Holy Grail progression
                if (isWin) {
                    state.currentUnits += (1 * unitIncrement);
                } else {
                    state.currentUnits += (2 * unitIncrement);
                }
            }
        }
    }

    // 4. Clamp the Bet Amount to Configured Limits
    let amount = state.currentUnits;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);
    
    // Sync the clamped amount back to state to prevent hidden runaway math
    state.currentUnits = amount;

    // 5. Construct and Return the Bet Objects
    const bets = [];
    for (let s of streets) {
        bets.push({ type: 'street', value: s, amount: amount });
    }

    return bets;
}