/**
 * Roulette Strategy: "Guaranteed WIN" (User Modified Variant)
 * 
 * Source: WillVegas (https://www.youtube.com/watch?v=GRMkkZzbYoQ) - Modified by User
 * 
 * The Logic: 
 * Covers 26 numbers on the board with overlapping bets to create "Jackpot" numbers. 
 * Base unit distribution:
 * - 5 units on Line (Double Street) 4-9
 * - 5 units on Line (Double Street) 28-33
 * - 10 units on the 2nd Dozen (13-24)
 * - 1 unit each on 3 corners (5, 17, 29) to create jackpot overlaps
 * - 2 units on 0 (Green insurance)
 * 
 * The Progression: 
 * - After a net loss: Increase each bet by its base unit amount (Base multiplier * progression level).
 * - After a win that does NOT fully recover the bankroll: Stay at the current progression level.
 * - After fully recovering the bankroll (reaching a new high or breaking even): Reset to base bets.
 * 
 * The Goal: 
 * Survive losing streaks and hit overlapping "Jackpot" numbers to quickly recover. 
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on the first spin
    if (state.cycleStartBankroll === undefined) {
        state.cycleStartBankroll = bankroll; 
        state.lastBankroll = bankroll;       
        state.progression = 1;
    }

    // 2. Determine Progression based on the previous spin
    if (spinHistory.length > 0) {
        if (bankroll >= state.cycleStartBankroll) {
            // Fully recovered or made a profit: Reset cycle
            state.cycleStartBankroll = bankroll;
            state.progression = 1;
        } else if (bankroll < state.lastBankroll) {
            // Net loss on the last spin: Increase progression (adds 1 base multiplier to all bets)
            state.progression++;
        }
        // If won but haven't fully recovered, progression stays exactly the same
    }

    state.lastBankroll = bankroll;

    // 3. Helper to calculate and clamp bet amounts
    function getAmount(baseMultiplier, isOutside) {
        const minInside = config.betLimits.min;
        const baseAmount = baseMultiplier * minInside;
        
        // Increase bet by its exact base amount for each progression level
        let amount = baseAmount * state.progression;

        const minLimit = isOutside ? config.betLimits.minOutside : config.betLimits.min;
        return Math.min(Math.max(amount, minLimit), config.betLimits.max);
    }

    // 4. Build the Bets Array
    let bets = [];

    // Line (Double Street) 4-9 (5 base units)
    bets.push({ type: 'line', value: 4, amount: getAmount(5, false) });
    
    // Line (Double Street) 28-33 (5 base units)
    bets.push({ type: 'line', value: 28, amount: getAmount(5, false) });
    
    // 2nd Dozen 13-24 (10 base units)
    bets.push({ type: 'dozen', value: 2, amount: getAmount(10, true) });
    
    // Jackpot Corner 1: Top-left 5 (covers 5, 6, 8, 9) - Overlaps with 4-9 line
    bets.push({ type: 'corner', value: 5, amount: getAmount(1, false) });
    
    // Jackpot Corner 2: Top-left 17 (covers 17, 18, 20, 21) - Overlaps with 2nd Dozen
    bets.push({ type: 'corner', value: 17, amount: getAmount(1, false) });
    
    // Jackpot Corner 3: Top-left 29 (covers 29, 30, 32, 33) - Overlaps with 28-33 line
    bets.push({ type: 'corner', value: 29, amount: getAmount(1, false) });
    
    // Green Insurance: 0 (2 base units)
    bets.push({ type: 'number', value: 0, amount: getAmount(2, false) });

    return bets;
}