/**
 * Bob's Street Corner Roulette Strategy
 * * Source: https://youtu.be/D0cxbr7a4ns (The Roulette Master)
 * * The Full Logic in details:
 * The strategy places a combination of Street and Corner inside bets, totaling 17 base units.
 * Specifically, the bet placement is:
 * - 2 units on Street 4 (covers 4, 5, 6)
 * - 3 units on Corner 7 (covers 7, 8, 10, 11)
 * - 2 units on Street 13 (covers 13, 14, 15)
 * - 3 units on Corner 16 (covers 16, 17, 19, 20)
 * - 2 units on Street 22 (covers 22, 23, 24)
 * - 3 units on Corner 25 (covers 25, 26, 28, 29)
 * - 2 units on Street 31 (covers 31, 32, 33)
 * * The Full Bet Progression in details:
 * - On the first loss, the bets are doubled (mathematically identical to increasing by the initial base amount).
 * - On every subsequent loss, the bets continue to increase by their initial base amount.
 * - On a win, the bets do NOT reset and are NOT increased. They remain exactly at the current level to recover the bankroll.
 * - The bets only reset back to the initial 1x base amount when a strict "profit milestone" is reached.
 * - The profit milestone starts at +25 units from the initial bankroll, and increases by 25 units every time a milestone is crossed.
 * * The Goal:
 * The overarching goal is to safely cash out and conclude the session when you hit a global +200 units in profit. 
 * The micro-goals of +25 units per cycle lock in profits systematically and reset the progression to avoid table limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    try {
        // 1. Defensive Config Parsing (Prevents "Cannot read properties of undefined" errors)
        const betLimits = config.betLimits || {};
        const minInside = betLimits.min !== undefined ? betLimits.min : 1;
        const maxBet = betLimits.max !== undefined ? betLimits.max : 500;
        const currentBankroll = Number(bankroll); // Ensure it's treated strictly as a number
        
        const unit = minInside; 

        // 2. Initialize State Tracking variables on the first spin
        if (state.multiplier === undefined) {
            state.multiplier = 1; 
            state.targetBankroll = currentBankroll + 25 * unit; 
            state.lastBankroll = currentBankroll;
        }

        // 3. Process previous spin result and manage progression safely
        if (spinHistory && spinHistory.length > 0) {
            let netProfit = currentBankroll - state.lastBankroll;
            
            // Did we reach or exceed the target profit milestone?
            if (currentBankroll >= state.targetBankroll) {
                // Reset progression back to base level
                state.multiplier = 1; 
                
                // Advance the target milestone safely
                let step = Math.max(25 * unit, 1); // Fallback to 1 to prevent infinite loop
                while (state.targetBankroll <= currentBankroll) {
                    state.targetBankroll += step;
                }
            } else if (netProfit < 0) {
                // A net loss means none of our numbers hit. Increase the progression multiplier.
                state.multiplier++;
            }
        }
        
        // Update lastBankroll to calculate the net profit on the next spin accurately
        state.lastBankroll = currentBankroll;

        // 4. Construct the Bets
        const betsToPlace = [
            { type: 'street', value: 4, baseUnits: 2 },
            { type: 'corner', value: 7, baseUnits: 3 },
            { type: 'street', value: 13, baseUnits: 2 },
            { type: 'corner', value: 16, baseUnits: 3 },
            { type: 'street', value: 22, baseUnits: 2 },
            { type: 'corner', value: 25, baseUnits: 3 },
            { type: 'street', value: 31, baseUnits: 2 }
        ];

        let bets = [];
        for (let b of betsToPlace) {
            let initialBetAmount = b.baseUnits * unit;
            
            // Safe increment checking matching standard limits vs custom config limits
            let increment = initialBetAmount; 
            if (config.incrementMode === 'fixed') {
                increment = config.minIncrementalBet !== undefined ? config.minIncrementalBet : 1;
            }
            
            let rawAmount = initialBetAmount + (state.multiplier - 1) * increment;

            // 5. CLAMP TO LIMITS AND CLEAN (Crucial Requirement)
            let amount = Math.max(rawAmount, minInside);
            amount = Math.min(amount, maxBet);
            amount = Math.floor(amount); // Ensure amounts are always solid integers
            
            // Prevent pushing NaN or 0 amounts which causes simulator rejection
            if (isNaN(amount) || amount <= 0) continue; 
            
            bets.push({ type: b.type, value: b.value, amount: amount });
        }

        return bets;

    } catch (error) {
        // If a fatal crash occurs, do not stall the simulator. Just pass 0 bets.
        if (utils && utils.log) utils.log("Strategy Crash: " + error.message);
        else console.log("Strategy Crash: " + error.message);
        return [];
    }
}