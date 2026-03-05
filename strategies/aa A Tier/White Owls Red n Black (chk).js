/**
 * Source: Roulette Strategy Lab (YouTube: https://www.youtube.com/watch?v=CjEL00WHy4A)
 * Strategy: White Owl's Red & Black Strategy
 * * The Logic: 
 * - "Follow the Leader" to start: bet on the last winning color.
 * - If you lose, keep betting the SAME color until you hit 3 consecutive losses.
 * - After 3 consecutive losses on a color, switch to the OPPOSITE color.
 * * The Progression: 
 * - Uses the D'Alembert method.
 * - On a loss, increase the bet by 1 unit.
 * - On a win, decrease the bet by 1 unit.
 * - Minimum bet is 1 base unit.
 * * The Goal: 
 * - Accumulate steady profits through safe D'Alembert recovery while
 * limiting exposure to long streaks against you by switching colors after 3 losses.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 0. Wait for the first spin to establish a leader
    if (spinHistory.length === 0) return [];

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastColor = lastSpin.winningColor;

    // 1. Initialize state on the first active turn
    if (!state.initialized) {
        // Wait for a valid red/black leader if the first spin is green
        if (lastColor === 'green') return [];
        
        state.initialized = true;
        state.targetColor = lastColor;
        state.currentUnits = 1;
        state.consecutiveLosses = 0;
        state.lastBetColor = null; 
    } else {
        // 2. Resolve Previous Bet
        if (state.lastBetColor) {
            const isWin = (lastColor === state.lastBetColor);
            
            if (isWin) {
                // Win: Reset losses, decrease unit, set target to the winning color
                state.consecutiveLosses = 0;
                state.currentUnits = Math.max(1, state.currentUnits - 1);
                state.targetColor = lastColor; 
            } else {
                // Loss: Increase unit, count loss
                state.consecutiveLosses += 1;
                state.currentUnits += 1;
                
                // Switch colors after 3 consecutive losses
                if (state.consecutiveLosses === 3) {
                    state.targetColor = (state.targetColor === 'red') ? 'black' : 'red';
                    state.consecutiveLosses = 0; // Reset loss streak for the new color
                }
            }
        }
    }

    // 3. Calculate Bet Amount
    const baseBet = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? baseBet : config.minIncrementalBet;
    
    let amount = baseBet + (state.currentUnits - 1) * increment;

    // 4. Clamp to Limits
    amount = Math.max(amount, baseBet);
    amount = Math.min(amount, config.betLimits.max);
    
    // Ensure we don't bet more than the available bankroll
    if (amount > bankroll) {
        amount = bankroll; 
    }

    // Stop betting if bankroll is too low for the minimum bet
    if (amount < baseBet) {
        return [];
    }

    // 5. Store the intended bet for next resolution
    state.lastBetColor = state.targetColor;

    // 6. Return Bet
    return [{ type: state.targetColor, amount: amount }];
}