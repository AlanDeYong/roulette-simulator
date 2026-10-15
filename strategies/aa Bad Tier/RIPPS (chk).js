/**
 * Roulette Strategy: RIPPS (Roulette Progressive Split Strategy) - Corrected
 * Source: Casino Matchmaker - https://youtu.be/3iVknkiTfBI?si=FCyy59Ai0DK3q6h5
 * 
 * The Full Logic:
 * This strategy plays two independent betting systems simultaneously. 
 * 1. Even-Chance Bet: Starts on 1-18 ('low'). 
 *    On a loss, the bet amount increases by the base unit and the position moves one step to the right 
 *    (1-18 -> Even -> Red -> Black -> Odd -> 19-36 -> 1-18, wrapping around). 
 *    On a win, the bet amount decreases by the base unit and moves one position to the left (towards 1-18).
 * 2. Column Bets: Placed permanently on the 1st and 2nd Columns.
 *    If the spin results in the 3rd column or a Zero (a loss for these columns), 
 *    both column bets increase by their base unit. If the spin lands in the 1st or 2nd column (a win), 
 *    both column bets decrease by their base unit.
 * 
 * The Full Bet Progression:
 * Both systems use a D'Alembert-style progression. 
 * - Base Unit: Table minimum for outside bets.
 * - On Loss: Increase bet by 1 base unit.
 * - On Win: Decrease bet by 1 base unit (minimum 1 unit).
 * 
 * The Goal:
 * The overarching goal is a session profit reset. If the current bankroll ever strictly 
 * exceeds the bankroll from the start of the betting cycle, ALL bets (Even-Chance 
 * and Columns) are reset to 1 unit, and the Even-Chance bet returns to 1-18 ('low').
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const baseUnit = config.betLimits.minOutside;
    const ecPositions = ['low', 'even', 'red', 'black', 'odd', 'high'];

    // 2. Initialize State
    if (state.cycleStartBankroll === undefined) {
        state.cycleStartBankroll = bankroll;
        state.ecUnit = 1;
        state.ecIndex = 0;
        state.colUnit = 1;
    }

    // 3. Process Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = parseInt(lastSpin.winningNumber);
        const color = lastSpin.winningColor;

        // Check for Session Profit Reset
        if (bankroll > state.cycleStartBankroll) {
            // Reached profit target: Reset progressions and log new baseline bankroll
            state.cycleStartBankroll = bankroll;
            state.ecUnit = 1;
            state.ecIndex = 0;
            state.colUnit = 1;
        } else {
            // Even-Chance Progression Check
            if (state.lastEcBetType) {
                let ecWon = false;
                if (color !== 'green' && !isNaN(num) && num !== 0) {
                    switch(state.lastEcBetType) {
                        case 'low': ecWon = (num >= 1 && num <= 18); break;
                        case 'even': ecWon = (num % 2 === 0); break;
                        case 'red': ecWon = (color === 'red'); break;
                        case 'black': ecWon = (color === 'black'); break;
                        case 'odd': ecWon = (num % 2 !== 0); break;
                        case 'high': ecWon = (num >= 19 && num <= 36); break;
                    }
                }

                if (ecWon) {
                    // Win: Decrease unit, move left towards 1-18 (index 0)
                    state.ecUnit = Math.max(1, state.ecUnit - 1);
                    state.ecIndex = Math.max(0, state.ecIndex - 1);
                } else {
                    // Loss: Increase unit, move right (wrapping around to start if necessary)
                    state.ecUnit++;
                    state.ecIndex = (state.ecIndex + 1) % ecPositions.length;
                }
            }

            // Columns Progression Check
            // A win is when the number lands in Column 1 or Column 2
            let colWon = false;
            if (color !== 'green' && !isNaN(num) && num !== 0) {
                if (num % 3 === 1 || num % 3 === 2) {
                    colWon = true;
                }
            }

            if (colWon) {
                // Win: Decrease column unit
                state.colUnit = Math.max(1, state.colUnit - 1);
            } else {
                // Loss: Increase column unit
                state.colUnit++;
            }
        }
    }

    // 4. Calculate Bet Amounts
    let ecAmount = state.ecUnit * baseUnit;
    let colAmount = state.colUnit * baseUnit;

    // Clamp to table limits
    ecAmount = Math.max(ecAmount, config.betLimits.minOutside);
    ecAmount = Math.min(ecAmount, config.betLimits.max);

    colAmount = Math.max(colAmount, config.betLimits.minOutside);
    colAmount = Math.min(colAmount, config.betLimits.max);

    // 5. Prepare Bets
    const currentEcType = ecPositions[state.ecIndex];
    state.lastEcBetType = currentEcType; // Save type to evaluate win/loss on next spin

    const bets = [
        { type: currentEcType, amount: ecAmount },
        { type: 'column', value: 1, amount: colAmount },
        { type: 'column', value: 2, amount: colAmount }
    ];

    // 6. Safety Net: Stop betting if bankroll is insufficient for the round
    const totalBet = ecAmount + (colAmount * 2);
    if (totalBet > bankroll && bankroll < config.betLimits.minOutside) {
        return []; 
    }

    return bets;
}