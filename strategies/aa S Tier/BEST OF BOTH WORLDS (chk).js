/**
 * Best of Both Worlds Roulette Strategy
 * 
 * Source:
 * - Channel: Bet With Mo
 * - Video URL: https://youtu.be/gGK2iSsY_rI
 * - Strategy Name: "Best of Both Worlds"
 * 
 * The Full Logic in Details:
 * - The strategy combines an even-money Outside bet with 8 Inside Straight-Up numbers,
 *   alternating between two sides:
 *     - Side A ("Even" side):
 *         - Outside Bet: EVEN (10 units)
 *         - Inside Bets: 8 Straight-Up bets (1 unit each) on the lowest odd numbers:
 *           [1, 3, 5, 7, 9, 11, 13, 15].
 *     - Side B ("Odd" side):
 *         - Outside Bet: ODD (10 units)
 *         - Inside Bets: 8 Straight-Up bets (1 unit each) on the highest even numbers:
 *           [22, 24, 26, 28, 30, 32, 34, 36].
 * - Total base layout per spin: 18 units (10 on Outside + 8 on Straight-Ups).
 * 
 * Win / Loss Handling & Progression:
 * 1. Outside Win (Small Win, +2 units net profit):
 *    - The outside bet hits (e.g. Even hits on Side A, or Odd hits on Side B).
 *    - Net profit is +2 units per base level.
 *    - Action: Rebet at current level and keep current side.
 * 
 * 2. Straight-Up Win (Big Win, +18 units net profit per level):
 *    - One of the 8 straight-up numbers hits (paying 35:1).
 *    - If bankroll reaches a new session high or recovery is complete (at base level 1):
 *      Switch sides (A -> B or B -> A) and reset progression level to 1.
 *    - If at an elevated progression level (> 1):
 *      Step down progression (reduce level by 1, or drop by half if coming off a doubled recovery level),
 *      and keep playing until back to base level or new session high, then switch sides.
 * 
 * 3. Total Miss / Loss:
 *    - Neither the outside bet nor any straight-up number hits (e.g., uncovered number or 0/00).
 *    - Action: Increase progression by 1 unit (Level 1 -> 2 -> 3 -> 4 -> 5).
 *      If a loss occurs at Level 5, double the bet (Level 10) for rapid recovery.
 * 
 * The Goal:
 * - Build consistent profits via regular small outside wins while hitting high-payout 
 *   straight-up numbers, recovering drawdowns via step-up/step-down progression.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.side = 'A'; // 'A' = Even outside + Low Odds; 'B' = Odd outside + High Evens
        state.level = 1;  // Progression level multiplier (1, 2, 3, 4, 5, 10)
        state.sessionHigh = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Evaluate Last Spin Result (if history exists)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const netChange = bankroll - state.lastBankroll;

        // Check which win occurred
        const sideANumbers = [1, 3, 5, 7, 9, 11, 13, 15];
        const sideBNumbers = [22, 24, 26, 28, 30, 32, 34, 36];
        const activeNumbers = state.side === 'A' ? sideANumbers : sideBNumbers;
        const isStraightUpWin = activeNumbers.includes(num);

        const isEven = num > 0 && num % 2 === 0;
        const isOdd = num % 2 !== 0;
        const isOutsideWin = (state.side === 'A' && isEven) || (state.side === 'B' && isOdd);

        // Update session high
        if (bankroll > state.sessionHigh) {
            state.sessionHigh = bankroll;
        }

        if (isStraightUpWin) {
            // Straight-up hit (large win)
            if (bankroll >= state.sessionHigh || state.level <= 1) {
                // Recovered / new high: switch sides and reset to base
                state.level = 1;
                state.side = state.side === 'A' ? 'B' : 'A';
            } else {
                // Drop down progression level
                if (state.level >= 10) {
                    state.level = 5;
                } else {
                    state.level = Math.max(1, state.level - 1);
                }
            }
        } else if (isOutsideWin) {
            // Outside win (+2 units net) -> rebet same level & side
            if (bankroll >= state.sessionHigh && state.level > 1) {
                state.level = 1;
                state.side = state.side === 'A' ? 'B' : 'A';
            }
        } else {
            // Loss (uncovered number or 0/00) -> progress bet
            if (state.level === 5) {
                state.level = 10; // Double up on deep loss for fast recovery
            } else if (state.level >= 10) {
                state.level = 1; // Safeguard reset if max recovery level fails
            } else {
                state.level += 1; // Step up by 1 unit
            }
        }
    }

    state.lastBankroll = bankroll;

    // 3. Determine Base Units and Sizing with Bet Limit Safeguards
    const baseInsideUnit = config.betLimits.min || 1;
    let insideBetAmount = baseInsideUnit * state.level;
    insideBetAmount = Math.max(insideBetAmount, config.betLimits.min);
    insideBetAmount = Math.min(insideBetAmount, config.betLimits.max);

    // Outside bet is 10x the inside unit bet size
    let outsideBetAmount = insideBetAmount * 10;
    outsideBetAmount = Math.max(outsideBetAmount, config.betLimits.minOutside);
    outsideBetAmount = Math.min(outsideBetAmount, config.betLimits.max);

    // Check bankroll requirements (1 outside bet + 8 straight-up bets)
    const totalRequired = outsideBetAmount + (insideBetAmount * 8);
    if (bankroll < totalRequired) {
        // Fall back to minimum allowed amounts if bankroll is low
        insideBetAmount = config.betLimits.min;
        outsideBetAmount = Math.max(config.betLimits.minOutside, insideBetAmount * 10);
        outsideBetAmount = Math.min(outsideBetAmount, config.betLimits.max);
    }

    // 4. Construct Bets Based on Current Active Side
    const bets = [];

    if (state.side === 'A') {
        // Side A: Even outside bet + 8 lowest odd inside numbers
        bets.push({ type: 'even', amount: outsideBetAmount });
        const numbers = [1, 3, 5, 7, 9, 11, 13, 15];
        for (let i = 0; i < numbers.length; i++) {
            bets.push({ type: 'number', value: numbers[i], amount: insideBetAmount });
        }
    } else {
        // Side B: Odd outside bet + 8 highest even inside numbers
        bets.push({ type: 'odd', amount: outsideBetAmount });
        const numbers = [22, 24, 26, 28, 30, 32, 34, 36];
        for (let i = 0; i < numbers.length; i++) {
            bets.push({ type: 'number', value: numbers[i], amount: insideBetAmount });
        }
    }

    return bets;
}