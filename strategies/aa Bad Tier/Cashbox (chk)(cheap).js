/**
 * ============================================================================
 * CASH BOX ROULETTE STRATEGY
 * ============================================================================
 * 
 * @source  YouTube: "CASH BOX ROULETTE RULES!" 
 *          URL: https://youtu.be/M3gskaS5wyc
 *          Channel: The Roulette Master
 * 
 * @description
 * The Cash Box Strategy by Jason is a structured dozen and double-street recovery
 * system designed to navigate drawdowns without aggressive Martingale doubling.
 * It starts on a single cold dozen, expands to two dozens upon a miss, and then
 * narrows down into a "Cash Box" (a 6-number double street / six-line) if a dozen
 * recovery hit is insufficient to achieve session profit.
 * 
 * @logic
 * 1. Initial Trigger (Coldest Dozen):
 *    - Determine which dozen (1-12, 13-24, or 25-36) has gone the longest without hitting.
 *    - Place 1 unit on that cold dozen.
 * 
 * 2. Progression & Phase Transitions:
 *    - Phase 1 (Single Dozen):
 *      - Bet 1 unit on the chosen dozen.
 *      - WIN -> Reset to base bet on the newest coldest dozen.
 *      - LOSS -> Expand to TWO dozens (the original dozen + the other unhit dozen,
 *        excluding the one that just hit). Set bet size to (initial bet + 1 unit) on each.
 * 
 *    - Phase 2 (Two Dozens):
 *      - Bet equal amounts on both active dozens.
 *      - LOSS -> Add +1 unit to each dozen.
 *      - WIN -> Remove the winning dozen. Keep the remaining dozen at its current 
 *        per-dozen stake and transition to Single Dozen Recovery.
 * 
 *    - Phase 3 (Recovery Single Dozen):
 *      - Bet on the single remaining dozen.
 *      - LOSS -> Add +1 unit to the dozen bet.
 *      - WIN -> If in session profit (bankroll >= highestBankroll), reset to start.
 *        If NOT in profit, enter the "Cash Box" (Double Street): Take 50% of the
 *        dozen bet and place it on the OTHER 6-line inside that dozen that didn't hit.
 * 
 *    - Phase 4 (Double Street / Six-Line):
 *      - Bet on the 6 numbers (Line 1, 7, 13, 19, 25, or 31).
 *      - LOSS -> Increase the 6-line bet by +1 unit per spin.
 *      - WIN -> The strategy explicitly forbids dropping below 6 numbers. Reset
 *        completely back to Phase 1 at base unit.
 * 
 * @goal
 * Protect bankroll during losing streaks via linear unit increments (+1 unit)
 * while targeting consistent session profits and recovering drawdowns.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and incremental settings
    const baseUnit = config.betLimits.minOutside || 10;
    const increment = config.minIncrementalBet || baseUnit;

    // Helper: Clamping utility respecting table limits
    function clamp(amount, isInside) {
        const minLimit = isInside ? config.betLimits.min : config.betLimits.minOutside;
        return Math.max(minLimit, Math.min(amount, config.betLimits.max));
    }

    // Helper: Identify which dozen a number belongs to (1, 2, 3, or 0 for zeros)
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    }

    // Helper: Identify the coldest dozen from spin history
    function getColdestDozen(history) {
        const lastSeen = { 1: -1, 2: -1, 3: -1 };
        for (let i = history.length - 1; i >= 0; i--) {
            const d = getDozen(history[i].winningNumber);
            if (d > 0 && lastSeen[d] === -1) {
                lastSeen[d] = history.length - 1 - i;
            }
        }
        let maxDrought = -1;
        let coldest = 1;
        for (let d = 1; d <= 3; d++) {
            const drought = lastSeen[d] === -1 ? Infinity : lastSeen[d];
            if (drought > maxDrought) {
                maxDrought = drought;
                coldest = d;
            }
        }
        return coldest;
    }

    // Helper: Map a winning number in a dozen to the opposite double street (six-line)
    function getOppositeLine(dozen, hitNum) {
        if (dozen === 1) {
            return (hitNum >= 1 && hitNum <= 6) ? 7 : 1;
        } else if (dozen === 2) {
            return (hitNum >= 13 && hitNum <= 18) ? 19 : 13;
        } else {
            return (hitNum >= 25 && hitNum <= 30) ? 31 : 25;
        }
    }

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.highestBankroll = bankroll;
        state.stage = 'COLD_DOZEN'; // 'COLD_DOZEN', 'TWO_DOZENS', 'RECOVERY_DOZEN', 'DOUBLE_STREET'
        state.currentDozens = [getColdestDozen(spinHistory)];
        state.dozenBet = baseUnit;
        state.currentLine = null;
        state.lineBet = 0;
    }

    // Track peak bankroll
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    // 3. Process the last spin result (if available)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const hitDozen = getDozen(lastNum);

        // Check if session profit target reached
        if (bankroll >= state.highestBankroll && state.stage !== 'COLD_DOZEN') {
            state.stage = 'COLD_DOZEN';
            state.currentDozens = [getColdestDozen(spinHistory)];
            state.dozenBet = baseUnit;
            state.currentLine = null;
        } else if (state.stage === 'COLD_DOZEN') {
            const targetDozen = state.currentDozens[0];
            if (hitDozen === targetDozen) {
                // Win on cold dozen -> reset to coldest dozen
                state.currentDozens = [getColdestDozen(spinHistory)];
                state.dozenBet = baseUnit;
            } else {
                // Loss -> Expand to 2 dozens (the active dozen + the other unhit dozen)
                const allDozens = [1, 2, 3];
                let secondDozen;
                if (hitDozen !== 0) {
                    secondDozen = allDozens.find(d => d !== targetDozen && d !== hitDozen);
                } else {
                    secondDozen = allDozens.find(d => d !== targetDozen);
                }
                state.stage = 'TWO_DOZENS';
                state.currentDozens = [targetDozen, secondDozen];
                state.dozenBet = baseUnit * 2;
            }
        } else if (state.stage === 'TWO_DOZENS') {
            const wonDozen = state.currentDozens.find(d => d === hitDozen);
            if (wonDozen) {
                // One of the two dozens won -> Drop the winning dozen, keep the remaining dozen
                const remainingDozen = state.currentDozens.find(d => d !== wonDozen);
                state.stage = 'RECOVERY_DOZEN';
                state.currentDozens = [remainingDozen];
                // Dozen bet amount remains at current unit level
            } else {
                // Loss on both dozens -> increase both by +1 unit
                state.dozenBet += increment;
            }
        } else if (state.stage === 'RECOVERY_DOZEN') {
            const targetDozen = state.currentDozens[0];
            if (hitDozen === targetDozen) {
                // Won recovery dozen
                if (bankroll >= state.highestBankroll) {
                    // Session profit reached -> Reset
                    state.stage = 'COLD_DOZEN';
                    state.currentDozens = [getColdestDozen(spinHistory)];
                    state.dozenBet = baseUnit;
                } else {
                    // Not in profit -> Cut box in half to Double Street (Six-Line)
                    state.stage = 'DOUBLE_STREET';
                    state.currentLine = getOppositeLine(targetDozen, lastNum);
                    state.lineBet = Math.max(config.betLimits.min, Math.round(state.dozenBet / 2));
                }
            } else {
                // Loss -> increment dozen bet by +1 unit
                state.dozenBet += increment;
            }
        } else if (state.stage === 'DOUBLE_STREET') {
            // Check if six-line hit (line covers 6 numbers starting from currentLine)
            const lineStart = state.currentLine;
            const isLineWin = (lastNum >= lineStart && lastNum <= lineStart + 5);

            if (isLineWin) {
                // Double Street won -> Strategy rules dictate reset back to base level
                state.stage = 'COLD_DOZEN';
                state.currentDozens = [getColdestDozen(spinHistory)];
                state.dozenBet = baseUnit;
                state.currentLine = null;
            } else {
                // Loss -> increment line bet by +1 unit
                state.lineBet += increment;
            }
        }
    }

    // 4. Construct Bet Placements
    const bets = [];

    if (state.stage === 'COLD_DOZEN' || state.stage === 'RECOVERY_DOZEN') {
        bets.push({
            type: 'dozen',
            value: state.currentDozens[0],
            amount: clamp(state.dozenBet, false)
        });
    } else if (state.stage === 'TWO_DOZENS') {
        for (const d of state.currentDozens) {
            bets.push({
                type: 'dozen',
                value: d,
                amount: clamp(state.dozenBet, false)
            });
        }
    } else if (state.stage === 'DOUBLE_STREET') {
        bets.push({
            type: 'line',
            value: state.currentLine,
            amount: clamp(state.lineBet, true)
        });
    }

    return bets;
}