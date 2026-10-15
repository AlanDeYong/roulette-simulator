/**
 * ============================================================================
 * Strategy Name: The "NO BOSS" Roulette System (Mastering The Wheel Version)
 * Source:
 *   - Video: https://youtu.be/NjsnUS5FpA0
 *   - Channel: Mastering The Wheel
 *
 * Full Logic in Detail:
 *   - The strategy tracks streaks across the 3 Dozens and 3 Columns independently.
 *   - Trigger: When any Dozen or Column hits 3 consecutive times, a bet is triggered
 *     on the OTHER TWO dozens or columns (fading the streak).
 *   - Zero Rule: If a zero (0 or 00) hits, all active streak counts reset to 0.
 *   - Independent Groups: Dozen tracking and Column tracking run as independent
 *     progression tracks.
 *
 * Full Bet Progression:
 *   - 2-Step Martingale Recovery for 2:1 Payouts:
 *     * Level 1: 1 unit per position (2 units total bet).
 *       - Win: +1 unit net profit. Reset trigger and progression to Level 1.
 *       - Loss: -2 units. Advance to Level 2.
 *     * Level 2: 3 units per position (6 units total bet).
 *       - Win: +3 units profit - 2 units previous loss = +1 unit net cycle profit. Reset to Level 1.
 *       - Loss: -6 units (total loss of 8 units / $800 with $100 base units). Stop progression and reset.
 *
 * The Goal:
 *   - Profit Target: +$200 (or +2 net cycles) to get in and out quickly.
 *   - Stop-Loss: Complete failure at Level 2 (8 units loss) or when bankroll is depleted.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    // 1. Helper functions to classify winning numbers
    function getDozen(num) {
        if (num === 0 || num === '00') return 0;
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    }

    function getColumn(num) {
        if (num === 0 || num === '00') return 0;
        const rem = num % 3;
        if (rem === 1) return 1;
        if (rem === 2) return 2;
        if (rem === 0) return 3;
        return 0;
    }

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.initialized = true;
        state.startBankroll = bankroll;
        state.targetProfit = 20000; // Fast $200 session target as featured in video
        
        // Base bet per dozen/column position (scaled by outside minimum limit)
        state.baseUnit = Math.max(config.betLimits.minOutside, 100);

        // Independent tracks for dozens and columns
        state.dozenTrack = {
            activeBet: null, // { targets: [d1, d2], level: 1 }
            streakDozen: 0,
            streakCount: 0
        };

        state.columnTrack = {
            activeBet: null, // { targets: [c1, c2], level: 1 }
            streakColumn: 0,
            streakCount: 0
        };

        state.lastProcessedSpinIndex = -1;
    }

    // 3. Stop if Session Target Profit Reached
    if (bankroll >= state.startBankroll + state.targetProfit) {
        return [];
    }

    // 4. Process spins incrementally to maintain exact streak and progression tracking
    const lastSpinIdx = spinHistory.length - 1;
    for (let i = state.lastProcessedSpinIndex + 1; i <= lastSpinIdx; i++) {
        const spin = spinHistory[i];
        const num = spin.winningNumber;
        const winDozen = getDozen(num);
        const winColumn = getColumn(num);

        // --- Evaluate Dozen Track ---
        if (state.dozenTrack.activeBet) {
            const targets = state.dozenTrack.activeBet.targets;
            const isWin = targets.includes(winDozen);

            if (isWin) {
                // Won: Reset trigger and progression
                state.dozenTrack.activeBet = null;
                state.dozenTrack.streakDozen = winDozen;
                state.dozenTrack.streakCount = winDozen > 0 ? 1 : 0;
            } else {
                // Lost: Advance progression or reset on stop-loss
                if (state.dozenTrack.activeBet.level === 1) {
                    state.dozenTrack.activeBet.level = 2;
                } else {
                    // Level 2 lost: Reset progression
                    state.dozenTrack.activeBet = null;
                }
                
                // Update streak counters
                if (winDozen === 0) {
                    state.dozenTrack.streakDozen = 0;
                    state.dozenTrack.streakCount = 0;
                } else if (winDozen === state.dozenTrack.streakDozen) {
                    state.dozenTrack.streakCount++;
                } else {
                    state.dozenTrack.streakDozen = winDozen;
                    state.dozenTrack.streakCount = 1;
                }
            }
        } else {
            // Update Dozen Streaks
            if (winDozen === 0) {
                state.dozenTrack.streakDozen = 0;
                state.dozenTrack.streakCount = 0;
            } else if (winDozen === state.dozenTrack.streakDozen) {
                state.dozenTrack.streakCount++;
                if (state.dozenTrack.streakCount >= 3) {
                    // Trigger: Bet on the other 2 dozens
                    const targets = [1, 2, 3].filter(d => d !== winDozen);
                    state.dozenTrack.activeBet = { targets: targets, level: 1 };
                }
            } else {
                state.dozenTrack.streakDozen = winDozen;
                state.dozenTrack.streakCount = 1;
            }
        }

        // --- Evaluate Column Track ---
        if (state.columnTrack.activeBet) {
            const targets = state.columnTrack.activeBet.targets;
            const isWin = targets.includes(winColumn);

            if (isWin) {
                // Won: Reset trigger and progression
                state.columnTrack.activeBet = null;
                state.columnTrack.streakColumn = winColumn;
                state.columnTrack.streakCount = winColumn > 0 ? 1 : 0;
            } else {
                // Lost: Advance progression or reset on stop-loss
                if (state.columnTrack.activeBet.level === 1) {
                    state.columnTrack.activeBet.level = 2;
                } else {
                    // Level 2 lost: Reset progression
                    state.columnTrack.activeBet = null;
                }

                // Update streak counters
                if (winColumn === 0) {
                    state.columnTrack.streakColumn = 0;
                    state.columnTrack.streakCount = 0;
                } else if (winColumn === state.columnTrack.streakColumn) {
                    state.columnTrack.streakCount++;
                } else {
                    state.columnTrack.streakColumn = winColumn;
                    state.columnTrack.streakCount = 1;
                }
            }
        } else {
            // Update Column Streaks
            if (winColumn === 0) {
                state.columnTrack.streakColumn = 0;
                state.columnTrack.streakCount = 0;
            } else if (winColumn === state.columnTrack.streakColumn) {
                state.columnTrack.streakCount++;
                if (state.columnTrack.streakCount >= 3) {
                    // Trigger: Bet on the other 2 columns
                    const targets = [1, 2, 3].filter(c => c !== winColumn);
                    state.columnTrack.activeBet = { targets: targets, level: 1 };
                }
            } else {
                state.columnTrack.streakColumn = winColumn;
                state.columnTrack.streakCount = 1;
            }
        }
    }

    state.lastProcessedSpinIndex = lastSpinIdx;

    // 5. Generate Bets for the upcoming spin
    const bets = [];

    // Clamp function to enforce table bet limits
    function clampBet(amount) {
        let val = Math.max(amount, config.betLimits.minOutside);
        val = Math.min(val, config.betLimits.max);
        return val;
    }

    // Place Dozen Bets if active
    if (state.dozenTrack.activeBet) {
        const multiplier = state.dozenTrack.activeBet.level === 1 ? 1 : 3;
        const betAmount = clampBet(state.baseUnit * multiplier);

        for (const dozenVal of state.dozenTrack.activeBet.targets) {
            bets.push({
                type: 'dozen',
                value: dozenVal,
                amount: betAmount
            });
        }
    }

    // Place Column Bets if active
    if (state.columnTrack.activeBet) {
        const multiplier = state.columnTrack.activeBet.level === 1 ? 1 : 3;
        const betAmount = clampBet(state.baseUnit * multiplier);

        for (const colVal of state.columnTrack.activeBet.targets) {
            bets.push({
                type: 'column',
                value: colVal,
                amount: betAmount
            });
        }
    }

    return bets;
}