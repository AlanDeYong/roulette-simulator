/*
 * Strategy: Dynamic 7 Street 2 Step (Hot/Cold Sides)
 * Source: Adapted from Stacking Chips (https://www.youtube.com/watch?v=00:00)
 * * The Logic: 
 * 1. Waits for the first 37 spins to gather hot/cold data.
 * 2. Evaluates the last 37 spins to determine the "hotter side" for 7 street bets:
 * - Low Side: Streets starting 1, 4, 7, 10, 13, 16, 19 (Covers numbers 1-21)
 * - High Side: Streets starting 16, 19, 22, 25, 28, 31, 34 (Covers numbers 16-36)
 * 3. Bets are placed on the hotter 7 streets.
 * 4. Upon a cycle reset (profit achieved or safety stop), it checks the last 37 spins 
 * again to pick the newly active hot side.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for 37 spins to gather data
    if (spinHistory.length < 37) {
        return [];
    }

    const unit = config.betLimits.min;

    // Helper function to determine the hotter side based on the last 37 spins
    function getHotterSide() {
        const last37 = spinHistory.slice(-37);
        let lowSideHits = 0;  // Hits for numbers 1-21
        let highSideHits = 0; // Hits for numbers 16-36
        
        last37.forEach(spin => {
            const num = spin.winningNumber;
            if (num >= 1 && num <= 21) lowSideHits++;
            if (num >= 16 && num <= 36) highSideHits++;
        });

        const lowSideStreets = [1, 4, 7, 10, 13, 16, 19];
        const highSideStreets = [16, 19, 22, 25, 28, 31, 34];
        
        // Return the side with the most hits (defaults to low side on a tie)
        return highSideHits > lowSideHits ? highSideStreets : lowSideStreets;
    }

    // Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.cycleProfit = 0;
        state.activeStreets = getHotterSide();
    }

    // Process previous spin only if we have placed bets
    if (state.lastBets && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let wonAmount = 0;
        
        // Calculate payout from the last placed bets
        state.lastBets.forEach(b => {
            if (b.type === 'street') {
                if (lastNum >= b.value && lastNum <= b.value + 2) {
                    wonAmount += b.amount * 12;
                }
            } else if (b.type === 'number') {
                if (lastNum === b.value) {
                    wonAmount += b.amount * 36;
                }
            }
        });

        state.cycleProfit += wonAmount;

        if (wonAmount > 0) {
            if (state.cycleProfit >= 0) {
                // RESET Condition Triggered
                state.level = 1;
                state.cycleProfit = 0;
                state.activeStreets = getHotterSide(); // Check hot/cold numbers again
            }
        } else {
            state.level++;
        }
    }

    // Calculate Bet Amounts
    const streetMultiplier = 1 + (state.level - 1) * 2;
    let streetAmount = unit * streetMultiplier;
    
    // Clamp to table limits
    streetAmount = Math.max(streetAmount, config.betLimits.min);
    streetAmount = Math.min(streetAmount, config.betLimits.max);

    let hedgeAmount = unit;
    hedgeAmount = Math.max(hedgeAmount, config.betLimits.min);
    hedgeAmount = Math.min(hedgeAmount, config.betLimits.max);

    // Safety check
    let totalNeeded = (streetAmount * 7) + (state.level >= 2 ? hedgeAmount : 0);
    if (bankroll < totalNeeded) {
        // RESET Condition Triggered (Bankroll limit hit)
        state.level = 1;
        state.cycleProfit = 0;
        state.activeStreets = getHotterSide(); // Check hot/cold numbers again
        
        streetAmount = unit;
        totalNeeded = (streetAmount * 7);
        if (bankroll < totalNeeded) {
            return [];
        }
    }

    // Construct Bets
    const bets = [];
    const streets = state.activeStreets;

    streets.forEach(streetStart => {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: streetAmount
        });
    });

    // Apply the 0 hedge starting at Level 2
    if (state.level >= 2) {
        bets.push({
            type: 'number',
            value: 0,
            amount: hedgeAmount
        });
    }

    let totalBetCost = 0;
    bets.forEach(b => totalBetCost += b.amount);
    state.cycleProfit -= totalBetCost;
    state.lastBets = bets;

    return bets;
}