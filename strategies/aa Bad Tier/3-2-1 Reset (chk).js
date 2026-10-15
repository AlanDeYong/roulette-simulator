/**
 * Strategy: 3-2-1 Reset
 * Source: https://youtu.be/-4F8jhW1FpI
 * Channel: CEG Dealer School
 *
 * Full Logic in Detail:
 * The "3-2-1 Reset" strategy is a positive regression betting system played on inside bets 
 * (Double Streets, Corners, Splits) covering non-overlapping sectors of the roulette layout.
 * 
 * - Level 3 (3 Bets / $60 total): The player starts by placing 3 non-overlapping inside bet groups 
 *   ($20 per group):
 *     1. Double Street (6 numbers) - $20
 *     2. Two Corners (8 numbers, $10 each) - $20
 *     3. Double Street / Corner + Split mix (4-6 numbers) - $20
 *   Total coverage is 18 non-overlapping numbers ($60 total wager).
 * 
 * - Level 2 (2 Bets / $40 total): Upon winning at Level 3, the player regresses to 2 bet groups ($20 each = $40 total).
 * 
 * - Level 1 (1 Bet / $30 pressed): Upon winning at Level 2, the player regresses to 1 bet group pressed ($30 on a single Double Street).
 * 
 * Progression Rules:
 * - Start at Level 3.
 * - On WIN at Level 3 -> Move to Level 2.
 * - On LOSS at Level 3 -> Remain at Level 3.
 * - On WIN at Level 2 -> Move to Level 1.
 * - On LOSS at Level 2 -> Remain at Level 2.
 * - On WIN or LOSS at Level 1 -> RESET back to Level 3.
 * 
 * Goal & Bankroll:
 * - Recommended Bankroll: $400 (20 units of $20)
 * - Target Profit: Double bankroll ($800 total) or take profit after solid progression runs.
 * - Stop Loss: Loss of starting bankroll.
 

<scratchpad>
1. Strategy Name & Source:
   - Name: 3 2 1 Reset
   - Video URL: https://youtu.be/-4F8jhW1FpI
   - Channel: CEG Dealer School

2. Bet Triggers & Conditions:
   - Always active on every spin as long as bankroll allows.
   - Non-overlapping inside bets covering up to 18 numbers.

3. Betting Stages & Progression:
   - Stage 3: Place 3 distinct bet groups ($20 each = $60 total).
     - Group 1: Line bet (13-18) = $20
     - Group 2: Corner (19,20,22,23) = $10, Corner (25,26,28,29) = $10
     - Group 3: Line bet (31-36) = $20
     - Win -> Transition to Stage 2.
     - Loss -> Stay at Stage 3.
   - Stage 2: Place 2 distinct bet groups ($20 each = $40 total).
     - Group 1: Line bet (13-18) = $20
     - Group 2: Corner (19,20,22,23) = $10, Corner (25,26,28,29) = $10
     - Win -> Transition to Stage 1.
     - Loss -> Stay at Stage 2.
   - Stage 1: Place 1 pressed bet group ($30 total).
     - Group 1: Line bet (13-18) = $30
     - Win or Loss -> Reset to Stage 3.

4. Bet Placement & Limits:
   - Clamp all individual bet amounts between config.betLimits.min and config.betLimits.max.
</scratchpad>
*/

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;

    // Initialize state on first spin
    if (state.stage === undefined) {
        state.stage = 3; // Start at stage 3
    }

    // Evaluate previous spin outcome if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Check if last spin hit any of our covered numbers
        const wasWin = state.coveredNumbers ? state.coveredNumbers.includes(lastNumber) : false;

        if (state.stage === 3) {
            if (wasWin) {
                state.stage = 2; // Regress on win
            }
        } else if (state.stage === 2) {
            if (wasWin) {
                state.stage = 1; // Regress on win
            }
        } else if (state.stage === 1) {
            // Always reset after Stage 1 (win or loss)
            state.stage = 3;
        }
    }

    // Helper to scale and clamp bet amounts safely within table limits
    function clampBet(amount) {
        return Math.min(Math.max(amount, minInside), maxBet);
    }

    let bets = [];
    let covered = [];

    if (state.stage === 3) {
        // Stage 3: 3 Bet Groups ($60 Total base)
        // Group 1: Double street (13-18) -> $20
        bets.push({ type: 'line', value: 13, amount: clampBet(20) });
        covered.push(13, 14, 15, 16, 17, 18);

        // Group 2: Two Corners (19-23 & 25-29) -> $10 each ($20 total)
        bets.push({ type: 'corner', value: 19, amount: clampBet(10) });
        bets.push({ type: 'corner', value: 25, amount: clampBet(10) });
        covered.push(19, 20, 22, 23, 25, 26, 28, 29);

        // Group 3: Double street (31-36) -> $20
        bets.push({ type: 'line', value: 31, amount: clampBet(20) });
        covered.push(31, 32, 33, 34, 35, 36);

    } else if (state.stage === 2) {
        // Stage 2: 2 Bet Groups ($40 Total base)
        // Group 1: Double street (13-18) -> $20
        bets.push({ type: 'line', value: 13, amount: clampBet(20) });
        covered.push(13, 14, 15, 16, 17, 18);

        // Group 2: Two Corners (19-23 & 25-29) -> $10 each ($20 total)
        bets.push({ type: 'corner', value: 19, amount: clampBet(10) });
        bets.push({ type: 'corner', value: 25, amount: clampBet(10) });
        covered.push(19, 20, 22, 23, 25, 26, 28, 29);

    } else if (state.stage === 1) {
        // Stage 1: 1 Pressed Bet Group ($30 Total base)
        // Pressed Double street (13-18) -> $30
        bets.push({ type: 'line', value: 13, amount: clampBet(30) });
        covered.push(13, 14, 15, 16, 17, 18);
    }

    // Save covered numbers for the next spin evaluation
    state.coveredNumbers = covered;

    return bets;
}