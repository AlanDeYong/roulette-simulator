/**
 * ============================================================================
 * STRATEGY: The Exclusive Invisio
 * ============================================================================
 * Source:
 *   - Video: "It Set the Standard in Round 1… Now Comes the REAL Test"
 *   - URL: https://youtu.be/6S0lf-fALz4
 *   - YouTube Channel: Casino Matchmaker (Strategy submitted by Invisio)
 *
 * The Full Logic in Detail:
 *   - Follow the Winner: Bets are placed dynamically on either the "Low" side
 *     or the "High" side based on the previous spin result:
 *       - If the winning number is 1–18: Bet the LOW side.
 *       - If the winning number is 19–36: Bet the HIGH side.
 *       - If the winning number is 0 (or on the initial spin): Maintain the
 *         current side (defaults to LOW).
 *
 *   - Board Coverage & Bet Positions (18 units total per base level):
 *     1. LOW SIDE SETUP (Covers 22 numbers: 0, 1–18, 19–21):
 *        - Low (1–18): 8 units
 *        - 1st Dozen (1–12): 4 units
 *        - Six-Line 13–18: 2 units
 *        - Street 19–21: 2 units (Insurance / small win)
 *        - Straight-Up 0: 2 units (Jackpot)
 *     2. HIGH SIDE SETUP (Covers 22 numbers: 0, 19–36, 16–18):
 *        - High (19–36): 8 units
 *        - 3rd Dozen (25–36): 4 units
 *        - Six-Line 19–24: 2 units
 *        - Street 16–18: 2 units (Insurance / small win)
 *        - Straight-Up 0: 2 units (Jackpot)
 *
 *   - Payout Profile (at Level 1, $18 total bet):
 *     - Low/High numbers (1–18 on Low, 19–36 on High): Net profit +$10 ("Big Win")
 *     - Insurance Street (19–21 on Low, 16–18 on High): Net profit +$6 ("Small Win")
 *     - Zero (0): Net profit +$54 ("Jackpot Win")
 *     - Missed numbers (15 numbers): Loss of current stake
 *
 * The Full Bet Progression in Detail:
 *   - Progression Levels: Total stake equals Level * 18 units (Level 1 = $18,
 *     Level 2 = $36, Level 3 = $54, Level 4 = $72, etc.).
 *   - On LOSS:
 *     - Increase progression level by 1 (Level = Level + 1).
 *     - Switch side to follow the new winning number (Low or High).
 *   - On WIN:
 *     - Milestone Check: The strategy sets profit milestone targets in +$20
 *       increments ($20, $40, $60, $80, ...).
 *       - If net session profit reaches or crosses the current milestone target:
 *         RESET back to Level 1, and set the next target to the next $20 increment.
 *     - If the current profit is BELOW the milestone target:
 *       - At Level 3 or higher (Safety Net):
 *         - On a "Big Win" (main side or 0): Drop down 1 level (Level = Level - 1).
 *         - On a "Small Win" (insurance street): DO NOT drop a level; stay at
 *           the current level to protect recovery equity.
 *       - At Level 2:
 *         - Do not step down on non-milestone wins; hold Level 2 until reaching
 *           the milestone or taking a loss.
 *
 * The Goal:
 *   - Target Profit: Session target of +$150 (or current milestone target),
 *     securing incremental milestone steps of +$20 along the way.
 *   - Stop-Loss: Cease betting if the bankroll is depleted or cannot cover
 *     the minimum required bets.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // -------------------------------------------------------------------------
    // 1. Initialize Persistent State
    // -------------------------------------------------------------------------
    if (state.level === undefined) state.level = 1;
    if (state.side === undefined) state.side = 'low'; // 'low' or 'high'
    if (state.targetMilestone === undefined) state.targetMilestone = 20;
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

        // Determine if previous spin won and win category
        let isWin = false;
        let isBigWin = false;

        if (playedSide === 'low') {
            if (lastNum === 0 || (lastNum >= 1 && lastNum <= 18)) {
                isWin = true;
                isBigWin = true; // Main side or zero hit
            } else if (lastNum >= 19 && lastNum <= 21) {
                isWin = true;
                isBigWin = false; // Insurance street hit (small win)
            }
        } else {
            // High side played
            if (lastNum === 0 || (lastNum >= 19 && lastNum <= 36)) {
                isWin = true;
                isBigWin = true; // Main side or zero hit
            } else if (lastNum >= 16 && lastNum <= 18) {
                isWin = true;
                isBigWin = false; // Insurance street hit (small win)
            }
        }

        // Progression Logic
        if (isWin) {
            // Check if current profit reached or exceeded the milestone target
            if (currentProfit >= state.targetMilestone) {
                // Milestone reached: Reset to base level 1
                state.level = 1;
                // Move milestone up to next $20 increment above current profit
                state.targetMilestone = (Math.floor(currentProfit / 20) + 1) * 20;
            } else {
                // Win below milestone
                if (state.level >= 3) {
                    // Safety net active: drop 1 level only on big win
                    if (isBigWin) {
                        state.level = Math.max(1, state.level - 1);
                    }
                    // On small win, hold level
                }
                // At level 2, hold level until milestone is hit
            }
        } else {
            // Loss: increase progression level by 1
            state.level += 1;
        }

        // Follow the winner: update side for next spin
        if (lastNum >= 1 && lastNum <= 18) {
            state.side = 'low';
        } else if (lastNum >= 19 && lastNum <= 36) {
            state.side = 'high';
        }
        // If 0, retain the current side
    }

    // -------------------------------------------------------------------------
    // 3. Goal Check
    // -------------------------------------------------------------------------
    // Target profit reached ($150 target)
    if (currentProfit >= 15000) {
        return [];
    }

    // -------------------------------------------------------------------------
    // 4. Calculate Scaled Bet Amounts & Respect Bet Limits
    // -------------------------------------------------------------------------
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const maxLimit = config.betLimits.max;

    // Base unit multiplier to ensure table minimums are satisfied
    // Ratio: 8 units (outside), 4 units (dozen), 2 units (line, street, number)
    const unitScale = Math.max(
        1,
        Math.ceil(minOutside / 8),
        Math.ceil(minInside / 2)
    );

    const level = state.level;

    // Helper to calculate clamped bet amount
    function clampBet(units, isOutside) {
        const minAllowed = isOutside ? minOutside : minInside;
        let amount = units * unitScale * level;
        amount = Math.max(amount, minAllowed);
        amount = Math.min(amount, maxLimit);
        return amount;
    }

    const outsideAmount = clampBet(8, true);
    const dozenAmount   = clampBet(4, true);
    const lineAmount    = clampBet(2, false);
    const streetAmount  = clampBet(2, false);
    const zeroAmount    = clampBet(2, false);

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

    // Bankroll safety check: Ensure we do not bet more than remaining bankroll
    const totalRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalRequired > bankroll) {
        return [];
    }

    return bets;
}