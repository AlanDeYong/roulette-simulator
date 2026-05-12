/**
 * Source: Ninja Gamblers - https://www.youtube.com/watch?v=VIJj3SfTO60
 * * The Logic: The James Bond strategy covers 68% of the board using 20 units per spin.
 * - 14 units on High (19-36)
 * - 5 units on the Six Line covering 13-18
 * - 1 unit straight on Zero (0)
 * * The Progression: Modified Martingale for cycle-profit recovery.
 * - After a loss, the entire bet layout is doubled (up to 3 times).
 * - NEW RESET LOGIC: The script takes a snapshot of the bankroll before a losing streak begins (`cycleStartBankroll`). 
 * Because a doubled win on the 'High' numbers leaves a slight net deficit, the strategy no longer resets on *any* win. 
 * It ONLY resets to the base bet when the current bankroll surpasses the `cycleStartBankroll` (achieving session/cycle profit). 
 * If a win occurs but the cycle is still negative, it maintains the current multiplier to grind back to profit.
 * * The Goal: Accumulate consistent small wins, rigidly restrict drawdowns via the 3-step cap, and ensure progression only resets on a true mathematical profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.multiplier === undefined) {
        state.multiplier = 1;
        state.consecutiveLosses = 0;
        state.cycleStartBankroll = bankroll; // Snapshot of bankroll before starting a new progression cycle
    }

    // 2. Evaluate previous spin to determine progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // A win in this strategy is any number 13 or higher, plus 0.
        const isWin = lastSpin === 0 || lastSpin >= 13;
        
        if (isWin) {
            // Check if this win actually recovered all losses for the current cycle
            if (bankroll > state.cycleStartBankroll) {
                // Session/Cycle profit reached: Reset progression and take a new baseline snapshot
                state.multiplier = 1;
                state.consecutiveLosses = 0;
                state.cycleStartBankroll = bankroll; 
            } else {
                // We won, but we are still at a net loss for this betting cycle.
                // Maintain the current multiplier to continue recovering the deficit.
                // Resetting consecutive losses ensures we don't trigger the stop-loss while successfully recovering.
                state.consecutiveLosses = 0; 
            }
        } else {
            // Loss: Advance progression
            state.consecutiveLosses++;
            
            if (state.consecutiveLosses <= 3) {
                // Double the bet (2x, 4x, 8x)
                state.multiplier *= 2; 
            } else {
                // Stop-loss hit (4th loss in a row). 
                // Reset back to base to prevent total bankroll collapse, and reset the cycle baseline.
                state.multiplier = 1;
                state.consecutiveLosses = 0;
                state.cycleStartBankroll = bankroll; 
            }
        }
    } else {
        // First spin of the entire session: Ensure cycleStartBankroll is perfectly aligned
        state.cycleStartBankroll = bankroll;
    }

    // 3. Determine Base Unit (Ensuring it meets minimum table limits)
    const baseUnit = config.betLimits.min; 

    // Calculate intended amounts based on the James Bond 14:5:1 ratio and current multiplier
    let highAmount = 14 * baseUnit * state.multiplier;
    let lineAmount = 5 * baseUnit * state.multiplier;
    let zeroAmount = 1 * baseUnit * state.multiplier;

    // 4. Enforce Limits (Clamp values)
    highAmount = Math.max(highAmount, config.betLimits.minOutside);

    highAmount = Math.min(highAmount, config.betLimits.max);
    lineAmount = Math.min(lineAmount, config.betLimits.max);
    zeroAmount = Math.min(zeroAmount, config.betLimits.max);

    // 5. Return Bet Array
    return [
        { type: 'high', amount: highAmount },
        { type: 'line', value: 13, amount: lineAmount }, 
        { type: 'number', value: 0, amount: zeroAmount }
    ];
}