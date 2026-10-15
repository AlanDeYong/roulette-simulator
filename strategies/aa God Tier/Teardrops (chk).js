/**
 * DOCUMENTATION: Teardrops Roulette Strategy (Corrected)
 * * Source: https://youtu.be/FbjKVgs4zUE (Channel: Gamblers University), modified by user.
 * * Strategy Logic:
 * Uses pattern bets on non-overlapping corners, strictly avoiding corners in the
 * middle of a dozen. A single pattern consists of a corner bet and two vertical split bets.
 * * The Full Bet Progression:
 * - Base pattern: 2 units on a corner (e.g. 1/5), and 1 unit on the two vertical splits (e.g. 1/4, 2/5).
 * - Level 1: 2 random corner patterns.
 * - On Loss (Level 2): Rebet and add 2 more corner patterns randomly (Total 4 patterns, base bet).
 * - On Loss (Level 3+): Add 2 more patterns (Cap at 6), and increase all bets by their respective
 * base bet amounts (Multiplier increases linearly: x2, x3, etc.).
 * - On Win: If the session's peak profit is reached, reset completely to Level 1.
 * Else, rebet and go back 1 level.
 * * The Goal:
 * Keep accumulating profit until session high is reached and repeat.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) state.level = 1;
    if (state.sessionHigh === undefined) state.sessionHigh = bankroll;
    if (!state.currentPatterns) state.currentPatterns = [];

    // 2. Evaluate previous spin by calculating true bankroll difference
    if (state.lastBankroll !== undefined) {
        const profit = bankroll - state.lastBankroll;
        const isWin = profit > 0;

        if (isWin) {
            if (bankroll >= state.sessionHigh) {
                // Win and reached session peak: Reset
                state.level = 1;
                state.currentPatterns = [];
            } else {
                // Win but not peak: Go back 1 level
                state.level = Math.max(1, state.level - 1);
            }
        } else {
            // Loss: Increase level
            state.level++;
        }
    }

    // Update state variables for the NEXT spin
    state.lastBankroll = bankroll;
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
    }

    // 3. Determine progression parameters
    const numPatterns = Math.min(6, state.level * 2);
    const mult = state.level <= 2 ? 1 : state.level - 1;

    // Slice patterns if level decreased
    if (state.currentPatterns.length > numPatterns) {
        state.currentPatterns = state.currentPatterns.slice(0, numPatterns);
    }

    // 4. Valid non-overlapping corner groups (excluding middle of dozens)
    // Grouped by row-pairs to prevent vertical overlaps
    const validGroups = [[1, 2], [7, 8], [13, 14], [19, 20], [25, 26], [31, 32]];

    // 5. Add new random patterns if needed
    while (state.currentPatterns.length < numPatterns) {
        const availableGroups = validGroups.filter(g => 
            !state.currentPatterns.includes(g[0]) && !state.currentPatterns.includes(g[1])
        );
        
        if (availableGroups.length === 0) break; // Failsafe
        
        const randomGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)];
        const randomCorner = randomGroup[Math.floor(Math.random() * randomGroup.length)];
        
        state.currentPatterns.push(randomCorner);
    }

    // 6. Calculate Bet Amounts
    const unit = config.betLimits.min;
    let cornerAmount = 2 * unit * mult;
    let splitAmount = 1 * unit * mult;

    // Clamp to maximum limits
    cornerAmount = Math.min(config.betLimits.max, cornerAmount);
    splitAmount = Math.min(config.betLimits.max, splitAmount);

    // 7. Construct Bets
    let bets = [];
    for (let c of state.currentPatterns) {
        bets.push({ type: 'corner', value: c, amount: cornerAmount });
        // Vertical splits matching the user's requirement (e.g. corner 1 -> splits 1/4 and 2/5)
        bets.push({ type: 'split', value: [c, c + 3], amount: splitAmount });
        bets.push({ type: 'split', value: [c + 1, c + 4], amount: splitAmount });
    }

    return bets;
}