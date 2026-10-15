/**
 * Strategy: Overlapping Lines & Streets Regression
 * * The Full Logic:
 * - Places 8 simultaneous bets on overlapping Double Streets (Lines): 4, 7, 10, 13, 16, 19, 22, 25.
 * * The Full Bet Progression:
 * - Base Level: 1 unit on each of the 8 lines.
 * - On Loss: Rebet the layout and increase ALL active bets by 2 units.
 * - On Win (Not at Peak Profit): The winning line is removed. A new bet is added to the 
 * specific street within that double street that DID NOT hit. Existing units are maintained.
 * - On Win (At Peak Profit): Resets to the base layout and 1 unit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseBets = [
        { type: 'line', value: 4 },
        { type: 'line', value: 7 },
        { type: 'line', value: 10 },
        { type: 'line', value: 13 },
        { type: 'line', value: 16 },
        { type: 'line', value: 19 },
        { type: 'line', value: 22 },
        { type: 'line', value: 25 }
    ];

    // 1. Initialize State
    if (!state.initialized) {
        state.activeBets = JSON.parse(JSON.stringify(baseBets));
        state.units = 1;
        state.peakBankroll = bankroll;
        state.initialized = true;
    }

    // 2. Evaluate Last Spin & Adjust State
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        // Update peak bankroll high-water mark
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }

        // Check if session has hit peak profit
        if (bankroll >= state.peakBankroll) {
            state.activeBets = JSON.parse(JSON.stringify(baseBets));
            state.units = 1;
        } else {
            // Progression / Regression Mode
            let anyWin = false;
            const nextActiveBets = [];

            for (const b of state.activeBets) {
                let isWin = false;
                
                if (winNum >= 1 && winNum <= 36) {
                    if (b.type === 'line' && winNum >= b.value && winNum <= b.value + 5) {
                        isWin = true;
                    } else if (b.type === 'street' && winNum >= b.value && winNum <= b.value + 2) {
                        isWin = true;
                    }
                }

                if (isWin) {
                    anyWin = true;
                    if (b.type === 'line') {
                        const firstStreet = b.value;
                        const secondStreet = b.value + 3;

                        // Identify the street that did NOT hit and add it to the active layout
                        if (winNum >= firstStreet && winNum <= firstStreet + 2) {
                            nextActiveBets.push({ type: 'street', value: secondStreet });
                        } else {
                            nextActiveBets.push({ type: 'street', value: firstStreet });
                        }
                    }
                } else {
                    // Keep losing bets active
                    nextActiveBets.push(b);
                }
            }

            if (anyWin) {
                state.activeBets = nextActiveBets; // Regress layout, maintain units
            } else {
                state.units += 2; // Complete miss, scale units
            }
        }
    }

    // 3. Construct Output & Clamp Limits
    const unitAmount = config.betLimits.min; 
    let currentBetAmount = state.units * unitAmount;

    currentBetAmount = Math.max(currentBetAmount, config.betLimits.min);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    const betsToPlace = state.activeBets.map(b => {
        return {
            type: b.type,
            value: b.value,
            amount: currentBetAmount
        };
    });

    return betsToPlace.length > 0 ? betsToPlace : [];
}