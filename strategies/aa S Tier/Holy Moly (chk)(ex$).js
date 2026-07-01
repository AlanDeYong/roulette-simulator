/**
 * Strategy: Holy Moly (Corrected Progression)
 * Source: YouTube Channel (via video https://www.youtube.com/watch?v=pXehOEJ1gpU)
 * 
 * The Full Logic in details:
 * - The strategy places two concurrent outside bets to cover a large portion of the board:
 *   1 unit on the 1st Dozen (covers numbers 1-12)
 *   2 units on High numbers (covers numbers 19-36)
 * - This creates 3 possible spin outcomes:
 *   1. Push (Net 0): A number from 1-12 hits. Dozen wins (+2 units), High loses (-2 units).
 *   2. Win (Net +1): A number from 19-36 hits. High wins (+2 units), Dozen loses (-1 unit).
 *   3. Loss (Net -3): A number from 13-18 or 0/00 hits. Both bets lose.
 * 
 * The Full Bet Progression in details:
 * - Initial: Start at Level 1 (1 base unit on 1st Dozen, 2 base units on High).
 * - On Push: Increase all bets by their respective base bet amount (Level increases by 1).
 * - On Win: Check against the session's peak bankroll. If current bankroll is at or exceeds the 
 *   peak profit, reset to Level 1. If not at peak profit, go down 1 level.
 * - On Loss: Double up all bets twice (Multiply Level by 4).
 * 
 * The Goal: 
 * - Grind steady profit by covering 30 numbers on the wheel. Accumulate wins and resets at peak 
 *   profits while using an aggressive x4 recovery multiplier to escape drawdowns on losses.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    if (state.level === undefined) {
        state.level = 1;
    }
    if (state.peakBankroll === undefined) {
        state.peakBankroll = config.startingBankroll;
    }

    // 2. Evaluate Previous Spin & Adjust Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const n = lastSpin.winningNumber;
        
        // Determine outcome of the last spin based on the board coverage
        let outcome = 'loss'; 
        if (n >= 1 && n <= 12) {
            outcome = 'push';
        } else if (n >= 19 && n <= 36) {
            outcome = 'win';
        }
        // 0, 00, and 13-18 automatically remain 'loss'

        // Apply progression logic
        if (outcome === 'push') {
            state.level += 1;
        } else if (outcome === 'win') {
            if (bankroll >= state.peakBankroll) {
                state.level = 1; // Reset at session peak
            } else {
                state.level = Math.max(1, state.level - 1); // Go down 1 level
            }
        } else if (outcome === 'loss') {
            state.level *= 4; // Double up twice
        }
    }

    // Update session peak bankroll AFTER evaluating the reset condition
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Calculate Bet Amounts Based on Current Level
    const unit = config.betLimits.minOutside;
    
    // Base is 1 unit for dozen, 2 units for high
    let dozenAmount = (1 * unit) * state.level;
    let highAmount = (2 * unit) * state.level;

    // 4. Respect Bet Limits (Clamp to min/max)
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    highAmount = Math.max(highAmount, config.betLimits.minOutside);
    highAmount = Math.min(highAmount, config.betLimits.max);

    // 5. Return Bets
    return [
        { type: 'dozen', value: 1, amount: dozenAmount },
        { type: 'high', amount: highAmount }
    ];
}