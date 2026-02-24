/**
 * STRATEGY: Rolling 37 Hot/Cold Progression
 * * Source: Custom User Modification
 * * The Logic: Observes 37 spins to build a frequency map. On the first active spin, 
 * bets 1 base unit on the hottest number. On subsequent losses, recalculates the hot 
 * numbers using the rolling window of the last 37 spins. It maintains existing bets, 
 * adds a bet on the street of the last winning number, and adds a straight-up bet 
 * on the hottest number NOT currently being bet straight-up.
 * * The Progression: This accumulation continues for 9 consecutive losses (Levels 2-10). 
 * On the 10th loss and beyond (Level 11+), it performs the normal additions, but THEN 
 * increases the size of EVERY active bet on the table by 1 base unit. Resets on profit.
 * * The Goal: Achieve a net session profit. When the bankroll exceeds the reference 
 * high-water mark, the board clears and the cycle restarts.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Phase: Wait for 37 spins
    if (spinHistory.length < 37) {
        return [];
    }

    // 2. Initialize State & Reset on Profit
    if (state.referenceBankroll === undefined || bankroll > state.referenceBankroll) {
        state.referenceBankroll = Math.max(bankroll, state.referenceBankroll || 0);
        state.activeBets = {};
        state.level = 1;
        // If we just won, we don't bet this spin to evaluate the new state, 
        // or we can immediately place the Level 1 bet. We will place the Level 1 bet.
    }

    const baseUnit = config.betLimits.min;

    // 3. Calculate Hot Numbers (Rolling last 37 spins)
    const last37 = spinHistory.slice(-37);
    const frequencies = Array(37).fill(0);
    last37.forEach(spin => frequencies[spin.winningNumber]++);
    
    // Create sorted array of objects: [{number: 5, count: 4}, ...]
    let hotNumbers = frequencies.map((count, number) => ({ number, count }));
    // Sort descending by count. Tie-breaker: naturally higher number
    hotNumbers.sort((a, b) => b.count - a.count || b.number - a.number);

    // Helper: Add or create a bet
    const addBet = (type, value, amount) => {
        const key = `${type}_${value}`;
        if (!state.activeBets[key]) {
            state.activeBets[key] = { type, value, amount: 0 };
        }
        state.activeBets[key].amount += amount;
    };

    // 4. Progression Logic
    if (state.level === 1) {
        // First Bet: 1 unit on the hottest number
        addBet('number', hotNumbers[0].number, baseUnit);
    } else {
        // Levels 2+: Loss logic
        const lastHit = spinHistory[spinHistory.length - 1].winningNumber;

        // A. Add street of last hit
        if (lastHit === 0) {
            addBet('basket', 0, baseUnit); // Map 0 to basket
        } else {
            const streetStart = Math.ceil(lastHit / 3) * 3 - 2;
            addBet('street', streetStart, baseUnit);
        }

        // B. Add straight up on hottest number NOT currently bet
        for (let i = 0; i < hotNumbers.length; i++) {
            const num = hotNumbers[i].number;
            if (!state.activeBets[`number_${num}`]) {
                addBet('number', num, baseUnit);
                break; // Found the next available hot number, exit loop
            }
        }

        // C. Global Increment if we are past the 9th loss (Level 11+)
        if (state.level > 10) {
            for (let key in state.activeBets) {
                state.activeBets[key].amount += baseUnit;
            }
        }
    }

    // Advance Level for the next spin (if it loses)
    state.level++;

    // 5. Compile and Clamp Bets
    let finalBets = [];
    for (let key in state.activeBets) {
        let currentBet = state.activeBets[key];
        let clampedAmount = Math.max(currentBet.amount, config.betLimits.min);
        clampedAmount = Math.min(clampedAmount, config.betLimits.max);
        
        finalBets.push({
            type: currentBet.type,
            value: currentBet.value,
            amount: clampedAmount
        });
    }

    return finalBets;
}