/**
 * Positive Streets Strategy (Corrected Placement & Progression)
 * * Source: https://www.youtube.com/watch?v=UMszG-KEZQ4 (Bet With Mo)
 * * The Logic: 
 * Bet on 4 Double Streets (Lines) to cover numbers 7 through 30. 
 * The line bets placed are at values 7 (7-12), 13 (13-18), 19 (19-24), and 25 (25-30).
 * * The Progression:
 * Custom loss progression based on explicit unit increases:
 * - Level 0: 1 base unit
 * - Level 1 (Loss 1): Double up -> 2 units
 * - Level 2 (Loss 2): Double up -> 4 units
 * - Level 3 (Loss 3): +6 units -> 10 units
 * - Level 4 (Loss 4): +8 units -> 18 units
 * - Level 5 (Loss 5): +10 units -> 28 units
 * - Level 6 (Loss 6): Double up -> 56 units
 * On a win, track consecutive wins and drop down 1 progression level after 2 consecutive wins.
 * * The Goal:
 * Achieve a rolling profit goal of 10 base units, then reset the sequence.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define progression multipliers calculated from the loss sequence
    const multipliers = [1, 2, 4, 10, 18, 28, 56]; 
    
    // Utilize the simulator's defined minimum inside bet as the base unit
    const baseUnit = config.betLimits.min; 
    const profitTargetIncrement = baseUnit * 10; 

    // 2. Initialize State Management
    if (state.level === undefined) {
        state.level = 0;
        state.consecutiveWins = 0;
        state.targetBankroll = bankroll + profitTargetIncrement;
    }

    // 3. Process Spin History & Progression Logic
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Corrected Coverage: Lines 7, 13, 19, 25 cover numbers 7 through 30.
        const won = lastSpin.winningNumber >= 7 && lastSpin.winningNumber <= 30;

        // Check if global profit goal is reached
        if (bankroll >= state.targetBankroll) {
            state.level = 0;
            state.consecutiveWins = 0;
            state.targetBankroll = bankroll + profitTargetIncrement;
        } else {
            if (won) {
                state.consecutiveWins++;
                // Drop down a level after 2 consecutive wins
                if (state.consecutiveWins >= 2) {
                    state.level = Math.max(0, state.level - 1);
                    state.consecutiveWins = 0; 
                }
            } else {
                // Move up a level on loss, capping at the 6th loss (index 6)
                state.level = Math.min(multipliers.length - 1, state.level + 1);
                state.consecutiveWins = 0;
            }
        }
    }

    // 4. Calculate Bet Amount
    const currentMultiplier = multipliers[state.level];
    let amount = baseUnit * currentMultiplier;

    // Strict clamping to respect table limits in the simulator
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Return Bets for the 4 Double Streets (Lines)
    return [
        { type: 'line', value: 7, amount: amount },  // Covers 7-12
        { type: 'line', value: 13, amount: amount }, // Covers 13-18
        { type: 'line', value: 19, amount: amount }, // Covers 19-24
        { type: 'line', value: 25, amount: amount }  // Covers 25-30
    ];
}