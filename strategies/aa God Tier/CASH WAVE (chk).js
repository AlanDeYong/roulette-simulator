/**
 * Strategy: Cashwave Roulette (User Modified V3)
 * Source: Bet With Mo (https://www.youtube.com/watch?v=vA8AzI7ok_0)
 * * Logic:
 * 1. Peak Tracking: At the start of a session, the current bankroll is set as the 'Peak'.
 * 2. Goal: Reach an additional $20 profit above that 'Peak'.
 * 3. Reset: When the $20 target is achieved, reset progression and switch dozens (1st <-> 3rd).
 * 4. Win (No Target): If a win occurs but the bankroll is still below Peak + $20, REBET only.
 * 5. Loss Progression: 
 * - Loss 1: Add new C/DS positions, then DOUBLE all bets.
 * - Loss 2: Add 2u to a new Corner, then INCREASE all by 1u.
 * - Loss 3: Increase all by 1u.
 * - Loss 4 & 5: Double all.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;

    // 1. Initialize State
    if (state.side === undefined) {
        state.side = '1st';
        state.lossCount = 0;
        state.peakBankroll = bankroll; // This is the "Last Peak" we measure against
        state.activeBets = {}; 
        state.lastBankroll = bankroll;
    }

    // 2. Evaluate Profit Goal & Reset Logic
    const profitAbovePeak = bankroll - state.peakBankroll;

    if (profitAbovePeak >= 20) {
        // TARGET ACHIEVED: Reset and Switch
        state.side = (state.side === '1st') ? '3rd' : '1st';
        state.lossCount = 0;
        state.activeBets = {}; 
        state.peakBankroll = bankroll; // The new bankroll becomes the new peak for the next $20 cycle
    }

    // 3. Handle Progression based on Last Spin
    if (spinHistory.length > 0) {
        if (bankroll < state.lastBankroll) {
            // LOSS: Advance progression
            state.lossCount++;
            applyProgression(state);
        } else if (bankroll > state.lastBankroll) {
            // WIN: If we haven't hit the +20 target yet, we "Rebet Only"
            // We do NOT reset lossCount or activeBets here.
        }
    }

    // 4. Initial Setup for the Dozen
    if (Object.keys(state.activeBets).length === 0) {
        if (state.side === '1st') {
            state.activeBets = { 'corner_2': 1, 'line_7': 1 };
        } else {
            state.activeBets = { 'corner_32': 1, 'line_25': 1 };
        }
    }

    // 5. Progression Logic Function
    function applyProgression(s) {
        if (s.side === '1st') {
            if (s.lossCount === 1) {
                s.activeBets['corner_14'] = (s.activeBets['corner_14'] || 0) + 1;
                s.activeBets['line_19'] = (s.activeBets['line_19'] || 0) + 1;
                for (let key in s.activeBets) s.activeBets[key] *= 2;
            } else if (s.lossCount === 2) {
                s.activeBets['corner_26'] = (s.activeBets['corner_26'] || 0) + 2;
                for (let key in s.activeBets) s.activeBets[key] += 1;
            } else if (s.lossCount === 3) {
                for (let key in s.activeBets) s.activeBets[key] += 1;
            } else if (s.lossCount === 4 || s.lossCount === 5) {
                for (let key in s.activeBets) s.activeBets[key] *= 2;
            }
        } else { // 3rd Dozen Logic
            if (s.lossCount === 1) {
                s.activeBets['corner_20'] = (s.activeBets['corner_20'] || 0) + 1;
                s.activeBets['line_13'] = (s.activeBets['line_13'] || 0) + 1;
                for (let key in s.activeBets) s.activeBets[key] *= 2;
            } else if (s.lossCount === 2) {
                s.activeBets['corner_8'] = (s.activeBets['corner_8'] || 0) + 2;
                for (let key in s.activeBets) s.activeBets[key] += 1;
            } else if (s.lossCount === 3) {
                for (let key in s.activeBets) s.activeBets[key] += 1;
            } else if (s.lossCount === 4 || s.lossCount === 5) {
                for (let key in s.activeBets) s.activeBets[key] *= 2;
            }
        }
    }

    // 6. Convert State to Bet Objects
    const finalBets = [];
    for (let key in state.activeBets) {
        const [type, value] = key.split('_');
        let amount = state.activeBets[key] * unit;
        
        // Ensure within table limits
        amount = Math.min(amount, config.betLimits.max);
        
        if (amount > 0) {
            finalBets.push({
                type: type,
                value: parseInt(value),
                amount: amount
            });
        }
    }

    state.lastBankroll = bankroll;

    // Check if bankroll covers the total bet
    const totalRequired = finalBets.reduce((sum, b) => sum + b.amount, 0);
    return (totalRequired <= bankroll && totalRequired > 0) ? finalBets : null;
}