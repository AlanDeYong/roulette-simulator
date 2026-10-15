/**
 * Strategy: Gary's GOAT (Corrected Progression - Non-Overlapping)
 * Source: https://youtu.be/Q632YYv3lmc (The Roulette Master)
 * 
 * The Full Logic in details:
 * - The strategy uses a dynamic combination of the Basket bet (0,1,2,3) and randomly added Double Street (Line) bets.
 * - To ensure non-overlapping bets, Line 1 (1-6) is excluded since it overlaps with the Basket. 
 * - The available Double Streets are: 7, 13, 19, 25, 31 (Max 5 Double Streets).
 * - Bets are added incrementally upon consecutive losses up to the maximum of 5 Double Streets.
 * - Once a win occurs, if the bankroll is at a new peak, the entire system resets to base.
 * - If a win occurs but the bankroll is not at a peak (Recovery Mode), the winning double street is removed 
 *   (provided at least 2 double streets remain), and 2 units are added to each remaining double street bet.
 * 
 * The Full Bet Progression in details:
 * - Start: 1 unit on Basket (0, 1, 2, 3).
 * - Loss 1: Add a random Double Street at 1 unit.
 * - Loss 2: Add a random Double Street, all bets double to 2 units.
 * - Loss 3: Add a random Double Street, all bets double to 4 units.
 * - Loss 4: Add a random Double Street at 4 units (All bets are 4 units).
 * - Loss 5+ (or loss in Recovery): Increase ALL bets by 2 units. If under 5 Double Streets, add a new one matching the current unit size. 
 * - If any Double Street reaches 20+ units, increase ALL bets by 4 units instead of 2.
 * - Recovery Win (Not at peak): Remove the winning Double Street (retaining at least 2). Add 2 units to remaining Double Streets.
 * 
 * The Goal: 
 * - Target profit: Reach a new session peak bankroll (high-water mark). Once reached, reset to the base stage.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit (inside bets)
    const baseUnit = config.betLimits.min;

    // Helper: Pick a random unused double street (line)
    // Excludes line 1 (1-6) to ensure it does not overlap with the basket (0,1,2,3)
    const getUnusedLine = (currentPositions) => {
        const allLines = [7, 13, 19, 25, 31]; // Max 5 non-overlapping lines
        const usedLines = currentPositions.filter(p => p.type === 'line').map(p => p.value);
        const available = allLines.filter(l => !usedLines.includes(l));
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    };

    // 2. Initialize State
    if (!state.initialized) {
        state.targetBankroll = bankroll;
        state.stage = 0; 
        state.recoveryMode = false;
        state.positions = [{ type: 'basket', value: 0, units: 1 }];
        state.initialized = true;
    }

    // 3. Process Previous Spin Outcome
    if (spinHistory.length > 0 && state.lastBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Helper to check if a bet covered the winning number
        const checkCover = (b, num) => {
            if (b.type === 'basket') {
                if (config.tableType === 'american') return [0, '00', 1, 2, 3].includes(num);
                return [0, 1, 2, 3].includes(num);
            } else if (b.type === 'line') {
                return num !== 0 && num !== '00' && num >= b.value && num <= b.value + 5;
            }
            return false;
        };

        let winningBet = null;
        for (let b of state.lastBets) {
            if (checkCover(b, lastSpin.winningNumber)) {
                winningBet = b;
                break;
            }
        }

        const isWin = winningBet !== null;

        // 4. State Transitions
        if (bankroll > state.targetBankroll) {
            // Peak profit reached -> Reset to base
            state.targetBankroll = bankroll;
            state.stage = 0;
            state.recoveryMode = false;
            state.positions = [{ type: 'basket', value: 0, units: 1 }];
        } else {
            // Not at peak profit
            if (isWin) {
                // Recovery Win
                state.recoveryMode = true;
                
                if (winningBet.type === 'line') {
                    const lineCount = state.positions.filter(p => p.type === 'line').length;
                    // Retain at least 2 double streets minimum
                    if (lineCount > 2) {
                        state.positions = state.positions.filter(p => !(p.type === 'line' && p.value === winningBet.value));
                    }
                }
                
                // Add 2 units bet each to each remaining double street bets
                state.positions.forEach(p => {
                    if (p.type === 'line') {
                        p.units += 2;
                    }
                });
            } else {
                // Loss
                const lineCount = state.positions.filter(p => p.type === 'line').length;

                if (!state.recoveryMode && state.stage < 4) {
                    // Initial setup progression (Losses 1 to 4)
                    state.stage++;
                    const newLine = getUnusedLine(state.positions);
                    if (newLine !== null) {
                        state.positions.push({ type: 'line', value: newLine, units: 0 });
                    }
                    
                    let targetUnits = 1;
                    if (state.stage === 1) targetUnits = 1;      // Loss 1: 1 unit all
                    else if (state.stage === 2) targetUnits = 2; // Loss 2: Double up (2 units all)
                    else if (state.stage === 3) targetUnits = 4; // Loss 3: Double up (4 units all)
                    else if (state.stage === 4) targetUnits = 4; // Loss 4: Add at 4 units (4 units all)

                    state.positions.forEach(p => p.units = targetUnits);
                } else {
                    // Loss 5+ or Loss in Recovery
                    state.recoveryMode = true;
                    const has20Units = state.positions.some(p => p.type === 'line' && p.units >= 20);
                    const increment = has20Units ? 4 : 2;
                    
                    // Increase all existing bets by the calculated increment
                    state.positions.forEach(p => p.units += increment);

                    // Add up to 5th double street if not already present
                    if (lineCount < 5) {
                        const newLine = getUnusedLine(state.positions);
                        if (newLine !== null) {
                            // Match the newly incremented unit size of the other lines
                            const currentLineUnits = state.positions.find(p => p.type === 'line')?.units || state.positions[0].units;
                            state.positions.push({ type: 'line', value: newLine, units: currentLineUnits });
                        }
                    }
                }
            }
        }
    }

    // 5. Calculate Bet Amount & CLAMP TO LIMITS
    let bets = state.positions.map(p => {
        let amount = p.units * baseUnit;
        amount = Math.max(amount, config.betLimits.min); 
        amount = Math.min(amount, config.betLimits.max);
        
        return {
            type: p.type,
            value: p.value,
            amount: amount
        };
    });

    state.lastBets = bets;
    return bets;
}