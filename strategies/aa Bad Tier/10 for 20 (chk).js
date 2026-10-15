/**
 * Roulette Strategy: "10 for 20" Recovery Strategy (Randomized Streets)
 * Source: WillVegas (https://www.youtube.com/watch?v=KrP2-NobGB8)
 *
 * The Logic: A high-coverage strategy designed to cover 30 numbers. The board is divided into 
 * two zones (Low 1-18, High 19-36). The strategy places a heavy bet (6 units) on the zone where 
 * the last winning number landed. It then covers 4 of the 6 streets in the opposite zone 
 * (1 unit each). To prevent pattern predictability, the 4 streets are randomly selected from 
 * the available 6 streets in that opposite zone whenever a progression cycle resets.
 * 
 * The Progression: A negative progression designed to hold elevated levels until recovery.
 * - On a loss, the bet escalates based on simulator config ('base' adds initial bet amount, 'fixed' adds minimum increment).
 * - Crucially, on a win, if the total bankroll has not yet recovered to the session's 
 *   high-water mark, the player stays at the current elevated bet level.
 * - The bets only reset to the base level once the session bankroll reaches a new high.
 *
 * The Goal: Designed as a recovery system after a bad run. The goal is to grind out 
 * small, steady profits ($20-$30 per session) with low variance.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to randomly shuffle and pick 4 streets
    const pickRandomStreets = (zone) => {
        const available = zone === 'high' 
            ? [19, 22, 25, 28, 31, 34] 
            : [1, 4, 7, 10, 13, 16];
            
        let copy = [...available];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy.slice(0, 4);
    };

    // 1. Initialize State and Calculate Base Multiplier
    if (state.referenceBankroll === undefined) {
        state.referenceBankroll = bankroll;
        state.lastBankroll = bankroll;
        
        // The strategy relies on a 6:1 ratio between the outside and inside bets.
        // We find the minimum multiplier (M) that satisfies both table minimum limits.
        state.baseMultiplier = Math.max(
            Math.ceil(config.betLimits.minOutside / 6),
            config.betLimits.min
        );
        state.currentMultiplier = state.baseMultiplier;
        state.lastZone = 'low'; // Start with the Low zone by default
        
        // Initialize randomized streets for both scenarios
        state.activeStreetsForLow = pickRandomStreets('high');
        state.activeStreetsForHigh = pickRandomStreets('low');
    }

    // 2. Progression and Zone Logic
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];

        // Track the side of the board the ball is landing on
        if (lastSpin.winningNumber >= 1 && lastSpin.winningNumber <= 18) {
            state.lastZone = 'low';
        } else if (lastSpin.winningNumber >= 19 && lastSpin.winningNumber <= 36) {
            state.lastZone = 'high';
        } // Zeros do not change the zone

        // Bankroll recovery check
        if (bankroll > state.referenceBankroll) {
            // We have achieved a new session profit. Lock it in, reset bets, AND randomize streets.
            state.referenceBankroll = bankroll;
            state.currentMultiplier = state.baseMultiplier;
            
            state.activeStreetsForLow = pickRandomStreets('high');
            state.activeStreetsForHigh = pickRandomStreets('low');
        } else if (bankroll < state.lastBankroll) {
            // We lost the previous spin. Escalate the bet.
            if (config.incrementMode === 'base') {
                state.currentMultiplier += state.baseMultiplier;
            } else {
                let increment = (config.minIncrementalBet !== undefined) ? config.minIncrementalBet : 1;
                state.currentMultiplier += increment;
            }

            // Failsafe to reset if a NaN error still somehow occurs
            if (isNaN(state.currentMultiplier)) {
                state.currentMultiplier = state.baseMultiplier;
            }
        }
        // If bankroll >= state.lastBankroll BUT <= state.referenceBankroll, we won the last spin 
        // but haven't fully recovered yet. The multiplier holds steady at the current elevated rate.
    }

    // 3. Calculate Bet Amounts and Clamp to Limits
    let outsideAmount = 6 * state.currentMultiplier;
    let streetAmount = 1 * state.currentMultiplier;

    outsideAmount = Math.min(Math.max(outsideAmount, config.betLimits.minOutside), config.betLimits.max);
    streetAmount = Math.min(Math.max(streetAmount, config.betLimits.min), config.betLimits.max);

    // Failsafe: Ensure we have enough bankroll to place the escalated bet.
    // If not, reset to the base multiplier so the strategy doesn't permanently stop.
    let totalProposedBet = outsideAmount + (streetAmount * 4);
    if (totalProposedBet > bankroll) {
        state.currentMultiplier = state.baseMultiplier;
        outsideAmount = 6 * state.currentMultiplier;
        streetAmount = 1 * state.currentMultiplier;
        outsideAmount = Math.min(Math.max(outsideAmount, config.betLimits.minOutside), config.betLimits.max);
        streetAmount = Math.min(Math.max(streetAmount, config.betLimits.min), config.betLimits.max);
        
        // If we still can't afford the base bet, return empty to end the session
        if ((outsideAmount + (streetAmount * 4)) > bankroll) return []; 
    }

    // 4. Construct the Bet Array using the randomized state variables
    let bets = [];

    if (state.lastZone === 'low') {
        // Bet heavily on Low (1-18)
        bets.push({ type: 'low', amount: outsideAmount });
        
        // Cover 4 randomly selected streets in the High zone
        state.activeStreetsForLow.forEach(val => {
            bets.push({ type: 'street', value: val, amount: streetAmount });
        });
    } else {
        // Bet heavily on High (19-36)
        bets.push({ type: 'high', amount: outsideAmount });
        
        // Cover 4 randomly selected streets in the Low zone
        state.activeStreetsForHigh.forEach(val => {
            bets.push({ type: 'street', value: val, amount: streetAmount });
        });
    }

    // FIX: Set lastBankroll to the exact start-of-turn bankroll so losses calculate correctly.
    state.lastBankroll = bankroll;

    return bets;
}