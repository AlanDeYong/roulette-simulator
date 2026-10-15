/**
 * Roulette Strategy: Junko's 4x4 Street Recovery System (Fixed Streets)
 * 
 * Source:
 * - Channel: Junko Bodie
 * - URL: https://youtu.be/-sQ71QFWi80
 * 
 * Full Logic in Detail:
 * - Plays 8 fixed interior streets on the layout divided into 2 distinct groups:
 *   - Group 1: Streets 7, 10, 13, 16
 *   - Group 2: Streets 19, 22, 25, 28
 * - When a winning number lands on any street inside a group, that ENTIRE group is won and removed from betting on subsequent spins.
 * - Betting continues on the remaining active group until it also wins, or a reset/recovery occurs.
 * - When both groups win (or session profit target is reached), both groups reset back to Level 1.
 * 
 * Full Bet Progression in Detail:
 * 1. Base Progression (1 -> 2 -> 4):
 *    - Level 1: 1 unit per street on active groups.
 *    - Level 2 (after loss at Level 1): 2 units per street on active groups.
 *    - Level 3 (after loss at Level 2): 4 units per street on active groups.
 * 2. Recovery Progression:
 *    - If an active group fails Level 3 (4 units) without hitting a win, it enters Recovery Mode.
 *    - Bet sizes gradually step up (+1, +2, +3, +5 units, etc.) to cover cumulative group losses.
 *    - Splitting Phase (Deep Recovery): If recovery extends past 4 consecutive misses, the 4 streets in the group are reduced (split) down to 2 streets (randomly selected from that group) to slow down exposure while stepping up unit bets (+5 to +10 units).
 * 3. Goal / Reset:
 *    - Reset whenever both groups win or session profit target is reached.
 * 
 * @param {Array} spinHistory - History of roulette spins.
 * @param {number} bankroll - Current bankroll amount.
 * @param {Object} config - Simulator configuration including bet limits.
 * @param {Object} state - State object for persistence across spins.
 * @param {Object} utils - Utility functions provided by the simulator.
 * @returns {Array|null} Array of bet objects or null/empty array.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minInsideBet = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;

    // Fixed Group definitions per correction
    const FIXED_GROUP_1 = [7, 10, 13, 16];
    const FIXED_GROUP_2 = [19, 22, 25, 28];

    // Helper: Initialize or Reset session state
    function initSession() {
        state.group1Streets = [...FIXED_GROUP_1];
        state.group2Streets = [...FIXED_GROUP_2];
        state.active1 = true;
        state.active2 = true;
        state.level1 = 1; // 1 -> 2 -> 4
        state.level2 = 1;
        state.inRecovery1 = false;
        state.inRecovery2 = false;
        state.recoveryBet1 = 5;
        state.recoveryBet2 = 5;
        state.recoveryMisses1 = 0;
        state.recoveryMisses2 = 0;
        state.split1 = false;
        state.split2 = false;
        state.startBankroll = bankroll;
    }

    // Helper: Check if winning number falls inside a list of street start numbers
    function hitsStreetList(num, streetList) {
        if (num === 0 || num === 37 || num === '00') return false;
        return streetList.some(s => num >= s && num <= s + 2);
    }

    // Initialize state on first spin
    if (!state.group1Streets || !state.group2Streets) {
        initSession();
    }

    // Process previous spin outcome
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Evaluate Group 1
        if (state.active1) {
            const currentStreets1 = state.group1Streets;
            if (hitsStreetList(lastNum, currentStreets1)) {
                // Group 1 Won -> Remove entire group for next spin
                state.active1 = false;
                state.inRecovery1 = false;
            } else {
                // Group 1 Missed
                if (!state.inRecovery1) {
                    if (state.level1 === 1) state.level1 = 2;
                    else if (state.level1 === 2) state.level1 = 4;
                    else if (state.level1 === 4) {
                        // Enter recovery mode
                        state.inRecovery1 = true;
                        state.recoveryBet1 = 5;
                        state.recoveryMisses1 = 0;
                    }
                } else {
                    // Missed during recovery
                    state.recoveryMisses1++;

                    if (state.recoveryMisses1 >= 4 && !state.split1) {
                        // Split 4 streets down to 2 randomly selected streets
                        state.split1 = true;
                        const shuffled = [...state.group1Streets].sort(() => 0.5 - Math.random());
                        state.group1Streets = shuffled.slice(0, 2);
                        state.recoveryBet1 += 5;
                    } else if (state.split1) {
                        state.recoveryBet1 += 5;
                    } else {
                        state.recoveryBet1 += (state.recoveryMisses1 <= 2) ? 2 : 3;
                    }
                }
            }
        }

        // Evaluate Group 2
        if (state.active2) {
            const currentStreets2 = state.group2Streets;
            if (hitsStreetList(lastNum, currentStreets2)) {
                // Group 2 Won -> Remove entire group for next spin
                state.active2 = false;
                state.inRecovery2 = false;
            } else {
                // Group 2 Missed
                if (!state.inRecovery2) {
                    if (state.level2 === 1) state.level2 = 2;
                    else if (state.level2 === 2) state.level2 = 4;
                    else if (state.level2 === 4) {
                        // Enter recovery mode
                        state.inRecovery2 = true;
                        state.recoveryBet2 = 5;
                        state.recoveryMisses2 = 0;
                    }
                } else {
                    // Missed during recovery
                    state.recoveryMisses2++;

                    if (state.recoveryMisses2 >= 4 && !state.split2) {
                        // Split 4 streets down to 2 randomly selected streets
                        state.split2 = true;
                        const shuffled = [...state.group2Streets].sort(() => 0.5 - Math.random());
                        state.group2Streets = shuffled.slice(0, 2);
                        state.recoveryBet2 += 5;
                    } else if (state.split2) {
                        state.recoveryBet2 += 5;
                    } else {
                        state.recoveryBet2 += (state.recoveryMisses2 <= 2) ? 2 : 3;
                    }
                }
            }
        }

        // Reset session if both groups won or profit target hit
        if ((!state.active1 && !state.active2) || bankroll >= state.startBankroll + 30) {
            initSession();
        }
    }

    // Construct Bet Objects
    const bets = [];

    // Place bets for Group 1 if active
    if (state.active1) {
        const multiplier1 = state.inRecovery1 ? state.recoveryBet1 : state.level1;
        let amount1 = Math.max(multiplier1 * minInsideBet, minInsideBet);
        amount1 = Math.min(amount1, maxBet);

        for (const st of state.group1Streets) {
            bets.push({ type: 'street', value: st, amount: amount1 });
        }
    }

    // Place bets for Group 2 if active
    if (state.active2) {
        const multiplier2 = state.inRecovery2 ? state.recoveryBet2 : state.level2;
        let amount2 = Math.max(multiplier2 * minInsideBet, minInsideBet);
        amount2 = Math.min(amount2, maxBet);

        for (const st of state.group2Streets) {
            bets.push({ type: 'street', value: st, amount: amount2 });
        }
    }

    return bets.length > 0 ? bets : null;
}