function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit while respecting bet limits
    const unit = Math.max(config.betLimits.min || 2, 5);

    // 2. Initialize State
    if (!state.level) {
        state.level = 1;
    }

    // 3. Evaluate previous spin result if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        if (state.level === 1) {
            // Covered: 13-30
            if (num >= 13 && num <= 30) {
                state.level = 2; // Win -> Advance
            } else {
                state.level = 1; // Loss -> Reset
            }
        } else if (state.level === 2) {
            // Double street coverage: 10-30
            // Win (2x cover): 13-27
            // Push (1x cover): 10-12, 28-30
            // Loss: all others
            if (num >= 13 && num <= 27) {
                state.level = 3; // Win -> Advance
            } else if ((num >= 10 && num <= 12) || (num >= 28 && num <= 30)) {
                state.level = 2; // Push -> Repeat
            } else {
                state.level = 1; // Loss -> Reset
            }
        } else if (state.level === 3) {
            // Covered: 10-27
            // Win: 13-24
            // Push: 10-12, 25-27
            // Loss: all others
            if (num >= 13 && num <= 24) {
                state.level = 1; // Win (Target Reached) -> Reset
            } else if ((num >= 10 && num <= 12) || (num >= 25 && num <= 27)) {
                state.level = 3; // Push -> Repeat
            } else {
                state.level = 1; // Loss -> Reset
            }
        }
    }

    // Helper function to clamp bet amounts to configured limits
    function clampBet(amount) {
        return Math.min(Math.max(amount, config.betLimits.min), config.betLimits.max);
    }

    // 4. Construct Bets based on Current Level
    const bets = [];

    if (state.level === 1) {
        bets.push({ type: 'line', value: 13, amount: clampBet(unit) });
        bets.push({ type: 'line', value: 19, amount: clampBet(unit) });
        bets.push({ type: 'line', value: 25, amount: clampBet(unit) });
    } else if (state.level === 2) {
        bets.push({ type: 'line', value: 10, amount: clampBet(unit) });
        bets.push({ type: 'line', value: 13, amount: clampBet(unit) });
        bets.push({ type: 'line', value: 16, amount: clampBet(unit) });
        bets.push({ type: 'line', value: 19, amount: clampBet(unit) });
        bets.push({ type: 'line', value: 22, amount: clampBet(unit) });
        bets.push({ type: 'line', value: 25, amount: clampBet(unit) });
    } else if (state.level === 3) {
        bets.push({ type: 'line', value: 10, amount: clampBet(unit * 2) });
        bets.push({ type: 'line', value: 13, amount: clampBet(unit * 2) });
        bets.push({ type: 'line', value: 16, amount: clampBet(unit * 2) });
        bets.push({ type: 'line', value: 19, amount: clampBet(unit * 2) });
        bets.push({ type: 'line', value: 22, amount: clampBet(unit * 2) });
        bets.push({ type: 'corner', value: 14, amount: clampBet(unit) });
        bets.push({ type: 'corner', value: 20, amount: clampBet(unit) });
    }

    return bets;
}