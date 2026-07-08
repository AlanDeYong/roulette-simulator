/**
 * Milestone Dozens Roulette Strategy
 * Source: https://youtu.be/AhP1LO_rTKs (Casino Matchmaker / Craig Watts)
 * 
 * The Full Logic in details:
 * - This strategy wagers on two of the three dozens. To optimize selections, it dynamically targets the "hot" dozens (the last two unique dozens that landed).
 * - It operates on a milestone progression system, aiming to lock in a target profit before advancing.
 * - The strategy's defining mechanism is its recovery logic: rather than chasing losses immediately, it waits for a "trigger" win (a flat bet win) before deploying a larger mathematical recovery bet.
 * 
 * The Full Bet Progression in details:
 * - Start by flat betting 1 base unit (e.g., $5) on the two hot dozens.
 * - While winning, continue to flat bet 1 unit. Your target milestone increments by 1 unit every time a milestone is reached.
 * - When you suffer a loss, you enter "recovery mode." Do not increase your bet size yet. Continue to flat bet 1 unit.
 * - Keep flat betting until you win. That single flat bet win is your "trigger".
 * - On the spin immediately following your trigger win, calculate the exact dollar amount needed to reach your current milestone target. 
 * - Bet that precise amount on BOTH dozens. (Because winning a dozen pays 2:1, betting $X on two dozens costs $2X, but a win returns $3X, netting exactly +$X profit).
 * - If this large recovery bet wins, the milestone is secured, and you reset to your 1-unit base bet.
 * - If the large recovery bet loses, you stay in recovery mode and return to flat betting 1 unit until another win provides a new trigger.
 * 
 * The Goal:
 * - To systematically climb +1 unit profit milestones while insulating the bankroll from long losing streaks by requiring a momentum shift (a flat bet win) before executing a larger recovery bet.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.minOutside;

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.targetProfit = unit; // First milestone is 1 base unit
        state.recoveryMode = false;
        state.readyForBigBet = false;
        state.lastBetDozens = [1, 2]; // Default start
    }

    // 3. Calculate Current Session Profit
    let currentProfit = bankroll - state.initialBankroll;

    // 4. Process Previous Spin Result
    if (spinHistory.length > 0) {
        let lastSpin = spinHistory[spinHistory.length - 1];
        let lastNum = lastSpin.winningNumber;
        
        let wonLast = false;
        if (lastNum !== 0 && lastNum !== '00') {
            let winningDozen = Math.ceil(lastNum / 12);
            if (state.lastBetDozens.includes(winningDozen)) {
                wonLast = true;
            }
        }

        // Milestone Check: Have we reached or exceeded our target?
        if (currentProfit >= state.targetProfit) {
            // Step the milestone up by the base unit from the current profit level
            state.targetProfit = Math.floor(currentProfit / unit) * unit + unit;
            state.recoveryMode = false;
            state.readyForBigBet = false;
        } else {
            // Milestone not yet reached; handle recovery transitions
            if (!state.recoveryMode) {
                if (!wonLast) {
                    state.recoveryMode = true;
                    state.readyForBigBet = false;
                }
            } else {
                if (state.readyForBigBet) {
                    if (!wonLast) {
                        // The big recovery bet failed; wait for another trigger win
                        state.readyForBigBet = false; 
                    }
                } else {
                    if (wonLast) {
                        // The flat bet won during recovery; trigger the big bet next spin
                        state.readyForBigBet = true; 
                    }
                }
            }
        }
    }

    // 5. Calculate Next Bet Amount
    let betAmount = unit;

    // Strike with the calculated bet amount if the trigger was met
    if (state.recoveryMode && state.readyForBigBet) {
        betAmount = state.targetProfit - currentProfit;
    }

    // 6. Clamp to Config Limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 7. Select "Hot" Dozens
    let hotDozens = [];
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        let num = spinHistory[i].winningNumber;
        if (num === 0 || num === '00') continue; // Skip greens
        let dozen = Math.ceil(num / 12);
        
        if (!hotDozens.includes(dozen)) {
            hotDozens.push(dozen);
        }
        if (hotDozens.length === 2) break;
    }
    
    // Fallback if history lacks sufficient data to find two unique dozens
    let allDozens = [1, 2, 3];
    for (let d of allDozens) {
        if (hotDozens.length >= 2) break;
        if (!hotDozens.includes(d)) hotDozens.push(d);
    }

    // Save selected dozens to check for a win next spin
    state.lastBetDozens = hotDozens;

    // 8. Return Bets
    return [
        { type: 'dozen', value: hotDozens[0], amount: betAmount },
        { type: 'dozen', value: hotDozens[1], amount: betAmount }
    ];
}