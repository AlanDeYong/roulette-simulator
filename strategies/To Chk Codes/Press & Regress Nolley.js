/**
 * Strategy: Press & Regress Nolley
 * * Source: 
 * Video: "You'll Make Money with This Strat || Press & Regress Nolley"
 * Channel: CEG Dealer School
 * URL: https://www.youtube.com/watch?v=2fiFg7mSz5A
 * * The Logic:
 * This is a "Double Dozen" strategy that covers ~64-66% of the board.
 * It uses a 3-stage progression to capitalize on winning streaks while using a "Push" mechanic
 * to survive middling results.
 * * - Base Setup: Bet on two Dozens (e.g., Dozen 1 and Dozen 2).
 * - Coverage: 24 numbers + Zeros (loss).
 * * The Progression (The "Press"):
 * - Stage 1 (Base): 1 Unit on Dozen A, 1 Unit on Dozen B.
 * - Win: Move to Stage 2.
 * - Loss: Reset/Stay Stage 1.
 * - Stage 2 (The Press): 2 Units on Dozen A (High), 1 Unit on Dozen B (Low).
 * - Win on High (Dozen A): Net Profit +3u. Move to Stage 3.
 * - Win on Low (Dozen B): Net Profit 0u (Push). Repeat Stage 2.
 * - Loss: Reset to Stage 1.
 * - Stage 3 (The Big Press): 4 Units on Dozen A (High), 2 Units on Dozen B (Low).
 * - Win on High (Dozen A): "Jackpot". The video suggests "Pocketing" the profit and splitting the remainder.
 * In this code, we simulate this by doubling the Base Unit for the next cycle and resetting to Stage 1.
 * - Win on Low (Dozen B): Net Profit 0u (Push). Repeat Stage 3.
 * - Loss: Reset to Stage 1, reset Base Unit to minimum.
 * * The Goal:
 * - Reach the end of Stage 3 to significantly increase the bankroll, then "ratchet" up the base bet size.
 * - Survive variance using the "Push" mechanic in Stages 2 and 3.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Helper: Identify which Dozen a number belongs to (1, 2, or 3)
    // Returns 0 if the number is 0 or 00 (loss for dozens)
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    };

    // 2. Initialize State
    if (state.stage === undefined) {
        state.stage = 1; // Current progression stage: 1, 2, or 3
        state.baseUnit = config.betLimits.minOutside; // The value of "1 unit"
        
        // We bet on two dozens. Let's default to Dozen 1 and Dozen 2.
        // In a real game, players might switch based on "hot" dozens, but we stick to 1 & 2 for consistency.
        state.dozenA = 1; 
        state.dozenB = 2; 
        
        // In Stages 2 & 3, we need to know which Dozen is the "Heavy" bet (High) 
        // and which is the "Insurance" bet (Low). 
        // We default Dozen A to be the Heavy side.
        state.heavySide = state.dozenA; 
        state.lightSide = state.dozenB;
    }

    // 3. Process Last Spin (if it exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningDozen = getDozen(lastSpin.winningNumber);

        // Did we lose everything? (Zero or Dozen 3 hit)
        const isLoss = (winningDozen !== state.dozenA && winningDozen !== state.dozenB);

        if (isLoss) {
            // REGRESS: Any total loss resets us to the absolute bottom.
            state.stage = 1;
            state.baseUnit = config.betLimits.minOutside; // Reset unit size to table minimum
        } else {
            // We hit one of our dozens. Check logic based on Stage.
            
            if (state.stage === 1) {
                // STAGE 1: 1u / 1u. 
                // Any win here is a net +1u. Move to Stage 2.
                // The Dozen that HIT becomes the "Heavy" side for the next stage (riding the streak).
                state.stage = 2;
                state.heavySide = winningDozen;
                state.lightSide = (winningDozen === state.dozenA) ? state.dozenB : state.dozenA;

            } else if (state.stage === 2) {
                // STAGE 2: 2u (Heavy) / 1u (Light).
                if (winningDozen === state.heavySide) {
                    // Won on the 2u side. Profit! Move to Stage 3.
                    state.stage = 3;
                    // Keep the same heavy side
                } else {
                    // Won on the 1u side. Push.
                    // Stay on Stage 2, retry.
                    // Optional: You could swap heavy/light here, but standard Nolley logic usually retries.
                }

            } else if (state.stage === 3) {
                // STAGE 3: 4u (Heavy) / 2u (Light).
                if (winningDozen === state.heavySide) {
                    // Won on the 4u side. BIG WIN.
                    // Strategy: "Pocket profit, split remainder."
                    // Implementation: Double the base unit, reset to Stage 1.
                    state.baseUnit = state.baseUnit * 2; 
                    
                    // Safety Clamp: Don't let base unit exceed max / 4 (since Stage 3 bets 4 units)
                    if (state.baseUnit * 4 > config.betLimits.max) {
                        state.baseUnit = config.betLimits.minOutside; // Reset if we hit table limits
                    }
                    
                    state.stage = 1;
                } else {
                    // Won on the 2u side. Push.
                    // Stay on Stage 3.
                }
            }
        }
    }

    // 4. Calculate Bet Amounts
    // Ensure we respect min/max limits at every calculation step
    let bets = [];

    // Helper to clamp bet amount
    const clamp = (val) => {
        let amt = Math.max(val, config.betLimits.minOutside);
        return Math.min(amt, config.betLimits.max);
    };

    if (state.stage === 1) {
        // Stage 1: 1 unit on both
        bets.push({ type: 'dozen', value: state.dozenA, amount: clamp(state.baseUnit) });
        bets.push({ type: 'dozen', value: state.dozenB, amount: clamp(state.baseUnit) });
    } 
    else if (state.stage === 2) {
        // Stage 2: 2 units on Heavy, 1 unit on Light
        bets.push({ type: 'dozen', value: state.heavySide, amount: clamp(state.baseUnit * 2) });
        bets.push({ type: 'dozen', value: state.lightSide, amount: clamp(state.baseUnit) });
    } 
    else if (state.stage === 3) {
        // Stage 3: 4 units on Heavy, 2 units on Light
        bets.push({ type: 'dozen', value: state.heavySide, amount: clamp(state.baseUnit * 4) });
        bets.push({ type: 'dozen', value: state.lightSide, amount: clamp(state.baseUnit * 2) });
    }

    return bets;
}