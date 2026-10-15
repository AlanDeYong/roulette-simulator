/**
 * The Boss Roulette Strategy
 * 
 * Source: https://youtu.be/TW1nqmlyrRA (Junko Bodie)
 * 
 * Full Logic in Details:
 * - Dozen Selection: Randomly targets one of the three dozens (1st, 2nd, or 3rd dozen).
 * - Split Placements (Spines):
 *   - 1st Dozen: 8 splits ([1,2], [2,3], [4,5], [5,6], [7,8], [8,9], [10,11], [11,12]). Hedges on Streets 13, 16.
 *   - 2nd Dozen: 8 splits ([13,14], [14,15], [16,17], [17,18], [19,20], [20,21], [22,23], [23,24]). Hedges on Streets 10, 25.
 *   - 3rd Dozen: 8 splits ([25,26], [26,27], [28,29], [29,30], [31,32], [32,33], [34,35], [35,36]). Hedges on Streets 19, 22.
 * - Win & Removal Rules:
 *   - Split Hit (Inside Target Dozen):
 *     - 1st Column Hit: Remove all split bets touching the 1st column.
 *     - 3rd Column Hit: Remove all split bets touching the 3rd column.
 *     - 2nd Column Hit: Randomly remove splits touching either 1st or 3rd column.
 *   - Street Hit (Outside Hedge Street):
 *     - Remove ONLY the winning street bet. Do NOT remove any split bets.
 *   - Spine Reset Rule: On any win, reset ALL remaining active splits (spines) back to 2 units each.
 * - Reset Condition:
 *   - When ALL splits in the targeted dozen are eliminated (`state.activeSplits.length === 0`), 
 *     the target dozen cycle is complete and resets immediately to pick a fresh dozen at 1 unit on the next spin.
 * 
 * Full Bet Progression in Details:
 * - Start: 1 unit on all active splits and street hedges.
 * - Loss Progression (Initial Phase):
 *   - Loss 1: Increase all street bets by +1 unit.
 *   - Loss 2: Increase all active bets (splits and streets) by +1 unit.
 *   - Loss 3: Increase all street bets by +1 unit.
 *   - Loss 4: Increase all street bets by +1 unit, increase all active splits by +2 units.
 *   - Loss 5+: Increase all active bets by +1 unit per loss.
 * - Post-Win Loss Progression:
 *   - Increase each remaining active bet by +1 unit per loss.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and limits
    const minUnit = config.betLimits ? config.betLimits.min : 1;
    const maxBet = config.betLimits ? config.betLimits.max : 500;

    function clamp(amount) {
        return Math.min(Math.max(amount, minUnit), maxBet);
    }

    // Helper functions for column detection
    function getColumn(num) {
        if (num === 0) return 0;
        if (num % 3 === 1) return 1;
        if (num % 3 === 2) return 2;
        return 3;
    }

    function isStreetHit(num, streetStart) {
        return num >= streetStart && num <= streetStart + 2;
    }

    // Helper function to initialize a new dozen round
    function initializeNewDozen() {
        const dozenChoice = Math.floor(Math.random() * 3) + 1; // Randomly select 1, 2, or 3
        state.targetDozen = dozenChoice;
        state.lossStreak = 0;
        state.mode = 'initial'; // 'initial' or 'postWin'

        if (dozenChoice === 1) {
            state.activeSplits = [
                [1, 2], [2, 3], [4, 5], [5, 6],
                [7, 8], [8, 9], [10, 11], [11, 12]
            ];
            state.activeStreets = [13, 16];
        } else if (dozenChoice === 2) {
            state.activeSplits = [
                [13, 14], [14, 15], [16, 17], [17, 18],
                [19, 20], [20, 21], [22, 23], [23, 24]
            ];
            state.activeStreets = [10, 25];
        } else {
            state.activeSplits = [
                [25, 26], [26, 27], [28, 29], [29, 30],
                [31, 32], [32, 33], [34, 35], [35, 36]
            ];
            state.activeStreets = [19, 22];
        }

        state.splitAmounts = {};
        state.activeSplits.forEach(s => {
            state.splitAmounts[s.join('-')] = minUnit;
        });

        state.streetAmounts = {};
        state.activeStreets.forEach(st => {
            state.streetAmounts[st] = minUnit;
        });

        state.initialized = true;
    }

    // 2. Initialize State if fresh run
    if (!state.initialized || !state.activeSplits) {
        initializeNewDozen();
    }

    // 3. Process Spin History
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const col = getColumn(winningNum);

        // Check split hits (inside target dozen)
        let hitSplit = false;
        state.activeSplits.forEach(s => {
            if (s.includes(winningNum)) {
                hitSplit = true;
            }
        });

        // Check street hits (hedge streets)
        let hitStreet = null;
        state.activeStreets.forEach(st => {
            if (isStreetHit(winningNum, st)) {
                hitStreet = st;
            }
        });

        const isWin = hitSplit || (hitStreet !== null);

        if (isWin) {
            state.lossStreak = 0;
            state.mode = 'postWin';

            // IF A SPLIT HIT: Remove splits based on column hit
            if (hitSplit) {
                let colToRemove = null;
                if (col === 1) colToRemove = 1;
                else if (col === 3) colToRemove = 3;
                else if (col === 2) colToRemove = Math.random() < 0.5 ? 1 : 3;

                if (colToRemove !== null) {
                    state.activeSplits = state.activeSplits.filter(s => {
                        const hasCol1 = getColumn(s[0]) === 1 || getColumn(s[1]) === 1;
                        const hasCol3 = getColumn(s[0]) === 3 || getColumn(s[1]) === 3;
                        if (colToRemove === 1 && hasCol1) return false;
                        if (colToRemove === 3 && hasCol3) return false;
                        return true;
                    });
                }
            }

            // IF A STREET HIT: Remove ONLY the winning street
            if (hitStreet !== null) {
                state.activeStreets = state.activeStreets.filter(st => st !== hitStreet);
            }

            // CHECK RESET CONDITION: If all splits in target dozen are eliminated, reset immediately for next spin
            if (state.activeSplits.length === 0) {
                initializeNewDozen();
            } else {
                // Reset remaining active splits to 2 units each on win
                const resetSpineUnit = minUnit * 2;
                state.activeSplits.forEach(s => {
                    const key = s.join('-');
                    state.splitAmounts[key] = resetSpineUnit;
                });

                // Set remaining active streets to 3 units (2 base + 1 increment) on win
                state.activeStreets.forEach(st => {
                    state.streetAmounts[st] = (minUnit * 2) + minUnit;
                });
            }

        } else {
            // Process Loss Progression
            state.lossStreak += 1;

            if (state.mode === 'initial') {
                if (state.lossStreak === 1) {
                    state.activeStreets.forEach(st => {
                        state.streetAmounts[st] += minUnit;
                    });
                } else if (state.lossStreak === 2) {
                    state.activeStreets.forEach(st => {
                        state.streetAmounts[st] += minUnit;
                    });
                    state.activeSplits.forEach(s => {
                        const key = s.join('-');
                        state.splitAmounts[key] += minUnit;
                    });
                } else if (state.lossStreak === 3) {
                    state.activeStreets.forEach(st => {
                        state.streetAmounts[st] += minUnit;
                    });
                } else if (state.lossStreak === 4) {
                    state.activeStreets.forEach(st => {
                        state.streetAmounts[st] += minUnit;
                    });
                    state.activeSplits.forEach(s => {
                        const key = s.join('-');
                        state.splitAmounts[key] += minUnit * 2;
                    });
                } else {
                    state.activeStreets.forEach(st => {
                        state.streetAmounts[st] += minUnit;
                    });
                    state.activeSplits.forEach(s => {
                        const key = s.join('-');
                        state.splitAmounts[key] += minUnit;
                    });
                }
            } else if (state.mode === 'postWin') {
                state.activeStreets.forEach(st => {
                    state.streetAmounts[st] += minUnit;
                });
                state.activeSplits.forEach(s => {
                    const key = s.join('-');
                    state.splitAmounts[key] += minUnit;
                });
            }
        }
    }

    // 4. Construct Bet Array
    const bets = [];

    state.activeSplits.forEach(s => {
        const key = s.join('-');
        bets.push({
            type: 'split',
            value: s,
            amount: clamp(state.splitAmounts[key] || minUnit)
        });
    });

    state.activeStreets.forEach(st => {
        bets.push({
            type: 'street',
            value: st,
            amount: clamp(state.streetAmounts[st] || minUnit)
        });
    });

    return bets;
}