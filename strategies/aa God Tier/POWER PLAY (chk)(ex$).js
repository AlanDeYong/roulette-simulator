/**
 * Strategy Name: Power Play
 * Source: https://youtu.be/iGArKb0sZq0 (Channel: As provided in prompt)
 * * THE FULL LOGIC:
 * The strategy utilizes an expanding spatial pattern, moving down the layout's dozens.
 * - Normal Pattern: Straights on 1, 2, 3, 5. Corners on 1 (covers 1,2,4,5) and 2 (covers 2,3,5,6).
 * - Mirror Pattern: Straights on 34, 35, 36, 32. Corners on 31 (covers 31,32,34,35) and 32 (covers 32,33,35,36).
 * * The system starts on the Normal pattern. 
 * On a loss, new clusters of numbers are added to the existing bet, and at specific intervals, all bets are doubled.
 * On a win:
 * - If the bankroll hits a new peak session profit, the progression resets and flips to the opposite side (Mirror).
 * - If the bankroll is NOT at peak profit, the exact same bets from the previous spin are placed again.
 * * THE FULL BET PROGRESSION:
 * - Step 0 (Start): 1 unit on straights [1,2,3,5], 1 unit on corners [1,2]. (Total: 6u)
 * - Step 1 (Loss 1): Add 1 unit on straights [7,8,9,11], 1 unit on corners [7,8]. (Total: 12u)
 * - Step 2 (Loss 2): Add 1 unit on straights [13,14,15,17], 1 unit on corners [13,14]. THEN double all bets. (Total: 36u)
 * - Step 3 (Loss 3): Add 2 units on straights [19,20,21,23], 2 units on corners [19,20]. (Total: 48u)
 * - Step 4 (Loss 4): Add 2 units on straights [25,26,27,29], 2 units on corners [25,26]. THEN double all bets. (Total: 120u)
 * - Step 5 (Loss 5): Double all bets. (Total: 240u)
 * - Step 6 (Loss 6): Double all bets. (Total: 480u)
 * - Next Loss: Max progression reached; resets to Step 0 on the current side to prevent extreme ruin.
 * * THE GOAL:
 * Catch a winning number within a heavy, aggressively doubled table spread to rapidly recover nested losses and force a new peak bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min; // Base unit for inside bets

    // 1. Initialize State dynamically on the first spin
    if (state.step === undefined) {
        state.step = 0;
        state.side = 0; // 0 = Normal, 1 = Mirror
        state.peakBankroll = bankroll;
        state.currentBets = [];
    }

    // 2. Track Win/Loss via bankroll differential
    let wonLastSpin = false;
    if (state.lastBankrollAfterBet !== undefined) {
        const winAmount = bankroll - state.lastBankrollAfterBet;
        if (winAmount > 0) {
            wonLastSpin = true;
        }
    }

    // Update session peak profit
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Process the Progression Step logic
    if (spinHistory.length > 0) {
        if (wonLastSpin) {
            if (bankroll >= state.peakBankroll) {
                // Peak profit reached: Reset step and mirror the table
                state.step = 0;
                state.side = 1 - state.side; 
            } else {
                // Win but still in drawdown: hold step exactly where it is (rebet)
            }
        } else {
            // Loss: advance the progression step
            state.step++;
            if (state.step > 6) {
                // Hard-cap on progression to prevent stack overflow limits
                state.step = 0;
            }
        }
    }

    // 4. Procedural Bet Generation
    // We rebuild the array dynamically to inherently respect the math logic up to the current step
    const BASE_STRAIGHTS = [
        [1, 2, 3, 5],
        [7, 8, 9, 11],
        [13, 14, 15, 17],
        [19, 20, 21, 23],
        [25, 26, 27, 29]
    ];
    
    const BASE_CORNERS = [
        [1, 2],
        [7, 8],
        [13, 14],
        [19, 20],
        [25, 26]
    ];
    
    // Defines the incoming base units for straight/corners before doubling events
    const TIER_MULTIPLIERS = [1, 1, 1, 2, 2];

    let tempBets = [];

    for (let s = 0; s <= state.step; s++) {
        // Only append new coverage blocks up through Step 4 (tiers 0 to 4)
        if (s < 5) {
            let tierUnit = TIER_MULTIPLIERS[s] * unit;
            let straights = BASE_STRAIGHTS[s];
            let corners = BASE_CORNERS[s];

            // If we are flipped, apply the mathematical mirror formula for the layout
            if (state.side === 1) {
                straights = straights.map(x => 37 - x); // e.g. 1 becomes 36
                corners = corners.map(x => 33 - x);     // e.g. corner top-left 1 becomes 32
            }

            straights.forEach(val => {
                tempBets.push({ type: 'number', value: val, amount: tierUnit });
            });
            corners.forEach(val => {
                tempBets.push({ type: 'corner', value: val, amount: tierUnit });
            });
        }

        // Apply mandatory doubling to the ENTIRE array at specific steps
        if (s === 2 || s === 4 || s === 5 || s === 6) {
            tempBets = tempBets.map(b => ({ ...b, amount: b.amount * 2 }));
        }
    }

    // 5. Clamp to User Bet Limits
    let finalBets = tempBets.map(bet => {
        let amount = Math.max(bet.amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        return { ...bet, amount };
    });

    // 6. Record the exact ending bankroll for next spin's math
    let totalAmount = finalBets.reduce((sum, b) => sum + b.amount, 0);
    state.lastBankrollAfterBet = bankroll - totalAmount;

    return finalBets;
}