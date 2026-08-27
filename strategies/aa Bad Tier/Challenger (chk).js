/**
 * -----------------------------------------------------------------------------------------
 * STRATEGY NAME: The Challenger Roulette Strategy
 * -----------------------------------------------------------------------------------------
 * Source: 
 *   - Video: "NEVER OUT OF IT WITH CHALLENGER ROULETTE!" (https://youtu.be/6v5FqHYvIyE)
 *   - Channel: The Roulette Master (System submitted by subscriber Charles)
 *
 * The Full Logic in Details:
 *   - The Challenger strategy bets simultaneously on 1 Dozen (1st, 2nd, or 3rd 12) and 
 *     1 Column (1st, 2nd, or 3rd Column) to capitalize on 2:1 outside payouts while 
 *     creating high-payout overlap "Jackpot" target sectors (where both the Dozen and Column hit).
 *   - Trigger & Position Selection:
 *     1. At start (or on reset), inspect past spin history to identify the "coldest" Dozen 
 *        and the "coldest" Column (the ones that have gone the longest without hitting).
 *     2. When a bet on a Dozen or Column wins: That winning position resets back to the base unit,
 *        and moves to the Dozen/Column that has currently gone the longest without hitting.
 *     3. When a bet on a Dozen or Column loses: The position stays locked, and its individual bet 
 *        increases by 1 unit (+base unit).
 *     4. When a Jackpot hits (both Dozen and Column win): Both bets reset to base unit and move 
 *        to the newest coldest Dozen and Column.
 *
 * The Full Bet Progression in Details:
 *   - Independent Positive/Negative Progression per Bet Leg (Dozen Leg & Column Leg):
 *     - Start with 1 Base Unit on the selected Dozen and 1 Base Unit on the selected Column.
 *     - Loss on a leg: Keep position, add 1 unit to that leg's bet amount.
 *     - Win on a leg: Reset that leg's bet amount back to 1 Base Unit, switch to the coldest sector.
 *
 * The Goal:
 *   - Steady profit accumulation via overlapping 2:1 payouts and frequent jackpot double wins.
 * -----------------------------------------------------------------------------------------
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.minOutside || 5;
    const increment = config.minIncrementalBet || baseUnit;

    // Helper functions to map roulette numbers (0-36) to Dozens (1, 2, 3) and Columns (1, 2, 3)
    function getDozen(num) {
        if (num <= 0 || num > 36) return null;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    }

    function getColumn(num) {
        if (num <= 0 || num > 36) return null;
        const mod = num % 3;
        if (mod === 1) return 1;
        if (mod === 2) return 2;
        return 3;
    }

    // Function to find the coldest Dozen or Column
    function findColdest(type, history) {
        const counts = { 1: 999, 2: 999, 3: 999 };
        for (let i = history.length - 1; i >= 0; i--) {
            const num = history[i].winningNumber;
            const sector = type === 'dozen' ? getDozen(num) : getColumn(num);
            if (sector && counts[sector] === 999) {
                counts[sector] = history.length - 1 - i;
            }
        }
        // Return sector with largest spins since last hit
        let maxSpins = -1;
        let coldest = 1;
        for (let s = 1; s <= 3; s++) {
            if (counts[s] > maxSpins) {
                maxSpins = counts[s];
                coldest = s;
            }
        }
        return coldest;
    }

    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.dozenBet = {
            target: findColdest('dozen', spinHistory),
            units: 1
        };
        state.columnBet = {
            target: findColdest('column', spinHistory),
            units: 1
        };
    } else if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const winningDozen = getDozen(winningNum);
        const winningCol = getColumn(winningNum);

        // Evaluate Dozen bet
        if (winningDozen === state.dozenBet.target) {
            // Won Dozen leg
            state.dozenBet.units = 1;
            state.dozenBet.target = findColdest('dozen', spinHistory);
        } else {
            // Lost Dozen leg
            state.dozenBet.units += 1;
        }

        // Evaluate Column bet
        if (winningCol === state.columnBet.target) {
            // Won Column leg
            state.columnBet.units = 1;
            state.columnBet.target = findColdest('column', spinHistory);
        } else {
            // Lost Column leg
            state.columnBet.units += 1;
        }
    }

    // Calculate amounts and clamp to limits
    let dozenAmount = baseUnit + (state.dozenBet.units - 1) * increment;
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    let columnAmount = baseUnit + (state.columnBet.units - 1) * increment;
    columnAmount = Math.max(columnAmount, config.betLimits.minOutside);
    columnAmount = Math.min(columnAmount, config.betLimits.max);

    // Ensure total bet does not exceed available bankroll
    const totalBet = dozenAmount + columnAmount;
    if (bankroll < totalBet) {
        if (bankroll < config.betLimits.minOutside) {
            return []; // Cannot afford minimum bet
        }
        dozenAmount = Math.floor(bankroll / 2);
        columnAmount = Math.floor(bankroll / 2);
    }

    return [
        { type: 'dozen', value: state.dozenBet.target, amount: dozenAmount },
        { type: 'column', value: state.columnBet.target, amount: columnAmount }
    ];
}