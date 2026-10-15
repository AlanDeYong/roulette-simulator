/*
 * Strategy: Chapanacci (by Jeff Wright)
 * Source: https://youtu.be/yfeD10esQbI (The Roulette Master)
 *
 * The Full Logic in details:
 * - This strategy plays the "chop" (A-B-A pattern) on Dozens and Columns.
 * - It maintains a 'mode' which starts as 'dozen'. 
 * - For the current mode, it evaluates the last two valid spins (ignoring 0/00). 
 * - If the last two spins are different (e.g., Doz 1 then Doz 2), it bets that the next spin will "chop" back to the first one (bet Doz 1).
 * - If the last two spins are the SAME (e.g., Doz 1 then Doz 1), this is a streak. The strategy immediately switches mode (e.g., from Dozens to Columns).
 * - It then evaluates the chop logic on the new mode.
 * - If BOTH modes are currently streaking, it reverts to Dozens and looks backward in the history to find the most recent Dozen that is different from the streaking Dozen, and bets on that.
 * - Special Rule: If a 0 or 00 hits, the mode immediately switches to 'column'. 0 and 00 are ignored when evaluating the historical Dozen/Column sequences.
 * 
 * The Full Bet Progression in details:
 * - The progression uses the Fibonacci sequence (1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89...).
 * - Base unit is the table's minimum outside bet.
 * - On every loss, move 1 step forward in the Fibonacci sequence.
 * - On ANY win, the progression completely resets to step 0 (base unit).
 * 
 * The Goal:
 * - Play for steady accumulation. No explicit target profit is set, but the player is advised to "cash out when up a good amount". 
 * - Stop-loss is effectively the table maximum or bankroll exhaustion, as the Fibonacci progression ramps up very quickly on long losing streaks.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.mode) state.mode = 'dozen';
    if (state.fibIndex === undefined) state.fibIndex = 0;
    
    // Base unit determined by table limits
    const unit = config.betLimits.minOutside;

    // 2. Handle Win/Loss progression tracking
    if (state.lastBet !== undefined && spinHistory.length > 0) {
        let lastSpin = spinHistory[spinHistory.length - 1];
        let won = false;
        let num = lastSpin.winningNumber;
        
        if (state.lastBet.type === 'dozen') {
            let hitDoz = (num === 0 || num === '00') ? 0 : Math.ceil(num / 12);
            if (hitDoz === state.lastBet.value) won = true;
        } else if (state.lastBet.type === 'column') {
            let hitCol = (num === 0 || num === '00') ? 0 : ((num - 1) % 3) + 1;
            if (hitCol === state.lastBet.value) won = true;
        }

        if (won) {
            state.fibIndex = 0; // Win fully resets the progression
        } else {
            state.fibIndex++;   // Loss moves 1 step forward
        }
    }

    // 3. Early exit if no history to base logic on
    if (spinHistory.length === 0) {
        state.lastBet = { type: 'dozen', value: 1, amount: unit };
        return [state.lastBet];
    }

    let lastSpin = spinHistory[spinHistory.length - 1];
    
    // 4. Special Rule: Zero forces mode switch to 'column'
    if (lastSpin && (lastSpin.winningNumber === 0 || lastSpin.winningNumber === '00')) {
        state.mode = 'column';
    }

    // 5. Build arrays of valid historical properties (ignoring 0/00)
    let getValidSequence = (type) => {
        let valid = [];
        for (let s of spinHistory) {
            let n = s.winningNumber;
            if (n === 0 || n === '00') continue;
            if (type === 'dozen') valid.push(Math.ceil(n / 12));
            if (type === 'column') valid.push(((n - 1) % 3) + 1);
        }
        return valid;
    };

    let validDozens = getValidSequence('dozen');
    let validColumns = getValidSequence('column');

    let targetMode = state.mode;
    let targetValue = null;

    // 6. Determine Chop Target
    if (validDozens.length < 2) {
        // Fallback if not enough history after filtering zeros
        targetMode = 'dozen';
        targetValue = 1;
    } else {
        let checkChop = (modeToVerify) => {
            let arr = modeToVerify === 'dozen' ? validDozens : validColumns;
            if (arr.length < 2) return null;
            let v1 = arr[arr.length - 1]; // Last hit
            let v2 = arr[arr.length - 2]; // Prev hit
            if (v1 !== v2) return v2;     // A-B-A chop identified
            return null;                  // Streak identified
        };
        
        let target = checkChop(state.mode);
        if (target !== null) {
            targetMode = state.mode;
            targetValue = target;
        } else {
            // Streak in current mode. Switch mode!
            let otherMode = state.mode === 'dozen' ? 'column' : 'dozen';
            state.mode = otherMode; // Persist the switch
            
            let otherTarget = checkChop(otherMode);
            if (otherTarget !== null) {
                targetMode = otherMode;
                targetValue = otherTarget;
            } else {
                // Both modes are streaking (e.g. 10 then 1 are both Doz 1 and Col 1)
                // Revert to Dozens and walk backward to find the first different dozen
                state.mode = 'dozen';
                targetMode = 'dozen';
                let currentStreakValue = validDozens[validDozens.length - 1];
                
                for (let i = validDozens.length - 1; i >= 0; i--) {
                    if (validDozens[i] !== currentStreakValue) {
                        targetValue = validDozens[i];
                        break;
                    }
                }
                
                // Absolute fallback if history somehow only contains exactly one dozen
                if (!targetValue) {
                    targetValue = (currentStreakValue % 3) + 1; 
                }
            }
        }
    }

    // 7. Calculate Bet Amount using Fibonacci
    const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584];
    let idx = Math.min(state.fibIndex, fib.length - 1);
    let multiplier = fib[idx];
    let amount = unit * multiplier;

    // 8. Clamp to limits and bankroll
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);
    amount = Math.min(amount, bankroll);

    // If we can't afford the minimum bet, stop betting
    if (amount < config.betLimits.minOutside) {
        return [];
    }

    // Save and return bet
    state.lastBet = { type: targetMode, value: targetValue, amount: amount };
    return [state.lastBet];
}