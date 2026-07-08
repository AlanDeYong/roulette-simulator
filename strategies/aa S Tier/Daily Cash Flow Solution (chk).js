/**
 * Strategy Name: Daily Cash Flow Solution by Chance
 * Source: https://youtu.be/SrEa-dXIEfM (The Roulette Master)
 *
 * The Full Logic in details:
 * - Base Level (Level 0): Place 1 unit on two adjacent dozens (either 1st & 2nd, or 2nd & 3rd).
 * - The strategy toggles between these two sides upon every base win or full reset.
 * - If the base bet loses, move to Level 1.
 * - Level 1 (Even Money): Bet the total amount lost in Level 0 (2 units) on the corresponding even-money bet 
 * that covers most of your targeted dozens. (Bet 'low' if you were on 1st & 2nd; bet 'high' if you were on 2nd & 3rd).
 * - If it wins, you've recovered the loss. Reset to Base Level.
 * - If it loses, move to Level 2.
 * - Level 2 (Single Dozen): You've now lost 4 units total. Choose ONE dozen out of the two you targeted in the base bet. 
 * Pick the one that has been "sleeping" the longest (furthest since last hit in spin history).
 * * The Full Bet Progression in details:
 * - At Level 2, bet on the chosen single dozen using an escalating multiplier sequence.
 * - Multiplier sequence for units: 4, 6, 8, 10, 15, 20, 25, 30... 
 * (Increases by 2 units until 10 units, then increases by 5 units).
 * - If a single dozen bet loses, advance to the next multiplier and keep betting the same dozen.
 * - If a single dozen bet wins:
 * - Check if current bankroll is in "session profit" (i.e., >= the bankroll at the start of the sequence).
 * - If in session profit: sequence complete, reset to Base Level and switch sides.
 * - If NOT in session profit: Keep the SAME bet amount, but switch to the OTHER dozen you originally targeted.
 * (e.g., if you were targeting 1st & 2nd 12, and just won on 1st 12, switch your next bet to 2nd 12).
 * * The Goal:
 * - Clear a session profit (reach a new high-water mark bankroll) during the recovery sequence, then safely 
 * reset to the base level to continue accumulating incremental wins.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.minOutside;

    // Helper to determine if the last spin resulted in a win
    function checkWin(winningNum, lastBets) {
        if (winningNum === 0) return false;
        for (let b of lastBets) {
            if (b.type === 'dozen') {
                if (b.value === 1 && winningNum >= 1 && winningNum <= 12) return true;
                if (b.value === 2 && winningNum >= 13 && winningNum <= 24) return true;
                if (b.value === 3 && winningNum >= 25 && winningNum <= 36) return true;
            } else if (b.type === 'low' && winningNum >= 1 && winningNum <= 18) return true;
            else if (b.type === 'high' && winningNum >= 19 && winningNum <= 36) return true;
        }
        return false;
    }

    // Helper to determine the "longest sleeping" dozen between two options
    function getLongestSinceHit(side, history) {
        const dozens = side === 1 ? [1, 2] : [2, 3];
        const lastSeen = { [dozens[0]]: -1, [dozens[1]]: -1 };
        
        for (let i = history.length - 1; i >= 0; i--) {
            let num = history[i].winningNumber;
            let hitDozen = 0;
            
            if (num >= 1 && num <= 12) hitDozen = 1;
            else if (num >= 13 && num <= 24) hitDozen = 2;
            else if (num >= 25 && num <= 36) hitDozen = 3;
            
            if (hitDozen === dozens[0] && lastSeen[dozens[0]] === -1) lastSeen[dozens[0]] = i;
            if (hitDozen === dozens[1] && lastSeen[dozens[1]] === -1) lastSeen[dozens[1]] = i;
            
            if (lastSeen[dozens[0]] !== -1 && lastSeen[dozens[1]] !== -1) break;
        }
        
        // If a dozen hasn't hit yet in the session, favor it
        if (lastSeen[dozens[0]] === -1) return dozens[0];
        if (lastSeen[dozens[1]] === -1) return dozens[1];
        
        // Return the dozen with the older index
        return lastSeen[dozens[0]] < lastSeen[dozens[1]] ? dozens[0] : dozens[1];
    }

    // 2. Initialize State on the first run
    if (state.progressionLevel === undefined) {
        state.progressionLevel = 0; 
        state.currentSide = 1; // 1 = [1st & 2nd 12], 2 = [2nd & 3rd 12]
        
        if (spinHistory.length > 0) {
            const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            if (lastNum >= 1 && lastNum <= 12) state.currentSide = 2;
            else if (lastNum >= 25 && lastNum <= 36) state.currentSide = 1;
        }
        state.sessionBankroll = bankroll;
        state.dozenProgressionIndex = 0;
        state.targetDozen = null;
    }

    // 3. Process previous spin results
    if (spinHistory.length > 0 && state.lastBet && state.lastBet.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        const isWin = checkWin(lastSpin, state.lastBet);

        if (state.progressionLevel === 0) {
            if (isWin) {
                // Win at base: switch sides and secure new high-water mark
                state.currentSide = state.currentSide === 1 ? 2 : 1;
                state.sessionBankroll = bankroll; 
            } else {
                // Loss at base: move to even money recovery
                state.progressionLevel = 1;
            }
        } else if (state.progressionLevel === 1) {
            if (isWin) {
                // Recovered with even money: reset entirely
                state.progressionLevel = 0;
                state.currentSide = state.currentSide === 1 ? 2 : 1;
                state.sessionBankroll = bankroll;
            } else {
                // Loss on even money: trigger single dozen sequence
                state.progressionLevel = 2;
                state.dozenProgressionIndex = 0;
                state.targetDozen = getLongestSinceHit(state.currentSide, spinHistory);
            }
        } else if (state.progressionLevel === 2) {
            if (isWin) {
                if (bankroll >= state.sessionBankroll) {
                    // Reached session profit goal
                    state.progressionLevel = 0;
                    state.currentSide = state.currentSide === 1 ? 2 : 1;
                    state.sessionBankroll = bankroll;
                } else {
                    // Won, but not in profit yet: swap to the alternate dozen from the same side
                    const dozens = state.currentSide === 1 ? [1, 2] : [2, 3];
                    state.targetDozen = dozens[0] === state.targetDozen ? dozens[1] : dozens[0];
                    // IMPORTANT: Do not increment index. Keep same bet size.
                }
            } else {
                // Loss on single dozen: advance multiplier index
                state.dozenProgressionIndex++;
            }
        }
    } else if (spinHistory.length === 0) {
        state.sessionBankroll = bankroll; // Capture baseline cleanly
    }

    // 4. Generate current bets based on the evaluated State
    let bets = [];

    if (state.progressionLevel === 0) {
        let d1 = state.currentSide === 1 ? 1 : 2;
        let d2 = state.currentSide === 1 ? 2 : 3;
        
        let amount = Math.max(unit, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);
        
        bets.push({ type: 'dozen', value: d1, amount: amount });
        bets.push({ type: 'dozen', value: d2, amount: amount });

    } else if (state.progressionLevel === 1) {
        let betType = state.currentSide === 1 ? 'low' : 'high';
        
        // Even money bet attempts to recover the 2 units lost in Level 0
        let amount = Math.max(2 * unit, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);
        
        bets.push({ type: betType, amount: amount });

    } else if (state.progressionLevel === 2) {
        // Escalate multiplier: Increases by 2 for the first 4 jumps, then switches to increasing by 5
        let multiplier;
        if (state.dozenProgressionIndex <= 3) {
            multiplier = 4 + (state.dozenProgressionIndex * 2);
        } else {
            multiplier = 10 + ((state.dozenProgressionIndex - 3) * 5);
        }
        
        let amount = multiplier * unit;
        amount = Math.max(amount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);
        
        bets.push({ type: 'dozen', value: state.targetDozen, amount: amount });
    }

    // Persist last bet for evaluation next spin
    state.lastBet = bets;

    return bets;
}