/**
 * SURVIVOR ROULETTE STRATEGY (Variation: 37-Spin Observation for Hottest Splits)
 * 
 * Source: https://www.youtube.com/watch?v=ow5RwEMeTxY (The Roulette Master / John Lewis)
 * 
 * The Full Logic in details:
 * - Observation Period: Wait 37 spins without betting to determine the frequency of all numbers.
 * - Placements: 1 unit on the Zero (0), and 3 non-overlapping splits inside each of the 3 dozens. 
 *   These splits are selected by finding the "hottest" available splits based on the last 37 spins.
 * - Base Level Win: If a split hits while at the base bet level, it is removed and a new 
 *   hottest, non-overlapping split is generated in the same dozen based on the rolling 37-spin history.
 * - Loss: If the spin results in a complete miss, the strategy enters a "loss progression."
 * - Win After Loss (Jackpot Creation): If a split hits *after* entering the progression, the bet 
 *   is removed, and its entire wager amount is placed straight-up on the single number in that 
 *   split that did *not* hit. This creates a high-payout "Jackpot Number."
 * - Jackpot Hit: If a Jackpot number (or the Zero) hits during the progression, that bet is cleared entirely.
 * 
 * The Full Bet Progression in details:
 * - Base bet is 1 unit (config.betLimits.min).
 * - After a spin that misses completely, increase the unit size of ALL active bets by 1.
 * - When a "Jackpot Number" is created, it inherits the exact unit size of the split it was converted from.
 * - The unit size does NOT reset until a new session profit high is reached.
 * 
 * The Goal:
 * - Endure long losing streaks by absorbing variance with hot-number coverage, creating high-leverage 
 *   "Jackpot Numbers", and resetting when the session profit high is breached.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Period (Wait for 37 spins)
    if (spinHistory.length < 37) {
        return []; 
    }

    // Helper to determine if a specific bet won the last spin
    const isWin = (b, num) => {
        if (b.type === 'number') return b.value === num;
        if (b.type === 'split') return b.value.includes(num);
        return false;
    };

    // Calculate frequencies from the provided spins array
    const getFrequencies = (spins) => {
        const freqs = {};
        // Accommodate 0-36 (and 37 if '00' is mapped that way in some systems)
        for (let i = 0; i <= 37; i++) freqs[i] = 0;
        spins.forEach(spin => {
            if (spin.winningNumber !== undefined) freqs[spin.winningNumber]++;
        });
        return freqs;
    };

    // Generates all valid standard splits (horizontal & vertical) for a given dozen
    const getAllSplitsForDozen = (dozen) => {
        const splits = [];
        const start = (dozen - 1) * 12 + 1;
        const end = dozen * 12;
        for (let i = start; i <= end; i++) {
            if (i % 3 !== 0) splits.push([i, i + 1]);
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

    // Picks the hottest split that does not overlap with any currently covered numbers
    const getHottestNonOverlappingSplit = (activeBets, dozen, currentFreqs) => {
        const covered = getCoveredNumbers(activeBets, dozen);
        const allSplits = getAllSplitsForDozen(dozen);
        
        // Filter out any split that contains a number already covered
        const validSplits = allSplits.filter(split => !split.some(num => covered.includes(num)));
        
        if (validSplits.length === 0) return null; // Failsafe
        
        // Sort by combined frequency (hottest first)
        validSplits.sort((a, b) => {
            const scoreA = currentFreqs[a[0]] + currentFreqs[a[1]];
            const scoreB = currentFreqs[b[0]] + currentFreqs[b[1]];
            return scoreB - scoreA;
        });

        // Return the absolute hottest valid split
        return validSplits[0];
    };

    // Calculate rolling frequencies for the last 37 spins
    const recentSpins = spinHistory.slice(-37);
    const freqs = getFrequencies(recentSpins);

    // Helper to initialize the baseline Survivor state using hot splits
    const initializeState = () => {
        state.hasLost = false;
        state.activeBets = [
            { id: 'z1', type: 'number', value: 0, units: 1, dozen: 0 }
        ];
        
        let idCounter = 1;
        for (let dozen = 1; dozen <= 3; dozen++) {
            for (let i = 0; i < 3; i++) {
                const newSplit = getHottestNonOverlappingSplit(state.activeBets, dozen, freqs);
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

    // 2. Initial Setup & Profit Reset Checking
    if (typeof state.referenceBankroll === 'undefined') {
        state.referenceBankroll = bankroll;
        initializeState();
    } else if (bankroll > state.referenceBankroll) {
        // Reset when a new session high is achieved
        state.referenceBankroll = bankroll;
        initializeState();
    }

    // 3. Evaluate Previous Spin
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
                            // Find a new hot non-overlapping split
                            const otherBets = state.activeBets.filter(bet => bet.id !== b.id);
                            const newSplit = getHottestNonOverlappingSplit(otherBets, b.dozen, freqs);
                            
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

    // 4. Format Output and Clamp to Config Limits
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