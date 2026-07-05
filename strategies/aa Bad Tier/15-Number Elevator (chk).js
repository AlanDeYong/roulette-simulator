/**
 * Source: https://www.youtube.com/watch?v=5G34eGhRe-Q (ALL in With Zach)
 * Strategy: Zach Attack 15-Number Elevator (Neighbors of Zero)
 *
 * The Full Logic in details:
 * - The strategy bets a continuous block of 15 numbers on the American roulette wheel layout.
 * - Specifically, it targets the Single Zero (0) and 7 neighbors on each side.
 * - The covered numbers (from 33 on the left to 20 on the right) are: 
 * 33, 16, 4, 23, 35, 14, 2, 0, 28, 9, 26, 30, 11, 7, 20.
 * - Bets are placed every single spin on these 15 numbers as straight-up inside bets.
 *
 * The Full Bet Progression in details:
 * - Starts at 1 base unit per number (minimum inside bet).
 * - If the spin wins, the progression resets to 1 base unit.
 * - If the spin loses, the bet size per number escalates through a specific multiplier tier to recover losses:
 * - Tier 1 (Base/Win): 1x unit
 * - Tier 2 (1 loss): 2x units
 * - Tier 3 (2 losses): 3x units
 * - Tier 4 (3 losses): 4x units
 * - Tier 5 (4+ losses): 8x units (Aggressive recovery spike as seen in the video)
 * - The bet amount per number maxes out at the Tier 5 multiplier or the table maximum, whichever is lower.
 *
 * The Goal:
 * - Grind out consistent, small profits (e.g., $100 profit on a $200 bankroll) and reset on every hit. 
 * - Stop-loss is bankroll depletion.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State and define target numbers (American Wheel 0 + 7 neighbors each side)
    if (state.lossStreak === undefined) {
        state.lossStreak = 0;
    }

    const targetNumbers = [33, 16, 4, 23, 35, 14, 2, 0, 28, 9, 26, 30, 11, 7, 20];

    // 2. Check previous spin result to update progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        if (targetNumbers.includes(lastSpin.winningNumber)) {
            state.lossStreak = 0; // Win: reset to base tier
        } else {
            state.lossStreak++;   // Loss: escalate progression
        }
    }

    // 3. Define progression multipliers (1x, 2x, 3x, 4x, 8x)
    const multipliers = [1, 2, 3, 4, 8];
    const tierIndex = Math.min(state.lossStreak, multipliers.length - 1);
    const currentMultiplier = multipliers[tierIndex];

    // 4. Calculate Bet Amount per number
    const baseUnit = config.betLimits.min; 
    let amountPerNumber = baseUnit * currentMultiplier;

    // 5. Clamp to table limits
    amountPerNumber = Math.max(amountPerNumber, config.betLimits.min);
    amountPerNumber = Math.min(amountPerNumber, config.betLimits.max);

    // Safety check: Prevent attempting to bet more than the current bankroll allows
    if (amountPerNumber * 15 > bankroll && bankroll >= config.betLimits.min * 15) {
        amountPerNumber = Math.floor(bankroll / 15);
    } else if (bankroll < config.betLimits.min * 15) {
        // Not enough bankroll to cover the minimum spread, stop betting
        return [];
    }

    // 6. Generate the bet array
    const bets = [];
    for (let i = 0; i < targetNumbers.length; i++) {
        bets.push({ 
            type: 'number', 
            value: targetNumbers[i], 
            amount: amountPerNumber 
        });
    }

    return bets;
}