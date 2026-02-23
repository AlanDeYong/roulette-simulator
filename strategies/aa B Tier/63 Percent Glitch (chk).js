/**
 * Source: https://www.youtube.com/watch?v=8Q-6vEzRKt0 (Stacking Chips)
 * * The Logic: 
 * The strategy covers approximately 63-66% of the wheel by betting on the exact 
 * same two columns every single spin. The video creator prefers Column 1 and Column 2.
 * * The Progression:
 * A ladder progression system adjusting based on units:
 * - On a LOSS: Increase the bet size on EACH column by 2 units.
 * - On a WIN: Decrease the bet size on EACH column by 1 unit.
 * - The bet size never drops below the starting base unit (1 unit).
 * * The Goal: 
 * To grind out a steady profit. Because you have a >60% chance to win every spin, 
 * the goal is to ride out short losing streaks by escalating the bet slightly, and 
 * returning to the base unit during inevitable winning streaks.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (typeof state.currentUnits === 'undefined') {
        state.currentUnits = 1;      // Start at 1 base unit
        state.placedBet = false;     // Track if we made a bet on the previous spin
    }

    // 2. Evaluate Previous Spin (if we placed a bet)
    if (state.placedBet && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Determine which column the winning number belongs to
        // Col 1: 1, 4, 7... (num % 3 === 1)
        // Col 2: 2, 5, 8... (num % 3 === 2)
        // Col 3: 3, 6, 9... (num % 3 === 0)
        // 0 or 00 are not in any column
        let isWin = false;
        
        if (num !== 0 && num !== '00') {
            const col = num % 3;
            // We are betting on Column 1 and Column 2
            if (col === 1 || col === 2) {
                isWin = true;
            }
        }

        // 3. Apply Progression Logic
        if (isWin) {
            // On win: go down 1 unit, but don't drop below 1
            state.currentUnits = Math.max(1, state.currentUnits - 1);
        } else {
            // On loss: go up 2 units
            state.currentUnits += 2;
        }
    }

    // 4. Calculate Bet Amount
    const baseUnit = config.betLimits.minOutside;
    let targetAmount = baseUnit * state.currentUnits;

    // 5. Clamp to Limits
    targetAmount = Math.max(targetAmount, config.betLimits.minOutside);
    targetAmount = Math.min(targetAmount, config.betLimits.max);

    // 6. Bankroll Check (Safety)
    // We need enough bankroll to place TWO bets of 'targetAmount'
    if (bankroll < (targetAmount * 2)) {
        // If we can't afford the progression, drop down to what we can afford or reset
        if (bankroll >= (baseUnit * 2)) {
            targetAmount = baseUnit; // Fallback to base unit
            state.currentUnits = 1;  // Reset progression due to low funds
        } else {
            // Insufficient funds to even place minimum outside bets
            state.placedBet = false;
            return []; 
        }
    }

    // 7. Place Bets
    state.placedBet = true;
    
    return [
        { type: 'column', value: 1, amount: targetAmount },
        { type: 'column', value: 2, amount: targetAmount }
    ];
}