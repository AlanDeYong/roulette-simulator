/**
 * Roulette Strategy: Casino Heist (Modified)
 * Source: Bet With Mo (https://www.youtube.com/watch?v=P7OJu8zaGMY)
 * * The Logic: 
 * - Covers 28 numbers (~75% of the board) using 4 strategic bets.
 * - 1x Outside bet on Low (1-18) [Base: 8 units]
 * - 1x Inside Street bet on 19-21 [Base: 2 units]
 * - 1x Inside Street bet on 22-24 [Base: 2 units]
 * - 1x Inside Corner bet in the 3rd Dozen (randomized per sequence) [Base: 2 units]
 * - Base bet total = 14 units.
 * * The Progression:
 * - Loss 1 to 4: Increase each bet by its base amount (Total: 28, 42, 56, 70).
 * - Loss 5 to 6: Double the previous total (Total: 140, 280).
 * - Loss 7: Switch to 25x base multiplier (Total: 350).
 * - Multiplier Sequence: [1, 2, 3, 4, 5, 10, 20, 25].
 * - Small wins (any covered number) yield net profit, so progression stays at current level.
 * * The Goal:
 * - Target profit increments of $20.
 * - Once target is reached, reset progression to Level 1, pick a new corner, set new $20 milestone.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define valid 3rd Dozen corners (represented by their top-left number)
    const thirdDozenCorners = [25, 26, 28, 29, 31, 32];

    // 2. Initialize State on first run
    if (state.progression === undefined) {
        state.progression = 1; // Levels 1 through 8
        state.targetBankroll = bankroll + 20; 
        state.currentCorner = thirdDozenCorners[Math.floor(Math.random() * thirdDozenCorners.length)];
    }

    // 3. Evaluate previous spin to adjust progression or goals
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Calculate dynamically covered numbers based on the current randomized corner
        const cornerTopLeft = state.currentCorner;
        const cornerNumbers = [cornerTopLeft, cornerTopLeft + 1, cornerTopLeft + 3, cornerTopLeft + 4];
        
        const coveredNumbers = [
            1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18, // Low
            19,20,21, // Street 1
            22,23,24, // Street 2
            ...cornerNumbers // Randomized 3rd Dozen Corner
        ];

        const isLoss = !coveredNumbers.includes(num);

        if (bankroll >= state.targetBankroll) {
            // Goal reached: Reset to base level, pick a new random corner, and set new $20 milestone
            state.progression = 1;
            state.targetBankroll = bankroll + 20;
            state.currentCorner = thirdDozenCorners[Math.floor(Math.random() * thirdDozenCorners.length)];
        } else if (isLoss) {
            // Loss: Move up one level in the progression (capped at level 8)
            state.progression = Math.min(state.progression + 1, 8);
        }
    }

    // 4. Determine Multiplier based on the 8-level progression rules
    const multipliers = [1, 2, 3, 4, 5, 10, 20, 25];
    const currentMultiplier = multipliers[state.progression - 1];

    // 5. Calculate actual bet amounts using strict base units (8 and 2)
    let amountOutside = 8 * currentMultiplier; 
    let amountInside = 2 * currentMultiplier;   

    // 6. Clamp to Limits (Ensure simulator limits don't break the script, while attempting to preserve ratio)
    amountOutside = Math.min(Math.max(amountOutside, config.betLimits.minOutside), config.betLimits.max);
    amountInside = Math.min(Math.max(amountInside, config.betLimits.min), config.betLimits.max);

    // 7. Return Bet Array
    return [
        { type: 'low', amount: amountOutside },
        { type: 'street', value: 19, amount: amountInside },
        { type: 'street', value: 22, amount: amountInside },
        { type: 'corner', value: state.currentCorner, amount: amountInside }
    ];
}