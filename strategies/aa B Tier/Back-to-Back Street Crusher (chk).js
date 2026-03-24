/**
 * Source: The Roulette Master (YouTube)
 * Strategy: "Back-to-Back Street Crusher" by Todd Hellrigel
 * * The Logic: 
 * This strategy dynamically places bets on the streets surrounding the last winning number. 
 * If the last number is in Street N, the strategy targets Street N-1 and Street N+1.
 * Edge cases (Wrap-Around): 
 * If the hit is in Street 1 (1-3), it bets Street 12 (34-36) and Street 2 (4-6). 
 * If the hit is in Street 12 (34-36), it bets Street 11 (31-33) and Street 1 (1-3).
 * A static 1-unit "jackpot" bet is permanently placed on 0.
 * * The Progression:
 * - On a LOSS: Do not clear the board. Find the two streets surrounding the *newly hit* * losing number, and add 1 unit to those specific streets.
 * - On a WIN: Add 1 unit to *every* street you currently have active bets on. The 0 bet 
 * remains at its base amount.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    if (spinHistory.length === 0) {
        return [];
    }

    const unit = config.betLimits.min;
    const inc = config.incrementMode === 'base' ? unit : (config.minIncrementalBet || 1);
    
    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.active = false; 
        state.streets = {};   
        state.winsInARow = 0; 
    }

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    
    // Helper to determine the street of a number (1-12)
    function getStreet(num) {
        if (num === 0 || num === '00') return 1;
        let s = Math.ceil(num / 3);
        if (s < 1) s = 1;
        if (s > 12) s = 12;
        return s;
    }

    // Process Win/Loss if we have active bets
    if (state.active) {
        let isWin = false;
        if (lastNum === 0 || lastNum === '00') {
            isWin = true;
        } else {
            const hitStreet = getStreet(lastNum);
            if (state.streets[hitStreet] && state.streets[hitStreet] > 0) {
                isWin = true;
            }
        }

        if (isWin) {
            state.winsInARow++;
            if (state.winsInARow >= 2) {
                state.active = false; 
            } else {
                for (let s in state.streets) {
                    if (state.streets[s] > 0) {
                        state.streets[s] += inc;
                    }
                }
            }
        } else {
            state.winsInARow = 0;
            const hitStreet = getStreet(lastNum);
            
            // Modified wrap-around logic for losses
            let s1 = hitStreet === 1 ? 12 : (hitStreet === 12 ? 11 : hitStreet - 1);
            let s2 = hitStreet === 1 ? 2 : (hitStreet === 12 ? 1 : hitStreet + 1);
            
            state.streets[s1] = (state.streets[s1] || 0) + inc;
            state.streets[s2] = (state.streets[s2] || 0) + inc;
        }
    }

    // Setup initial bets or reset after 2 consecutive wins
    if (!state.active) {
        state.streets = {};
        state.winsInARow = 0;
        const hitStreet = getStreet(lastNum);
        
        // Modified wrap-around logic for new bet cycles
        let s1 = hitStreet === 1 ? 12 : (hitStreet === 12 ? 11 : hitStreet - 1);
        let s2 = hitStreet === 1 ? 2 : (hitStreet === 12 ? 1 : hitStreet + 1);
        
        state.streets[s1] = unit;
        state.streets[s2] = unit;
        state.active = true;
    }

    let bets = [];
    bets.push({ 
        type: 'number', 
        value: 0, 
        amount: Math.min(Math.max(unit, config.betLimits.min), config.betLimits.max) 
    });

    for (let s in state.streets) {
        if (state.streets[s] > 0) {
            let streetNum = parseInt(s);
            let firstNumOfStreet = (streetNum - 1) * 3 + 1;
            let betAmount = state.streets[s];
            betAmount = Math.max(betAmount, config.betLimits.min);
            betAmount = Math.min(betAmount, config.betLimits.max);
            bets.push({
                type: 'street',
                value: firstNumOfStreet,
                amount: betAmount
            });
        }
    }
    return bets;
}