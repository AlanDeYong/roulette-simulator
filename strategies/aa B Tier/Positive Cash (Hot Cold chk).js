/**
 * Modified Positive Cash Roulette Strategy (Hot/Cold Dynamic Allocation)
 * * Source: Custom adaptation of "The Roulette Master" Positive Cash system.
 * * The Logic: 
 * 1. Waits for 36 spins to gather data.
 * 2. Calculates frequencies to find the 2 hottest dozens.
 * 3. In those 2 dozens, bets on all numbers EXCEPT "cold" numbers (0 hits in the last 36 spins).
 * 4. Replaces the dropped cold numbers with the hottest numbers from the 3rd (unselected) dozen.
 * * The Progression:
 * - On a LOSS: Do nothing. Bet sizes remain the same.
 * - On a WIN: Remove the winning number from the layout. Increase the bet on all remaining numbers by 1 unit.
 * * The Goal:
 * Resets the cycle (and recalculates hot/cold data from the last 36 spins) when:
 * 1. Cycle profit hits >= 25 base units.
 * 2. Active covered numbers drop to 12 or fewer.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Wait for the statistical window to fill
    if (spinHistory.length < 36) {
        return []; 
    }

    const unit = config.betLimits.min;
    const profitTarget = 25 * unit;
    const lastSpin = spinHistory[spinHistory.length - 1];

    // 1. Initialize overall state if first run
    if (!state.initialized) {
        state.initialized = true;
        state.activeBets = null; // null indicates we need to generate a new layout
    }

    // 2. Process previous spin result if we have active bets
    if (state.activeBets) {
        const winNum = lastSpin.winningNumber;
        
        // Did we win?
        if (state.activeBets.hasOwnProperty(winNum)) {
            // Remove the winning number from layout
            delete state.activeBets[winNum];
            
            // Increase all remaining numbers by 1 unit
            for (let num in state.activeBets) {
                state.activeBets[num] += unit;
            }
        } 
        // On loss: do nothing.

        // 3. Check Reset Conditions
        const currentProfit = bankroll - state.cycleStartBankroll;
        const numbersCovered = Object.keys(state.activeBets).length;

        if (currentProfit >= profitTarget || numbersCovered <= 12) {
            state.activeBets = null; // Trigger a reset
        }
    }

    // 4. Generate New Layout based on Last 36 Spins (First cycle or after reset)
    if (!state.activeBets) {
        state.cycleStartBankroll = bankroll;
        state.activeBets = {};

        // A. Calculate Frequencies
        const freqs = {};
        for (let i = 1; i <= 36; i++) freqs[i] = 0;
        
        const startIdx = spinHistory.length - 36;
        for (let i = startIdx; i < spinHistory.length; i++) {
            const num = spinHistory[i].winningNumber;
            if (num >= 1 && num <= 36) {
                freqs[num]++;
            }
        }

        // B. Rank Dozens
        const dozScores = { 1: 0, 2: 0, 3: 0 };
        for (let i = 1; i <= 36; i++) {
            const dozen = Math.ceil(i / 12);
            dozScores[dozen] += freqs[i];
        }

        const sortedDozens = [1, 2, 3].sort((a, b) => dozScores[b] - dozScores[a]);
        const top2Dozens = [sortedDozens[0], sortedDozens[1]];
        const bottomDozen = sortedDozens[2];

        // C. Filter Top 2 Dozens (Remove Cold Numbers)
        let coldCount = 0;
        
        for (let i = 1; i <= 36; i++) {
            const dozen = Math.ceil(i / 12);
            if (top2Dozens.includes(dozen)) {
                if (freqs[i] === 0) {
                    coldCount++; // It's cold, drop it
                } else {
                    state.activeBets[i] = unit; // It's hot/warm, keep it
                }
            }
        }

        // D. Replace with Hottest from Bottom Dozen
        let bottomDozenNums = [];
        for (let i = 1; i <= 36; i++) {
            if (Math.ceil(i / 12) === bottomDozen) {
                bottomDozenNums.push(i);
            }
        }
        
        // Sort bottom dozen numbers by frequency descending
        bottomDozenNums.sort((a, b) => freqs[b] - freqs[a]);

        // Take the top N hottest numbers to replace the dropped cold numbers
        // Math.min prevents out-of-bounds if coldCount is somehow > 12
        const replacementCount = Math.min(coldCount, 12); 
        for (let i = 0; i < replacementCount; i++) {
            const numToAdd = bottomDozenNums[i];
            state.activeBets[numToAdd] = unit;
        }
    }

    // 5. Format and clamp bets for the simulator output
    let currentBets = [];
    
    for (let numStr in state.activeBets) {
        let amount = state.activeBets[numStr];
        amount = Math.min(amount, config.betLimits.max); // Clamp to limit
        
        currentBets.push({
            type: 'number',
            value: parseInt(numStr, 10),
            amount: amount
        });
    }

    return currentBets;
}