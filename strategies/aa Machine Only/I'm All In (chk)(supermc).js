/*
 * Strategy: I'm All In (Roger Bennett)
 * Source: https://www.youtube.com/watch?v=ZygTi8G_oWc (The Roulette Master)
 *
 * The Logic: 
 * A progression strategy utilizing strictly inside bets to incrementally expand board coverage.
 * It is designed to prevent catastrophic bankroll depletion by capping the progression rather 
 * than endlessly chasing losses.
 *
 * The Progression:
 * - Level 1: 2 Corner bets (1 base unit each).
 * - Level 2 (Loss): Keep Corners, add 2 Street bets. All bets are now 2 units.
 * - Level 3 (Loss): Keep previous, add 2 Split bets. Existing bets increase to 3 units, new splits are 1 unit.
 * - Level 4 (Loss): Keep previous, add 2 Single bets. Existing bets increase to 4 units, splits to 2 units, new singles are 1 unit.
 * 
 * - On ANY win: The progression resets immediately to Level 1 to lock in the profit.
 * - On a Level 4 loss: A "hard stop" triggers. The progression resets to Level 1, but the base unit is DOUBLED 
 *   to gradually recover the specific drawdown over the next winning cycle.
 *
 * The Goal: 
 * Protect the bankroll from deep wipeouts via a strict 4-step cap, while systematically expanding 
 * hit probabilities and raising wagers incrementally to secure session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (typeof state.level === 'undefined') {
        state.level = 1;
        // Start with $5 base if limits allow, otherwise clamp to minimum
        state.baseUnit = Math.max(config.betLimits.min, 5); 
        state.lastBankroll = bankroll;
        state.highestBankroll = bankroll;
    }

    // 2. Determine Win/Loss for the previous spin
    if (spinHistory.length > 0) {
        // A higher bankroll indicates a payout from the previous spin
        const lastSpinWon = bankroll > state.lastBankroll;
        
        if (lastSpinWon) {
            // Win Condition: Reset progression to lock in profit
            state.level = 1;
            
            // If we've recovered our bankroll or hit a new high, reset the base unit to baseline
            if (bankroll >= state.highestBankroll || bankroll >= config.startingBankroll) {
                state.baseUnit = Math.max(config.betLimits.min, 5);
            }
        } else {
            // Loss Condition: Advance progression to expand coverage
            state.level++;
            
            // Hard Stop condition: If we lost level 4, reset the progression but double the base unit
            if (state.level > 4) {
                state.level = 1;
                state.baseUnit = state.baseUnit * 2;
            }
        }
    }

    // Update bankroll trackers for the next evaluation
    state.lastBankroll = bankroll;
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    // 3. Define the bet placements
    // Fixed positions are used to ensure stable coverage across the layout
    const corners = [4, 26];       // Covers 4,5,7,8 and 26,27,29,30
    const streets = [13, 31];      // Covers 13,14,15 and 31,32,33
    const splits  = [[0, 2], [17, 20]]; // Covers 0/2 and 17/20
    const singles = [10, 22];      // Covers straight numbers 10 and 22

    let bets = [];
    let u = state.baseUnit;

    // Helper function to calculate amounts and strictly clamp to table limits
    const addBet = (type, value, units) => {
        let amount = units * u;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        bets.push({ type, value, amount });
    };

    // 4. Build the bets based on the current progression level
    if (state.level >= 1) {
        let cUnits = state.level; // L1: 1u, L2: 2u, L3: 3u, L4: 4u
        addBet('corner', corners[0], cUnits);
        addBet('corner', corners[1], cUnits);
    }
    
    if (state.level >= 2) {
        let stUnits = state.level; // L2: 2u, L3: 3u, L4: 4u
        addBet('street', streets[0], stUnits);
        addBet('street', streets[1], stUnits);
    }
    
    if (state.level >= 3) {
        let spUnits = state.level - 2; // L3: 1u, L4: 2u
        addBet('split', splits[0], spUnits);
        addBet('split', splits[1], spUnits);
    }
    
    if (state.level >= 4) {
        let sgUnits = state.level - 3; // L4: 1u
        addBet('number', singles[0], sgUnits);
        addBet('number', singles[1], sgUnits);
    }

    return bets;
}