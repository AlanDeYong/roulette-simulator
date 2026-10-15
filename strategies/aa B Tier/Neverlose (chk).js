/**
 * Neverlose Roulette Strategy
 * 
 * Source: https://youtu.be/fL11WSiNMI0
 * Channel: WillVegas
 * 
 * The Full Logic in details:
 * - This strategy covers a large portion of the table by betting on either Low (1-18) or High (19-36) numbers outside bet,
 *   combined with bets on the 2nd and 3rd columns.
 * - Initially, bets are placed on the 'low' outside bet and the 2nd and 3rd columns.
 * - On each spin, the strategy employs a 'follow the winner' approach for the outside bet: if the winning number is High (19-36),
 *   the outside bet moves to 'high'. If the winning number is Low (1-18), it stays on 'low'. For 0 or 00, it stays put on its current position.
 * - The column bets (2nd and 3rd columns) always remain on the same positions.
 * 
 * The Full Bet Progression in details:
 * - Base bets are established as 3 units on the Low/High outside bet, and 1 unit each on the 2nd and 3rd columns.
 * - On a win (bankroll increases), if the session's peak profit is achieved or exceeded, the progression resets completely to base units.
 * - If a win occurs but does not reach a new session peak profit, the bet amounts stay the same.
 * - On any loss (including partial losses where net bankroll decreases), the bet amounts remain the same until the second consecutive/accumulated loss.
 * - Upon the second loss, all bets are increased by their respective base bet amounts (progression multiplier increases by 1), and the loss count resets.
 * 
 * The Goal:
 * - To achieve a session peak profit by capitalizing on high table coverage and grinding back losses with a conservative two-loss progression system.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit from config outside bet limit
    const baseUnit = config.betLimits.minOutside || 5;

    // 2. Initialize State variables on the first spin
    if (state.multiplier === undefined) {
        state.multiplier = 1;
        state.lossCount = 0;
        state.peakBankroll = bankroll;
        state.previousBankroll = bankroll;
        state.currentOutsideType = 'low'; // Starts on low numbers
    }

    // 3. Process the last spin result if history exists
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Update Outside Bet Position (Follow the winner logic)
        if (lastNumber >= 19 && lastNumber <= 36) {
            state.currentOutsideType = 'high';
        } else if (lastNumber >= 1 && lastNumber <= 18) {
            state.currentOutsideType = 'low';
        }

        // Determine Win / Loss compared to the previous spin
        if (bankroll > state.previousBankroll) {
            // It's a win or recovery
            if (bankroll > state.peakBankroll) {
                // Reached a new session peak profit -> Reset progression
                state.multiplier = 1;
                state.lossCount = 0;
                state.peakBankroll = bankroll;
            }
        } else if (bankroll < state.previousBankroll) {
            // It's a loss (partial or full)
            state.lossCount++;
            if (state.lossCount === 2) {
                // Second loss triggers a bet size increase
                state.multiplier++;
                state.lossCount = 0;
            }
        }
    }

    // Update persistent bankroll tracker for the next round evaluation
    state.previousBankroll = bankroll;

    // 4. Calculate final bet amounts with progression multiplier applied
    let outsideAmount = baseUnit * 3 * state.multiplier;
    let columnAmount = baseUnit * 1 * state.multiplier;

    // Clamp values to table limits defined in config
    outsideAmount = Math.max(Math.min(outsideAmount, config.betLimits.max), config.betLimits.minOutside);
    columnAmount = Math.max(Math.min(columnAmount, config.betLimits.max), config.betLimits.minOutside);

    // 5. Construct and return the array of bet objects
    return [
        { type: state.currentOutsideType, amount: outsideAmount },
        { type: 'column', value: 2, amount: columnAmount },
        { type: 'column', value: 3, amount: columnAmount }
    ];
}