/**
 * Strategy: 5x5 Double Streets (Follow the Winner)
 * Source: WillVegas (https://youtu.be/9oVqbZIAR_U)
 * * Logic:
 * - The strategy plays 5 out of 6 "Double Streets" (also known as Line bets, covering 6 numbers each).
 * - This covers 30 numbers, giving roughly a 79% - 80% win rate per spin on a double-zero wheel.
 * - Selection Method: "Follow the Winner". The strategy looks at the recent spin history and covers 
 * the 5 double streets that have hit most recently. The 1 double street that has been "coldest" 
 * (hasn't hit in the longest time) is left empty.
 * * Bet Progression:
 * - Uses a 3-Level Progression designed for a specific bankroll ratio (e.g., $280 bankroll for a $1 base unit).
 * - Level 1: 1 unit per double street (Total cost: 5 units).
 * - Level 2: 5 units per double street (Total cost: 25 units) - triggered after a Level 1 loss.
 * - Level 3: 50 units per double street (Total cost: 250 units) - triggered after a Level 2 loss.
 * - Any win resets the progression back to Level 1.
 * - A loss at Level 3 resets the progression back to Level 1 (acts as a stop-loss for the sequence).
 * * Goal:
 * - Target profit is 50 units (e.g., $50 on $1 base). The strategy will stop betting once reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State & Target Profit
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.level = 0; // Progression levels: 0, 1, 2
    }
    
    const unit = config.betLimits.min; 
    const targetProfit = 50000 * unit;
    
    // Stop betting if we've hit our session goal
    if (bankroll >= state.initialBankroll + targetProfit) {
        return []; 
    }

    // 2. Progression Update (Check win/loss of last spin)
    const multipliers = [1, 5, 50];
    
    if (spinHistory.length > 0 && state.lastBetLines) {
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
    }
    
    // 3. Selection Logic ("Follow the Winner")
    const allLines = [1, 7, 13, 19, 25, 31];
    let recentLines = [];
    
    // Look back through history to find the 5 most recently hit double streets
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        let num = spinHistory[i].winningNumber;
        if (num === 0 || num === '00') continue; // Ignore zeroes for tracking lines
        
        let lineStart = Math.floor((num - 1) / 6) * 6 + 1;
        if (!recentLines.includes(lineStart)) {
            recentLines.push(lineStart);
        }
        if (recentLines.length === 5) break;
    }
    
    // Fill remaining spots if history is too short (e.g., start of session)
    for (let line of allLines) {
        if (recentLines.length === 5) break;
        if (!recentLines.includes(line)) {
            recentLines.push(line);
        }
    }
    
    state.lastBetLines = recentLines;
    
    // 4. Calculate Bet Amount & Clamp
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
    
    // 5. Generate Bets
    let bets = [];
    for (let line of recentLines) {
        bets.push({ type: 'line', value: line, amount: amount });
    }
    
    return bets;
}