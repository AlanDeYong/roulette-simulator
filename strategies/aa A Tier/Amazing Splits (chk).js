/**
 * Strategy: The Amazing Splits Strategy
 * Source: " (WON $790) BEST EVER? THE AMAZING SPLITS!"
 * YouTube Channel: The Roulette Master
 * Video URL: https://youtu.be/ylQVOVEuSCI
 *
 * --- THE FULL LOGIC IN DETAIL ---
 * 1. Base Setup:
 *    - Places 16 Split bets across the table layout:
 *      [0, 2] (or [0, '00']), [1, 4], [2, 5], [3, 6], [7, 10], [9, 12], [13, 16],
 *      [15, 18], [17, 20], [19, 22], [21, 24], [25, 28], [27, 30], [31, 34], [32, 35], [33, 36].
 *    - Covers 32 out of 37/38 numbers on the wheel for high hit frequency.
 * 
 * 2. Win Progression & Removing Hit Bets:
 *    - On a WIN:
 *      - Remove the specific split bet that hit from the active bet list on the next spin.
 *      - If in Level 1 (before any loss), aim for a quick +$50 (+10 base units) profit target.
 *        If reached, reset back to all 16 splits active at base unit amount.
 *      - If in Recovery Mode (after a loss), keep removing winning splits until the overall 
 *        bankroll reaches a NEW Session High Profit mark. Once achieved, full reset to Level 1.
 * 
 * 3. Loss Progression (Recovery Mode):
 *    - On a LOSS:
 *      - Abandon the $50 quick goal for that cycle.
 *      - Double the current unit bet size multiplier (1x -> 2x -> 4x -> 8x...).
 *      - Re-arm active splits at the new doubled multiplier.
 * 
 * --- THE GOAL ---
 * - Primary Target: Secure session profit in incremental steps (+10 units or new session peak).
 * - Reset Condition: Reaching +$50 profit before a loss OR exceeding highest bankroll peak in recovery.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Unit Bet Size (respecting inside bet minimum limit)
    const unit = config.betLimits.min;

    // 2. Define the Master List of 16 Split Bets
    const masterSplits = [
        [0, 2],    [1, 4],    [2, 5],    [3, 6],
        [7, 10],   [9, 12],   [13, 16],  [15, 18],
        [17, 20],  [19, 22],  [21, 24],  [25, 28],
        [27, 30],  [31, 34],  [32, 35],  [33, 36]
    ];

    // Helper: Check if a winning number is covered by a split [n1, n2]
    const splitCovers = (split, num) => split.includes(num);

    // 3. Initialize State
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.highestBankroll = bankroll;
        state.targetBankroll = bankroll + (10 * unit); // +$50 goal at $5 unit
        state.multiplier = 1;
        state.activeSplits = [...masterSplits];
        state.inRecovery = false;
    }

    // 4. Update State Based on Last Spin Outcome
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Find if last spin hit any active split
        const hitIndex = state.activeSplits.findIndex(s => splitCovers(s, lastNum));
        const isWin = hitIndex !== -1;

        if (isWin) {
            // Remove the winning split bet from active list
            state.activeSplits.splice(hitIndex, 1);

            // Update highest bankroll peak if achieved
            if (bankroll > state.highestBankroll) {
                state.highestBankroll = bankroll;
            }

            // Reset Condition 1: Reached quick profit target in Level 1 (before loss)
            const reachedQuickTarget = !state.inRecovery && bankroll >= state.targetBankroll;
            
            // Reset Condition 2: Reached new peak during Recovery Mode
            const recoveredPeak = state.inRecovery && bankroll >= state.highestBankroll;

            if (reachedQuickTarget || recoveredPeak || state.activeSplits.length === 0) {
                // Full Reset to Level 1
                state.multiplier = 1;
                state.activeSplits = [...masterSplits];
                state.inRecovery = false;
                state.highestBankroll = Math.max(state.highestBankroll, bankroll);
                state.targetBankroll = bankroll + (10 * unit);
            }
        } else {
            // On Loss: Enter recovery, double multiplier, and re-arm remaining splits
            state.inRecovery = true;
            state.multiplier *= 2;
            
            // If active splits list is low or exhausted, reset active splits to master set
            if (state.activeSplits.length < 8) {
                state.activeSplits = [...masterSplits];
            }
        }
    }

    // 5. Calculate Bet Amount with Limits Clamping
    let betAmount = unit * state.multiplier;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 6. Build Return Array of Active Split Bets
    const bets = state.activeSplits.map(split => ({
        type: 'split',
        value: split,
        amount: betAmount
    }));

    return bets;
}