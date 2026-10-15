/**
 * Roulette Strategy: 2 Columns + 2 Dozens (Plays Itself)
 * Source: https://youtu.be/Ax7EWWQU_3g (YouTube Channel: WillVegas)
 * 
 * The Full Logic in details:
 * - The strategy bets on 2 Dozens (e.g., Dozen 1 & Dozen 2) and 2 Columns (e.g., Column 1 & Column 2).
 * - The Dozens and Columns operate completely independently from each other as two separate games running simultaneously.
 * - The demonstrator plays every spin continuously. (He notes that the original creator "Ashraf" uses a trigger, 
 *   waiting for multiple zeros or consecutive losses before stepping in, but the standard execution is continuous).
 * 
 * The Full Bet Progression in details:
 * - Initial Bets: Both Dozens and Columns start at a base unit (e.g., $1 or config.betLimits.minOutside).
 * - On a LOSS for a sector (e.g., neither of the two dozens hit): The bet size for that specific sector is multiplied by 3 
 *   (1x, 3x, 9x, 27x, 81x...).
 * - On a WIN for a sector (e.g., one of the two dozens hit): The bet size for that sector STAYS THE SAME for the next spin.
 * - SESSION PROFIT RESET: The only time bets decrease is when the overall bankroll hits a new session high. If 
 *   the current bankroll is greater than the reference/starting bankroll, BOTH Dozens and Columns immediately reset 
 *   back to the base unit of 1.
 * 
 * The Goal:
 * - Target Profit: The creator aims for a $50 profit on a $500 starting bankroll (10% gain) in about 15 minutes.
 * - Stop-loss: None explicitly defined, but the aggressive x3 multiplier will quickly drain the bankroll if a 
 *   streak of bad numbers hits (like 0, or numbers residing in the uncovered 3rd Dozen and 3rd Column).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.minOutside;

    // 2. Initialize State on first run
    if (!state.initialized) {
        state.initialized = true;
        // Track the highest bankroll achieved to know when we are in "session profit"
        state.sessionReferenceBankroll = bankroll;
        
        // Independent multipliers for Dozens and Columns
        state.progDozens = 1;
        state.progColumns = 1;
        
        // Base coverage: 1st and 2nd Dozens, 1st and 2nd Columns
        state.dozenBets = [1, 2];
        state.columnBets = [1, 2];
    }

    // 3. Update Progressions Based on Last Spin & Profit Checks
    if (bankroll > state.sessionReferenceBankroll) {
        // GOAL REACHED: We achieved a new session profit. Reset everything.
        state.sessionReferenceBankroll = bankroll;
        state.progDozens = 1;
        state.progColumns = 1;
    } else if (spinHistory.length > 0) {
        // NOT IN PROFIT: Check the last spin to update the x3 loss progressions
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        if (lastNum === 0 || lastNum === '00') {
            // Zero causes both sectors to lose
            state.progDozens *= 3;
            state.progColumns *= 3;
        } else {
            // Calculate which dozen and column hit
            const winDoz = Math.ceil(lastNum / 12);
            let winCol = lastNum % 3;
            if (winCol === 0) winCol = 3;

            // If the winning dozen is NOT one we bet on, it's a loss -> Multiply by 3
            // (If it won, the multiplier stays exactly the same as the previous spin)
            if (!state.dozenBets.includes(winDoz)) {
                state.progDozens *= 3;
            }
            
            // If the winning column is NOT one we bet on, it's a loss -> Multiply by 3
            if (!state.columnBets.includes(winCol)) {
                state.progColumns *= 3;
            }
        }
    }

    // 4. Calculate Current Bet Amounts
    let dozenAmount = unit * state.progDozens;
    let columnAmount = unit * state.progColumns;

    // 5. Clamp to Table Limits (Crucial)
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    columnAmount = Math.max(columnAmount, config.betLimits.minOutside);
    columnAmount = Math.min(columnAmount, config.betLimits.max);

    // 6. Construct and Return Bets
    const bets = [];
    
    state.dozenBets.forEach(d => {
        bets.push({ type: 'dozen', value: d, amount: dozenAmount });
    });
    
    state.columnBets.forEach(c => {
        bets.push({ type: 'column', value: c, amount: columnAmount });
    });

    return bets;
}