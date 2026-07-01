/**
 * SURVIVOR ROULETTE STRATEGY (Vertical Splits Only)
 * 
 * Source: https://www.youtube.com/watch?v=ow5RwEMeTxY (The Roulette Master / John Lewis)
 * 
 * The Full Logic in details:
 * - Placements: 1 unit on the Zero (0), and 3 random, non-overlapping VERTICAL splits inside each of the 3 dozens. Total of 10 bets.
 * - Base Level Win: If a split hits while at the base bet level, it is removed and a new random, non-overlapping vertical split is generated in the same dozen.
 * - Loss: If the spin results in a complete miss, the strategy enters a "loss progression."
 * - Win After Loss (Jackpot Creation): If a split hits *after* entering the progression, the bet is removed, and its entire wager amount is placed straight-up on the single number in that split that did *not* hit. This creates a high-payout "Jackpot Number."
 * - Jackpot Hit: If a Jackpot number (or the Zero) hits during the progression, that bet is cleared entirely.
 * 
 * The Full Bet Progression in details:
 * - Base bet is 1 unit (config.betLimits.min).
 * - After a spin that misses completely, increase the unit size of ALL active bets by 1.
 * - When a "Jackpot Number" is created, it inherits the exact unit size of the split it was converted from.
 * - The unit size does NOT reset until a new session profit high is reached.
 * 
 * The Goal:
 * - Endure long losing streaks by absorbing variance and creating high-leverage "Jackpot Numbers."
 * - The session resets to baseline immediately when the bankroll exceeds the highest recorded session bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Helper to determine if a specific bet won the last spin
    const isWin = (b, num) => {
        if (b.type === 'number') return b.value === num;
        if (b.type === 'split') return b.value.includes(num);
        return false;
    };

    // Generates ONLY vertical splits for a given dozen
    const getAllVerticalSplitsForDozen = (dozen) => {
        const splits = [];
        const start = (dozen - 1) * 12 + 1;
        const end = dozen * 12;
        for (let i = start; i <= end; i++) {
            // Vertical split only (e.g., 1 & 4, 2 & 5)
            if (i + 3 <= end) splits.push([i, i + 3]);
        }
        return splits;
    };

    // Returns an array of all numbers currently covered by active bets in a specific dozen
    const getCoveredNumbers = (activeBets, dozen) => {
        let covered = [];
        activeBets.filter(b => b.dozen === dozen).forEach(b => {
            if (Array.isArray(b.value)) covered.push(...b.value);
            else covered.push(b.value);
        });
        return covered;
    };

    // Picks a random vertical split that does not overlap with any currently covered numbers
    const getRandomNonOverlappingVerticalSplit = (activeBets, dozen) => {
        const covered = getCoveredNumbers(activeBets, dozen);
        const allSplits = getAllVerticalSplitsForDozen(dozen);
        
        // Filter out any split that contains a number already covered
        const validSplits = allSplits.filter(split => !split.some(num => covered.includes(num)));
        
        if (validSplits.length === 0) return null; // Failsafe
        
        // Randomly select one of the valid splits
        const randomIndex = Math.floor(Math.random() * validSplits.length);
        return validSplits[randomIndex];
    };

    // Helper to initialize the baseline Survivor state with random vertical non-overlapping splits
    const initializeState = () => {
        state.hasLost = false;
        state.activeBets = [
            { id: 'z1', type: 'number', value: 0, units: 1, dozen: 0 }
        ];
        
        let idCounter = 1;
        for (let dozen = 1; dozen <= 3; dozen++) {
            for (let i = 0; i < 3; i++) {
                const newSplit = getRandomNonOverlappingVerticalSplit(state.activeBets, dozen);
                if (newSplit) {
                    state.activeBets.push({
                        id: `d${dozen}_${idCounter++}`,
                        type: 'split',
                        value: newSplit,
                        units: 1,
                        dozen: dozen
                    });
                }
            }
        }
    };

    // 1. Initial Setup & Profit Reset Checking
    if (typeof state.referenceBankroll === 'undefined') {
        state.referenceBankroll = bankroll;
        initializeState();
    } else if (bankroll > state.referenceBankroll) {
        // Reset when a new session high is achieved
        state.referenceBankroll = bankroll;
        initializeState();
    }

    // 2. Evaluate Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let anyWin = false;
        state.activeBets.forEach(b => { if (isWin(b, lastNum)) anyWin = true; });

        if (!anyWin) {
            // LOSS: Increase all active bets by 1 unit
            state.hasLost = true;
            state.activeBets.forEach(b => b.units += 1);
        } else {
            // WIN: Process the hit bets
            let nextBets = [];
            
            for (let b of state.activeBets) {
                if (isWin(b, lastNum)) {
                    if (state.hasLost) {
                        // We are in progression: Convert to Jackpot or Clear
                        if (b.type === 'split') {
                            const unhitNumber = b.value.find(n => n !== lastNum);
                            nextBets.push({
                                id: b.id,
                                type: 'number',
                                value: unhitNumber,
                                units: b.units,
                                dozen: b.dozen
                            });
                        }
                        // If it was a 'number' (a jackpot or 0), it is intentionally 
                        // NOT pushed to nextBets, completely clearing it from the board.
                    } else {
                        // Base level win (No losses yet)
                        if (b.type === 'split') {
                            // Find a new random vertical non-overlapping split
                            const otherBets = state.activeBets.filter(bet => bet.id !== b.id);
                            const newSplit = getRandomNonOverlappingVerticalSplit(otherBets, b.dozen);
                            
                            if (newSplit) {
                                b.value = newSplit;
                            }
                            nextBets.push(b);
                        } else {
                            // Zero hit at base level, keep it
                            nextBets.push(b);
                        }
                    }
                } else {
                    // Bet didn't hit, keep it on the board
                    nextBets.push(b);
                }
            }
            state.activeBets = nextBets;
        }
    }

    // 3. Format Output and Clamp to Config Limits
    const finalBets = [];
    
    // Safety check: if board gets completely cleared by hitting all jackpots, force reset.
    if (state.activeBets.length === 0) {
        state.referenceBankroll = bankroll;
        initializeState();
    }

    const baseUnitAmount = config.betLimits.min; 

    for (let b of state.activeBets) {
        let amount = b.units * baseUnitAmount;

        // Apply clamping based on config limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        finalBets.push({
            type: b.type,
            value: b.value,
            amount: amount
        });
    }

    return finalBets;
}