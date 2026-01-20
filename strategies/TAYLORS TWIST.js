/**
 * TAYLOR'S TWIST ROULETTE SYSTEM STRATEGY
 * * Source: 
 * YouTube: The Roulette Master
 * URL: https://www.youtube.com/watch?v=ijI7qPaFo-g
 * * The Logic:
 * 1. Trigger: Wait for TWO consecutive outcomes of the same Outside Chance 
 * (e.g., Red/Red, Even/Even, Low/Low).
 * 2. Bet: Place a bet on the OPPOSITE outcome (e.g., after Red/Red, bet Black).
 * This implies the streak will break ("The Twist").
 * * The Progression (Aggressive Recovery):
 * This system uses a specific, aggressive progression to recover losses quickly.
 * Multipliers relative to Base Unit:
 * - Level 0 (Start): 1 unit
 * - Level 1 (After 1 Loss): 3 units (Increase by 2 units)
 * - Level 2 (After 2 Losses): 9 units (Triple the previous bet - "The Twist")
 * - Level 3 (After 3 Losses): 12 units (Increase by 3 units)
 * - Level 4 (After 4 Losses): 36 units (Triple the previous bet)
 * - Stop Loss: Reset if Level 4 is lost to preserve remaining bankroll.
 * * The Goal:
 * Hit a quick profit target (approx 20-30 units) and stop, or survive the 
 * "Twist" progression to recover previous losses with a profit.
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. Configuration & Helper Functions
    const MIN_HISTORY = 2;
    const PROGRESSION_MULTIPLIERS = [1, 3, 9, 12, 36]; // The specific Taylor's Twist sequence
    
    // Helper: Determine if a specific bet type won based on the last spin
    const checkWin = (betType, lastSpin) => {
        if (lastSpin.winningNumber === 0 || lastSpin.winningNumber === '00') return false; // Zero kills outside bets
        
        const num = parseInt(lastSpin.winningNumber);
        
        // Colors
        if (betType === 'red') return lastSpin.winningColor === 'red';
        if (betType === 'black') return lastSpin.winningColor === 'black';
        
        // Evens/Odds
        if (betType === 'even') return num !== 0 && num % 2 === 0;
        if (betType === 'odd') return num % 2 !== 0;
        
        // High/Low
        if (betType === 'low') return num >= 1 && num <= 18;
        if (betType === 'high') return num >= 19 && num <= 36;
        
        return false;
    };

    // Helper: Identify triggers from history
    // Returns the bet type we should play if a pattern is found
    const findTrigger = (history) => {
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        const lastNum = parseInt(last.winningNumber);
        const prevNum = parseInt(prev.winningNumber);

        // Skip triggers if zeros involved (simplifies logic)
        if (last.winningNumber === 0 || last.winningNumber === '00') return null;
        if (prev.winningNumber === 0 || prev.winningNumber === '00') return null;

        // Check Colors (Red/Red -> Bet Black)
        if (last.winningColor === 'red' && prev.winningColor === 'red') return 'black';
        if (last.winningColor === 'black' && prev.winningColor === 'black') return 'red';

        // Check Parity (Even/Even -> Bet Odd)
        if (lastNum % 2 === 0 && prevNum % 2 === 0) return 'odd';
        if (lastNum % 2 !== 0 && prevNum % 2 !== 0) return 'even';

        // Check Ranges (Low/Low -> Bet High)
        if (lastNum <= 18 && prevNum <= 18) return 'high';
        if (lastNum >= 19 && prevNum >= 19) return 'low';

        return null;
    };

    // 2. Initialize State
    if (!state.progressionIndex) state.progressionIndex = 0;
    if (state.activeBetType === undefined) state.activeBetType = null;

    // 3. Check Spin History Requirements
    if (spinHistory.length < MIN_HISTORY) {
        return []; 
    }

    const lastSpin = spinHistory[spinHistory.length - 1];

    // 4. Resolve Previous Bet (if any)
    if (state.activeBetType) {
        const won = checkWin(state.activeBetType, lastSpin);

        if (won) {
            // Win: Reset everything
            state.activeBetType = null;
            state.progressionIndex = 0;
        } else {
            // Loss: Move up the ladder
            state.progressionIndex++;
            
            // Hard Stop: If we exceeded our defined progression, reset to avoid ruin
            if (state.progressionIndex >= PROGRESSION_MULTIPLIERS.length) {
                state.activeBetType = null;
                state.progressionIndex = 0;
            }
        }
    }

    // 5. Look for New Trigger (if no active bet)
    if (!state.activeBetType) {
        const newTrigger = findTrigger(spinHistory);
        if (newTrigger) {
            state.activeBetType = newTrigger;
            state.progressionIndex = 0; // Start at base unit
        }
    }

    // 6. Place Bet (if we have an active trigger)
    if (state.activeBetType) {
        // A. Define Base Unit (Outside Min)
        const baseUnit = config.betLimits.minOutside;

        // B. Calculate Multiplier based on Progression Index
        const multiplier = PROGRESSION_MULTIPLIERS[state.progressionIndex];

        // C. Calculate Raw Amount
        let betAmount = baseUnit * multiplier;

        // D. RESPECT LIMITS (Clamp)
        // Ensure we don't bet below minimum (unlikely given math, but safe)
        betAmount = Math.max(betAmount, config.betLimits.minOutside);
        // Ensure we don't bet above table maximum
        betAmount = Math.min(betAmount, config.betLimits.max);

        // E. Bankroll Check (Optional but recommended: Don't bet what you don't have)
        if (betAmount > bankroll) {
            // If we can't afford the bet, stop playing to prevent error
            return [];
        }

        return [{
            type: state.activeBetType,
            value: null, // Outside bets usually don't need a value in this schema
            amount: betAmount
        }];
    }

    // No bet conditions met
    return [];
}