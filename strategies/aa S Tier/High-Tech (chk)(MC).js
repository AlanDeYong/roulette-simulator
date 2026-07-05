/**
 * Strategy Name: High-Tech Roulette System (Billy Williams)
 * Source: https://www.youtube.com/watch?v=FwKwoZN8Vwg (Channel: The Roulette Master)
 * * The Full Logic in details:
 * - This strategy covers 24 inside numbers via 12 specific horizontal layout split bets.
 * - At the start of a session, all 12 splits are actively bet on.
 * - On a win (an active split hits), that specific winning split is removed from the 
 * layout to decrease table exposure, while the remaining splits retain their current sizes.
 * - A full system reset to all 12 original splits occurs as soon as the session net profit 
 * becomes positive (bankroll is greater than the session's starting baseline).
 * * The Full Bet Progression in details:
 * - Starts with a base unit size (scaled to config.betLimits.min) per split bet.
 * - After a loss, the bet size of all remaining splits increases based on bracketed tiers:
 * - If current bet per split <= 10 units: Increase by 2 units.
 * - If current bet per split > 10 and <= 25 units: Increase by 5 units.
 * - If current bet per split > 25 and <= 70 units: Increase by 15 units.
 * - If current bet per split > 70 units: Increase by 25 units.
 * * The Goal:
 * - To secure session profit via scaled inside hits, resetting immediately upon recovery.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const INITIAL_SPLITS = [
        [2, 5], [3, 6], [7, 10],
        [8, 11], [14, 17], [15, 18],
        [19, 22], [20, 23], [26, 29],
        [27, 30], [31, 34], [32, 35]
    ];

    // 1. Initialize State Variables
    if (!state.isInitialized) {
        state.activeSplits = JSON.parse(JSON.stringify(INITIAL_SPLITS));
        state.currentBetPerSplit = config.betLimits.min;
        state.sessionStartingBankroll = bankroll;
        state.isInitialized = true;
    }

    // 2. Process Outcomes from Past Spins
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;

        // Determine if the winning number hit an active split
        let hitIndex = -1;
        for (let i = 0; i < state.activeSplits.length; i++) {
            if (state.activeSplits[i].includes(winningNumber)) {
                hitIndex = i;
                break;
            }
        }

        if (hitIndex !== -1) {
            // WIN: Strip out the specific split that hit
            state.activeSplits.splice(hitIndex, 1);

            // Reset completely if session profit is achieved
            if (bankroll > state.sessionStartingBankroll) {
                state.activeSplits = JSON.parse(JSON.stringify(INITIAL_SPLITS));
                state.currentBetPerSplit = config.betLimits.min;
                state.sessionStartingBankroll = bankroll;
            }
        } else {
            // LOSS: Increase bet sizes across remaining splits based on unit metrics
            const currentUnits = state.currentBetPerSplit / config.betLimits.min;
            let incrementUnits = 2;

            if (currentUnits > 70) {
                incrementUnits = 25;
            } else if (currentUnits > 25) {
                incrementUnits = 15;
            } else if (currentUnits > 10) {
                incrementUnits = 5;
            }

            state.currentBetPerSplit += incrementUnits * config.betLimits.min;
        }
    }

    // 3. Safety Fallback: Reset if board gets fully cleared without session profit
    if (!state.activeSplits || state.activeSplits.length === 0) {
        state.activeSplits = JSON.parse(JSON.stringify(INITIAL_SPLITS));
        state.currentBetPerSplit = config.betLimits.min;
        state.sessionStartingBankroll = bankroll;
    }

    // 4. Construct Output Array of Bets Clamped to Layout Limits
    const bets = [];
    for (let i = 0; i < state.activeSplits.length; i++) {
        let amount = state.currentBetPerSplit;

        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: 'split',
            value: state.activeSplits[i],
            amount: amount
        });
    }

    return bets;
}