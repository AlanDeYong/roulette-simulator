/**
 * STRATEGY: Dual Strike Dozens
 * * Source: https://www.youtube.com/watch?v=ylTUTfJI76w (Viper Roulette)
 * * The Logic: 
 * This strategy bets on the two most recent distinct dozens to have appeared (the "Dual Strike"). 
 * It ignores the zero (green). If the last two distinct dozens were Dozen 1 and Dozen 2, 
 * those are the targets for the next spin.
 * * The Progression (Modified D'Alembert):
 * - After a LOSS on a specific dozen: Increase that dozen's bet by 1 unit (+1).
 * - After a WIN on a specific dozen: Decrease 그 dozen's bet by 2 units (-2).
 * - Offset Rebalancing: If the difference between the two bet amounts exceeds a threshold 
 * (e.g., 6 units), both bets are reset to the average of the two to prevent 
 * one side from spiraling out of control.
 * * The Goal: 
 * To achieve a target profit (e.g., $50 with $1 units) using a low-volatility method 
 * that covers 24/37 numbers, utilizing slow progressions rather than aggressive doubling.
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. Configuration & Constants
    const UNIT = config.betLimits.minOutside;
    const REBALANCE_THRESHOLD = 6; // Max units difference before rebalancing
    
    // 2. Initialize State
    if (!state.initialized) {
        state.dozen1Amount = UNIT;
        state.dozen2Amount = UNIT;
        state.activeDozens = []; // Stores the two dozens we are targeting
        state.initialized = true;
    }

    // 3. Analyze History to identify "Dual Strike" Dozens
    const getDozen = (num) => {
        if (num === 0) return 0;
        return Math.ceil(num / 12);
    };

    let targetDozens = [];
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        const d = getDozen(spinHistory[i].winningNumber);
        if (d !== 0 && !targetDozens.includes(d)) {
            targetDozens.push(d);
        }
        if (targetDozens.length === 2) break;
    }

    // No bets if we haven't seen at least two distinct dozens yet
    if (targetDozens.length < 2) return [];

    // 4. Progression Logic (Apply after the first bet)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNum = lastSpin.winningNumber;
        const lastWinDozen = getDozen(lastWinNum);

        // Update levels for the previous active dozens
        if (state.activeDozens.length === 2) {
            // Check Dozen A
            if (lastWinDozen === state.activeDozens[0]) {
                state.dozen1Amount = Math.max(UNIT, state.dozen1Amount - (UNIT * 2));
            } else {
                state.dozen1Amount = state.dozen1Amount + UNIT;
            }

            // Check Dozen B
            if (lastWinDozen === state.activeDozens[1]) {
                state.dozen2Amount = Math.max(UNIT, state.dozen2Amount - (UNIT * 2));
            } else {
                state.dozen2Amount = state.dozen2Amount + UNIT;
            }
        }
    }

    // 5. Rebalancing Logic
    // Prevents one dozen bet from becoming significantly larger than the other
    const diff = Math.abs(state.dozen1Amount - state.dozen2Amount);
    if (diff > (UNIT * REBALANCE_THRESHOLD)) {
        const avg = Math.ceil(((state.dozen1Amount + state.dozen2Amount) / 2) / UNIT) * UNIT;
        state.dozen1Amount = avg;
        state.dozen2Amount = avg;
    }

    // 6. Update Active Targets for the current spin
    state.activeDozens = targetDozens;

    // 7. Construct Bets with Limit Clamping
    const clamp = (amt) => Math.min(Math.max(amt, config.betLimits.minOutside), config.betLimits.max);

    const bets = [
        {
            type: 'dozen',
            value: state.activeDozens[0],
            amount: clamp(state.dozen1Amount)
        },
        {
            type: 'dozen',
            value: state.activeDozens[1],
            amount: clamp(state.dozen2Amount)
        }
    ];

    return bets;
}