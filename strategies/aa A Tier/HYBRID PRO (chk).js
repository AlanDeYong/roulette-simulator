/**
 * Strategy: Hybrid Pro (Corrected)
 * Source: https://www.youtube.com/watch?v=aDR_3rZAE1U (Bet With Mo)
 * * * The Logic:
 * A heavily structured inside-bet strategy targeting a single dozen, with a straight-up bet on 0.
 * Within the chosen dozen, the base layout covers two double streets (lines) and specific vertical 
 * splits ([2,3], [5,6], [8,9] pattern). The strategy anchors to a single dozen until a $20 net 
 * profit is accumulated, at which point it shifts to the next sequential dozen.
 * * * The Progression:
 * - Win: Reset to Level 1.
 * - Small Loss (Payout received but less than total bet): Rebet exact same amounts, spin again.
 * - Complete Loss: Follow a 7-level progression:
 * - Level 1: 1x base unit on target dozen.
 * - Level 2: Rebet 1x base unit on target dozen + 1x base unit on adjacent dozen + add 1 unit to Zero.
 * - Level 3: Revert to single target dozen, increase all bets by 1x base unit (multiplier = 2).
 * - Level 4: Single dozen, increase all bets by 1x base unit (multiplier = 3).
 * - Level 5: Single dozen, increase all bets by 1x base unit (multiplier = 4).
 * - Level 6: Single dozen, double all bets from previous level (multiplier = 8).
 * - Level 7: Single dozen, double all bets from previous level (multiplier = 16).
 * - Loss at Level 7: Hard reset to Level 1 to prevent absolute bankroll ruin.
 * * * The Goal:
 * Safely grind $20 profit increments by distributing coverage and recovering losses through a 
 * highly structured, multi-tier progression scale.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.targetBankroll === undefined) state.targetBankroll = bankroll + 20;
    if (state.baseDozen === undefined) state.baseDozen = 0; // 0 = D1, 1 = D2, 2 = D3
    if (state.level === undefined) state.level = 1;

    // 2. Evaluate Previous Spin (Win, Small Loss, Complete Loss)
    let isSmallLoss = false;

    if (spinHistory.length > 0 && state.lastBankroll !== undefined) {
        const netChange = bankroll - state.lastBankroll;

        if (netChange > 0) {
            // Net Profit -> Win
            state.level = 1;
            
            // Check Profit Target ($20 increments)
            if (bankroll >= state.targetBankroll) {
                state.targetBankroll = bankroll + 20;
                state.baseDozen = (state.baseDozen + 1) % 3; // Shift to next dozen
            }
        } else if (netChange < 0 && netChange > -state.lastTotalBet) {
            // Net loss, but recovered some capital -> Small Loss
            isSmallLoss = true;
        } else if (netChange <= -state.lastTotalBet) {
            // Total wipe on the spin -> Complete Loss
            state.level++;
            if (state.level > 7) state.level = 1; // Stop-loss reset
        }
    }

    // 3. Handle Small Loss (Rebet exact same layout)
    if (isSmallLoss && state.lastBets) {
        state.lastBankroll = bankroll;
        return state.lastBets; // Uses the already-clamped bets from the previous spin
    }

    // 4. Bet Construction Variables
    const unit = config.betLimits.min;
    let bets = [];
    let zeroAmt = 0;

    // Helper to generate the exact pattern for a given dozen
    const addDozenBets = (dozenIndex, multiplier) => {
        const startNum = (dozenIndex * 12) + 1;
        
        // 2 units on first double street
        bets.push({ type: 'line', value: startNum, amount: 2 * multiplier * unit });
        // 3 units on second double street
        bets.push({ type: 'line', value: startNum + 6, amount: 3 * multiplier * unit });
        
        // Vertical splits matching [2,3], [5,6], [8,9] pattern relative to the dozen
        bets.push({ type: 'split', value: [startNum + 1, startNum + 2], amount: 1 * multiplier * unit });
        bets.push({ type: 'split', value: [startNum + 4, startNum + 5], amount: 1 * multiplier * unit });
        bets.push({ type: 'split', value: [startNum + 7, startNum + 8], amount: 1 * multiplier * unit });
    };

    // 5. Apply Progression Logic
    if (state.level === 1) {
        addDozenBets(state.baseDozen, 1);
        zeroAmt = 1 * unit;

    } else if (state.level === 2) {
        // Level 2: Base dozen + Adjacent dozen + Extra zero unit
        addDozenBets(state.baseDozen, 1);
        
        let adjDozen = 0;
        if (state.baseDozen === 0) adjDozen = 1;      // D1 -> add D2
        else if (state.baseDozen === 2) adjDozen = 1; // D3 -> add D2
        else {
            // On D2: Add to the dozen that did NOT win the last spin
            const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            if (lastNum >= 1 && lastNum <= 12) adjDozen = 2; // D1 won last, place on D3
            else if (lastNum >= 25 && lastNum <= 36) adjDozen = 0; // D3 won last, place on D1
            else adjDozen = 0; // Default fallback if 0 hit
        }
        
        addDozenBets(adjDozen, 1);
        zeroAmt = 2 * unit;

    } else if (state.level === 3) {
        addDozenBets(state.baseDozen, 2); // +1x base unit
        zeroAmt = 2 * unit;
    } else if (state.level === 4) {
        addDozenBets(state.baseDozen, 3); // +1x base unit
        zeroAmt = 3 * unit;
    } else if (state.level === 5) {
        addDozenBets(state.baseDozen, 4); // +1x base unit
        zeroAmt = 4 * unit;
    } else if (state.level === 6) {
        addDozenBets(state.baseDozen, 8); // Double up from L5
        zeroAmt = 8 * unit;
    } else if (state.level === 7) {
        addDozenBets(state.baseDozen, 16); // Double up from L6
        zeroAmt = 16 * unit;
    }

    // Straight up bet on 0
    bets.push({ type: 'number', value: 0, amount: zeroAmt });

    // 6. Clamp to Limits & Finalize State
    bets = bets.map(b => {
        b.amount = Math.min(b.amount, config.betLimits.max);
        b.amount = Math.max(b.amount, config.betLimits.min);
        return b;
    });

    state.lastBets = bets;
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    state.lastBankroll = bankroll;

    return bets;
}