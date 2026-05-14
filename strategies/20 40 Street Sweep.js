/*
 * Strategy: $20/$40 Street Sweep
 * Source: Stacking Chips (YouTube)
 * https://youtu.be/A4LiMVI-IX8?si=0J_7cq1-1XbeyJuG
 * The Logic:
 * The strategy places bets entirely on streets (rows of 3 numbers).
 * The goal is to "cluster up 3 sections" and have "about 9 numbers heavily covered" 
 * to cover a large portion of the wheel while leaving a few sections open.
 * Level 1 bets a total of 20 units distributed across 10 streets.
 * Level 2 bets a total of 40 units distributed across the same 10 streets.
 * 
 * The Progression:
 * - Start at Level 1 (20 units total).
 * - If Level 1 wins, progress to Level 2 (40 units total).
 * - If Level 1 loses, reset and stay at Level 1.
 * - After playing Level 2 (whether it's a win or a loss), reset back to Level 1.
 * 
 * The Goal:
 * Generate significant short-term profits with high board coverage, leveraging a positive 
 * progression (increasing bet size after a win) to capitalize on winning streaks, while 
 * strictly risking only the base 20 units per sequence.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min;
    
    // Initialize progression state
    if (!state.level) {
        state.level = 1;
    }
    
    // Determine the outcome of the last spin
    if (spinHistory.length > 0 && state.lastBets) {
        const lastResult = spinHistory[spinHistory.length - 1].winningNumber;
        let won = false;
        
        // Check if the winning number is covered by our street bets
        if (lastResult !== '00' && lastResult !== 0) {
            const num = parseInt(lastResult, 10);
            for (let b of state.lastBets) {
                if (b.type === 'street') {
                    if (num >= b.value && num <= b.value + 2) {
                        won = true;
                        break;
                    }
                }
            }
        }
        
        // Progression Logic
        if (state.level === 1) {
            if (won) {
                state.level = 2; // Move to $40 level after a win
            } else {
                state.level = 1; // Stay at $20 level after a loss
            }
        } else if (state.level === 2) {
            state.level = 1;
        }
    }
    
    const multiplier = state.level === 1 ? 1 : 2;
    
    const layout = [
        { value: 1, units: 2 },
        { value: 7, units: 2 },
        { value: 10, units: 3 }, // heavily covered
        { value: 13, units: 1 },
        { value: 16, units: 3 }, // heavily covered
        { value: 19, units: 2 },
        { value: 25, units: 1 },
        { value: 28, units: 3 }, // heavily covered
        { value: 31, units: 2 },
        { value: 34, units: 1 }
    ];
    
    let bets = [];
    for (let item of layout) {
        let amount = item.units * multiplier * baseUnit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        bets.push({
            type: 'street',
            value: item.value,
            amount: amount
        });
    }
    
    state.lastBets = bets;
    return bets;
}