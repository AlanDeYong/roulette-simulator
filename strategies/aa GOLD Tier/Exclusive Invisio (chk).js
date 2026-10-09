/**
 * ============================================================================
 * STRATEGY: The Exclusive Invisio (Half-Stake Variation)
 * ============================================================================
 * Source:
 *   - Video: "It Set the Standard in Round 1… Now Comes the REAL Test"
 *   - URL: https://youtu.be/6S0lf-fALz4
 *   - YouTube Channel: Casino Matchmaker (Strategy submitted by Invisio)
 *
 * Modifications:
 *   - Base unit structure cut by half: 9 units total per base level (down from 18).
 *     - Outside (Low / High): 4 units (was 8)
 *     - Dozen (1st / 3rd): 2 units (was 4)
 *     - Six-Line: 1 unit (was 2)
 *     - Street: 1 unit (was 2)
 *     - Straight-Up 0: 1 unit (was 2)
 *   - Milestone targets scale proportionally to +$10 increments (was $20).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // -------------------------------------------------------------------------
    // 1. Initialize Persistent State
    // -------------------------------------------------------------------------
    if (state.level === undefined) state.level = 1;
    if (state.side === undefined) state.side = 'low'; // 'low' or 'high'
    if (state.targetMilestone === undefined) state.targetMilestone = 10;
    if (state.startingBankroll === undefined) {
        state.startingBankroll = (config && config.startingBankroll) ? config.startingBankroll : bankroll;
    }

    const currentProfit = bankroll - state.startingBankroll;

    // -------------------------------------------------------------------------
    // 2. Evaluate Previous Spin & Update Progression
    // -------------------------------------------------------------------------
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const playedSide = state.side;

        let isWin = false;
        let isBigWin = false;

        if (playedSide === 'low') {
            if (lastNum === 0 || (lastNum >= 1 && lastNum <= 18)) {
                isWin = true;
                isBigWin = true;
            } else if (lastNum >= 19 && lastNum <= 21) {
                isWin = true;
                isBigWin = false;
            }
        } else {
            if (lastNum === 0 || (lastNum >= 19 && lastNum <= 36)) {
                isWin = true;
                isBigWin = true;
            } else if (lastNum >= 16 && lastNum <= 18) {
                isWin = true;
                isBigWin = false;
            }
        }

        if (isWin) {
            if (currentProfit >= state.targetMilestone) {
                state.level = 1;
                state.targetMilestone = (Math.floor(currentProfit / 10) + 1) * 10;
            } else {
                if (state.level >= 3) {
                    if (isBigWin) {
                        state.level = Math.max(1, state.level - 1);
                    }
                }
            }
        } else {
            state.level += 1;
        }

        if (lastNum >= 1 && lastNum <= 18) {
            state.side = 'low';
        } else if (lastNum >= 19 && lastNum <= 36) {
            state.side = 'high';
        }
    }

    // -------------------------------------------------------------------------
    // 3. Goal Check
    // -------------------------------------------------------------------------
    if (currentProfit >= 75000) {
        return [];
    }

    // -------------------------------------------------------------------------
    // 4. Calculate Scaled Bet Amounts & Respect Bet Limits
    // -------------------------------------------------------------------------
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const maxLimit = config.betLimits.max;

    // Proportions cut in half: 4 units outside, 2 units dozen, 1 unit inside
    const unitScale = Math.max(
        1,
        Math.ceil(minOutside / 4),
        Math.ceil(minInside / 1)
    );

    const level = state.level;

    function clampBet(units, isOutside) {
        const minAllowed = isOutside ? minOutside : minInside;
        let amount = units * unitScale * level;
        amount = Math.max(amount, minAllowed);
        amount = Math.min(amount, maxLimit);
        return amount;
    }

    const outsideAmount = clampBet(4, true);
    const dozenAmount   = clampBet(2, true);
    const lineAmount    = clampBet(1, false);
    const streetAmount  = clampBet(1, false);
    const zeroAmount    = clampBet(1, false);

    // -------------------------------------------------------------------------
    // 5. Construct Bets
    // -------------------------------------------------------------------------
    let bets = [];

    if (state.side === 'low') {
        bets = [
            { type: 'low', amount: outsideAmount },
            { type: 'dozen', value: 1, amount: dozenAmount },
            { type: 'line', value: 13, amount: lineAmount },
            { type: 'street', value: 19, amount: streetAmount },
            { type: 'number', value: 0, amount: zeroAmount }
        ];
    } else {
        bets = [
            { type: 'high', amount: outsideAmount },
            { type: 'dozen', value: 3, amount: dozenAmount },
            { type: 'line', value: 19, amount: lineAmount },
            { type: 'street', value: 16, amount: streetAmount },
            { type: 'number', value: 0, amount: zeroAmount }
        ];
    }

    const totalRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalRequired > bankroll) {
        return [];
    }

    return bets;
}