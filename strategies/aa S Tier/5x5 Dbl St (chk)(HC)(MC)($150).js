/**
 * Strategy: 5x5 Double Streets (Hot Numbers Modification)
 * Source: Adapted from WillVegas (https://youtu.be/9oVqbZIAR_U)
 * * Logic:
 * - The strategy waits for the first 37 spins to gather data before placing any bets.
 * - It analyzes all past spins to calculate the frequencies of the 6 double streets (Lines).
 * - It bets on the 5 double streets that have been the "hottest" (most frequently hit).
 * - The selection of these 5 hottest lines is recalculated AFTER EVERY RESET (i.e., immediately after a win, 
 *   or after a Level 3 stop-loss reset) using the updated past spin history.
 * * Bet Progression:
 * - Uses a 3-Level Progression:
 * - Level 1: 1x unit per double street (Total cost: 5 units).
 * - Level 2: 5x units per double street (Total cost: 25 units) - triggered after a Level 1 loss.
 * - Level 3: 50x units per double street (Total cost: 250 units) - triggered after a Level 2 loss.
 * - Any win resets the progression back to Level 1.
 * - A loss at Level 3 resets the progression back to Level 1.
 * * Goal:
 * - Target profit is 50 units (e.g., $50 on $1 base). Stop betting once reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Phase: Wait for 37 spins to determine hot numbers
    if (spinHistory.length < 37) {
        return [];
    }

    // 2. Initialize State & Target Profit
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.level = 0; // Progression levels: 0, 1, 2
        state.didBetLastSpin = false;
    }
    
    const unit = config.betLimits.min; 
    const targetProfit = 50000 * unit;
    
    // Stop betting if we've hit our session goal
    if (bankroll >= state.initialBankroll + targetProfit) {
        return []; 
    }

    // 3. Progression Update (Check win/loss of last spin if a bet was placed)
    const multipliers = [1, 5, 50];
    
    if (state.didBetLastSpin && state.lastBetLines) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let won = false;
        if (lastNum !== 0 && lastNum !== '00') {
            const lastLineStart = Math.floor((lastNum - 1) / 6) * 6 + 1;
            if (state.lastBetLines.includes(lastLineStart)) {
                won = true;
            }
        }
        
        if (won) {
            state.level = 0; // Reset after a win
        } else {
            state.level++; // Escalate after a loss
            if (state.level >= multipliers.length) {
                state.level = 0; // Reset if we fail at Level 3
            }
        }
        
        state.didBetLastSpin = false; 
    }
    
    // 4. Selection Logic ("Hottest Numbers") - Triggered only on reset (Level 0)
    if (state.level === 0 || !state.lastBetLines) {
        // Track hits for all 6 double streets
        const lineFrequencies = {
            1: 0, 7: 0, 13: 0, 19: 0, 25: 0, 31: 0
        };
        
        // Use all past spins to determine hot lines
        for (let i = 0; i < spinHistory.length; i++) {
            let num = spinHistory[i].winningNumber;
            if (num === 0 || num === '00') continue; // Zeroes do not contribute to lines
            
            let lineStart = Math.floor((num - 1) / 6) * 6 + 1;
            lineFrequencies[lineStart]++;
        }
        
        // Sort the lines based on frequency (descending)
        const sortedLines = Object.keys(lineFrequencies)
            .sort((a, b) => lineFrequencies[b] - lineFrequencies[a])
            .map(Number);
            
        // Select the top 5 hottest non-overlapping double streets
        state.lastBetLines = sortedLines.slice(0, 5);
    }
    
    // 5. Calculate Bet Amount & Clamp
    let amount = unit * multipliers[state.level];
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);
    
    // Safety check: ensure bankroll can cover 5 bets at this level
    if (bankroll < amount * 5) {
        if (bankroll >= unit * 5) {
            amount = unit; // Fallback to base unit
            state.level = 0; // Force reset
        } else {
            return []; // Bankroll depleted
        }
    }
    
    // 6. Generate Bets
    let bets = [];
    for (let line of state.lastBetLines) {
        bets.push({ type: 'line', value: line, amount: amount });
    }
    
    state.didBetLastSpin = true;
    return bets;
}