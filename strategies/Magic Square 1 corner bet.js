/**
 * Source: https://youtu.be/F8GYTvj5zzg (TeKKa Tools & Tallk)
 *
 * Logic: 
 * Tracks the "loss level" (spins since last hit) for all 23 possible 4-pocket bets 
 * (22 standard corners + 1 basket bet covering 0,1,2,3). 
 * When the "oldest" corner (the one that hasn't hit for the longest time) reaches 
 * a loss level of 30 spins, the strategy triggers and begins betting on that specific corner.
 * It locks onto this corner and continues to bet on it until it hits.
 * 
 * Progression: 
 * Uses a precise "1-Spin Recovery" progression system. The payout for a corner is 8:1. 
 * The system tracks total losses incurred during the current attack. 
 * The next bet size is calculated to recover all previous losses plus gain at least 
 * 1 unit of profit: Next Bet = Math.ceil((Total Losses + 1) / 8).
 * Because of the 8:1 leverage, the bet size stays very low for a long time (e.g. 1 unit for the first 8 spins).
 * 
 * Goal: 
 * Capitalize on high-payout/low-coverage math. The goal is to secure at least 1 unit of 
 * profit per sequence while enduring deep "cold" streaks without breaking the bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const TRIGGER_LEVEL = 30;
    const PAYOUT = 8;
    const baseUnit = config.betLimits.min;

    // 1. Initialize tracking state
    if (!state.initialized) {
        state.corners = [
            // The European basket bet covers 0, 1, 2, 3
            { type: 'basket', value: 0, numbers: [0, 1, 2, 3], lastHit: 0 }
        ];
        
        // Generate the 22 standard European corners
        for (let r = 0; r < 11; r++) {
            let n1 = r * 3 + 1; // Left column number
            state.corners.push({ type: 'corner', value: n1, numbers: [n1, n1 + 1, n1 + 3, n1 + 4], lastHit: 0 });
            
            let n2 = r * 3 + 2; // Middle column number
            state.corners.push({ type: 'corner', value: n2, numbers: [n2, n2 + 1, n2 + 3, n2 + 4], lastHit: 0 });
        }
        
        state.processedSpins = 0;
        state.activeCorner = null;
        state.totalLosses = 0; // Tracked in base units
        state.lastBetUnits = 0;
        state.initialized = true;
    }

    // 2. Catch up and process historical spins
    // Using a while loop ensures we safely process imported data histories accurately
    while (state.processedSpins < spinHistory.length) {
        let spin = spinHistory[state.processedSpins];
        let num = spin.winningNumber;
        let spinIndex = state.processedSpins + 1;
        
        // Update the lastHit index for any corner covering the winning number
        for (let c of state.corners) {
            if (c.numbers.includes(num)) {
                c.lastHit = spinIndex;
            }
        }
        
        // Resolve active progression if we were betting
        if (state.activeCorner) {
            if (state.activeCorner.numbers.includes(num)) {
                // Hit the targeted corner! Reset progression to wait for the next setup
                state.activeCorner = null;
                state.totalLosses = 0;
                state.lastBetUnits = 0;
            } else {
                // Missed. Add the units from the last spin to our total accumulated losses
                state.totalLosses += state.lastBetUnits;
            }
        }
        
        state.processedSpins++;
    }

    // 3. Find a target corner if we don't have an active one
    if (!state.activeCorner) {
        let currentSpinIndex = spinHistory.length;
        let maxLossLevel = -1;
        let oldestCorner = null;
        
        // Find the "oldest" corner across the entire board
        for (let c of state.corners) {
            let lossLevel = currentSpinIndex - c.lastHit;
            if (lossLevel > maxLossLevel) {
                maxLossLevel = lossLevel;
                oldestCorner = c;
            }
        }
        
        // If the coldest corner meets the trigger requirement, start the attack
        if (maxLossLevel >= TRIGGER_LEVEL) {
            // Lock in the choice so we don't switch targets mid-progression
            state.activeCorner = {
                type: oldestCorner.type,
                value: oldestCorner.value,
                numbers: oldestCorner.numbers
            };
            state.totalLosses = 0;
            state.lastBetUnits = 0;
        }
    }

    // 4. Calculate bet and place it
    let bets = [];
    if (state.activeCorner) {
        // Calculate units needed for 1-spin recovery + 1 minimum unit profit
        let nextBetUnits = Math.ceil((state.totalLosses + 1) / PAYOUT);
        
        // Failsafe: Always bet at least 1 unit
        if (nextBetUnits < 1) nextBetUnits = 1;
        
        // Save to state so it can be added to totalLosses if the next spin loses
        state.lastBetUnits = nextBetUnits;
        
        let amount = nextBetUnits * baseUnit;
        
        // Clamp to table limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        bets.push({
            type: state.activeCorner.type,
            value: state.activeCorner.value,
            amount: amount
        });
    }

    return bets;
}