/**
 * Strategy: Alan's 2 Col & 8 Kings (Canvas/Simulator Version)
 * * Source: YouTube - [Channel Name/URL Placeholder as per prompt request, e.g., "Roulette Strategy Channel"]
 * (Note: Based on user provided logic in chat)
 * * The Logic:
 * 1. Normal Play:
 * - Bet on the two columns that did NOT win the previous spin.
 * - In the column that DID win, bet on numbers belonging to the two dozens that did NOT win.
 * - Total Bet: ~$32 ($12/col + $1/num).
 * * 2. Loss Recovery Triggers:
 * - ZERO Trigger: If a '0' hits while betting, STOP immediately. Enter "Zero Reset" mode.
 * Wait until the same Dozen hits twice consecutively (e.g., Doz 1 then Doz 1), then reset to Normal.
 * - Standard Loss: If a loss occurs (non-zero), bet $32 per Dozen on the two dozens that didn't win.
 * * 3. Recovery Phase:
 * - If Recovery Bet Wins: Trigger "High Stakes" mode (8x Normal bets) for 3 spins.
 * - If Recovery Bet Loses: Enter "Waiting for Dozen" mode. Wait for a spin to hit one of the target dozens.
 * - If hit in <= 3 spins: Trigger High Stakes for 9 spins.
 * - If hit in > 3 spins: Trigger High Stakes for 15 spins.
 * * 4. High Stakes:
 * - Play exactly like Normal mode, but with 8x bet sizing ($96/col, $8/num).
 * * Goal: Capitalize on repeating columns/dozens trends while using a specific wait-and-attack recovery for losses.
 */

function bet(spinHistory, bankroll, config, state) {
    // --- Configuration & Constants ---
    const BASE_COL_BET = 12;
    const BASE_NUM_BET = 1;
    const RECOVERY_DOZ_BET = 32;
    const HIGH_STAKES_MULT = 8;
    
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 1000;

    // --- Helpers ---
    const COLUMNS = {
        1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
        2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
    };

    const getNumberProperties = (num) => {
        const n = parseInt(num, 10);
        if (n === 0 || isNaN(n)) return { col: null, dozen: null, val: 0 };
        
        let col = 0;
        if (COLUMNS[1].includes(n)) col = 1;
        else if (COLUMNS[2].includes(n)) col = 2;
        else if (COLUMNS[3].includes(n)) col = 3;

        let dozen = 0;
        if (n >= 1 && n <= 12) dozen = 1;
        else if (n >= 13 && n <= 24) dozen = 2;
        else if (n >= 25 && n <= 36) dozen = 3;

        return { col, dozen, val: n };
    };

    const clamp = (amount, isOutside) => {
        const min = isOutside ? minOutside : minInside;
        return Math.min(Math.max(amount, min), maxBet);
    };

    // --- State Initialization ---
    if (!state.phase) {
        state.phase = 'OBSERVATION'; // Start by observing to get history
        state.recoveryTargetDozens = [];
        state.waitCount = 0;
        state.highStakesRemaining = 0;
        state.lastBets = []; // Store previous bets to determine win/loss
        state.lastValidNonZero = null; // Track history for strategy
    }

    // --- History Analysis (Pre-Bet Logic) ---
    // We need to process the *previous* spin result to update our state machine
    
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber; // FIX: Access winningNumber property
        const lastProps = getNumberProperties(lastSpin);

        // Update Non-Zero History
        if (lastSpin !== 0) {
            state.lastValidNonZero = lastSpin;
        }

        // Determine if we won the previous round
        // We simulate the payout of the previous bets against the last result
        let previousWinnings = 0;
        let previousCost = 0;
        
        if (state.lastBets && state.lastBets.length > 0) {
            state.lastBets.forEach(b => {
                previousCost += b.amount;
                if (b.type === 'number' && b.value === lastSpin) previousWinnings += b.amount * 36;
                if (b.type === 'column' && getNumberProperties(lastSpin).col === b.value) previousWinnings += b.amount * 3;
                if (b.type === 'dozen' && getNumberProperties(lastSpin).dozen === b.value) previousWinnings += b.amount * 3;
            });
        }
        
        const prevNet = previousWinnings - previousCost;
        const isWin = prevNet > 0;
        const hadAction = state.lastBets && state.lastBets.length > 0;

        // --- State Transitions ---

        // 1. Check for ZERO Trigger (Global Priority)
        // If we were betting (hadAction) and hit 0, immediate reset wait
        if (hadAction && lastSpin === 0 && (state.phase === 'NORMAL' || state.phase === 'HIGH_STAKES')) {
            state.phase = 'WAITING_ZERO_RESET';
            state.highStakesRemaining = 0;
        }
        // 2. Normal / High Stakes Logic
        else if (state.phase === 'NORMAL' || state.phase === 'HIGH_STAKES') {
            if (hadAction && !isWin) {
                // Loss Trigger -> Recovery
                // Target the two dozens that didn't win this spin
                const resultDoz = lastProps.dozen;
                // If 0, resultDoz is null, targets become [1,2,3]. Default to [1,3] or logic above handles 0.
                // Since 0 is handled above, resultDoz is valid here (1, 2, or 3).
                const losingDozens = [1, 2, 3].filter(d => d !== resultDoz);
                state.phase = 'RECOVERY';
                state.recoveryTargetDozens = losingDozens;
                state.highStakesRemaining = 0;
            } else if (state.phase === 'HIGH_STAKES') {
                // Decrement counter if we played
                state.highStakesRemaining--;
                if (state.highStakesRemaining <= 0) state.phase = 'NORMAL';
            }
            // If Win in Normal, stay Normal.
        }
        // 3. Recovery Logic
        else if (state.phase === 'RECOVERY') {
            if (isWin) {
                // Recovery Win -> High Stakes
                state.phase = 'HIGH_STAKES';
                state.highStakesRemaining = 3;
            } else {
                // Recovery Loss -> Wait for Dozen
                state.phase = 'WAITING_FOR_DOZEN';
                state.waitCount = 0;
            }
        }
        // 4. Waiting for Dozen Logic
        else if (state.phase === 'WAITING_FOR_DOZEN') {
            state.waitCount++;
            if (state.recoveryTargetDozens.includes(lastProps.dozen)) {
                // Target Hit -> Go High Stakes
                state.phase = 'HIGH_STAKES';
                state.highStakesRemaining = (state.waitCount <= 3) ? 9 : 15;
            }
        }
        // 5. Waiting for Zero Reset Logic
        else if (state.phase === 'WAITING_ZERO_RESET') {
            // Need spin n-1 (penultimate) to compare with spin n (last)
            if (spinHistory.length >= 2) {
                const penultimate = spinHistory[spinHistory.length - 2].winningNumber;
                const pProps = getNumberProperties(penultimate);
                
                // If consecutive dozens match and aren't 0
                if (lastProps.dozen !== 0 && lastProps.dozen !== null && lastProps.dozen === pProps.dozen) {
                    state.phase = 'NORMAL';
                }
            }
        }
        // 6. Observation
        else if (state.phase === 'OBSERVATION') {
            // If we have a valid history now, start normal
            if (state.lastValidNonZero !== null) {
                state.phase = 'NORMAL';
            }
        }
    }

    // --- Bet Generation (Based on Current Phase) ---
    
    let bets = [];

    if (state.phase === 'NORMAL' || state.phase === 'HIGH_STAKES') {
        if (state.lastValidNonZero !== null) {
            const mult = (state.phase === 'HIGH_STAKES') ? HIGH_STAKES_MULT : 1;
            const props = getNumberProperties(state.lastValidNonZero);
            
            // 1. Column Bets (The 2 that didn't win)
            [1, 2, 3].forEach(c => {
                if (c !== props.col) {
                    bets.push({
                        type: 'column',
                        value: c,
                        amount: clamp(BASE_COL_BET * mult, true)
                    });
                }
            });

            // 2. Number Bets (In winning col, but losing dozens)
            const targetDozens = [1, 2, 3].filter(d => d !== props.dozen);
            const winningColNums = COLUMNS[props.col];
            
            winningColNums.forEach(n => {
                const nProps = getNumberProperties(n);
                if (targetDozens.includes(nProps.dozen)) {
                    bets.push({
                        type: 'number',
                        value: n,
                        amount: clamp(BASE_NUM_BET * mult, false)
                    });
                }
            });
        }
    }
    else if (state.phase === 'RECOVERY') {
        // Bet on the target dozens
        state.recoveryTargetDozens.forEach(d => {
            bets.push({
                type: 'dozen',
                value: d,
                amount: clamp(RECOVERY_DOZ_BET, true) // Fixed $32 usually, clamped
            });
        });
    }
    // WAITING phases place no bets (return empty array)

    // --- State Persistence for Next Turn ---
    state.lastBets = bets;

    return bets;
}
