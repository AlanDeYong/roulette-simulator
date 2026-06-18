/**
 * Strategic Roulette Coverage W/Progression
 * Source: https://youtu.be/gj6uYujmLzM (WillVegas)
 *
 * The Full Logic in details:
 * - The strategy covers 22 numbers (on American wheel) or 21 numbers (on European).
 * - It places straight-up bets on the following numbers: 
 * 0, (00 if American), 3, 5, 7, 8, 9, 10, 11, 14, 15, 17, 20, 22, 24, 26, 29, 30, 34, 36.
 * - Two specific numbers are designated as "Jackpot" numbers: 23 and 32. 
 * - Standard numbers receive 1 base unit, while Jackpot numbers receive 2 base units.
 *
 * The Full Bet Progression in details:
 * - The strategy uses a delayed increment progression.
 * - It waits for exactly 2 losses at the current level before increasing the bet level by 1 unit.
 * - If a win occurs, the bet level does NOT decrease immediately. It stays elevated to maximize 
 * the payout during a "hot run" of numbers.
 * - The progression entirely resets back to the base level only when the bankroll surpasses its 
 * previous high-water mark (i.e., making a new net profit).
 *
 * The Goal:
 * - The creator's target profit is $50 to $100 per session.
 * - This function implements a hard stop, returning no bets once a $50 profit is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.lossesAtCurrentLevel = 0;
        state.highWaterMark = config.startingBankroll;
        state.targetProfit = 50000;
        state.lastBetNumbers = [];
    }

    // 2. Check Win/Loss based on previous spin
    if (spinHistory.length > 0 && state.lastBetNumbers.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber.toString();

        if (!state.lastBetNumbers.includes(winNum)) {
            // Loss occurred
            state.lossesAtCurrentLevel++;
            // Increment level every 2 losses
            if (state.lossesAtCurrentLevel >= 2) {
                state.level++;
                state.lossesAtCurrentLevel = 0;
            }
        }
    }

    // 3. Reset progression if we've hit a new profit high
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
        state.level = 1;
        state.lossesAtCurrentLevel = 0;
    }

    // 4. Stop Loss / Target Profit Conditions
    if (bankroll >= config.startingBankroll + state.targetProfit) {
        return []; // Target reached
    }
    if (bankroll < config.betLimits.min) {
        return []; // Stop loss / Insufficient funds
    }

    // 5. Determine Base and Jackpot Amounts
    const baseUnit = config.betLimits.min;
    let standardAmount = baseUnit * state.level;
    let jackpotAmount = standardAmount * 2;

    // Clamp amounts to respect table limits
    standardAmount = Math.max(standardAmount, config.betLimits.min);
    standardAmount = Math.min(standardAmount, config.betLimits.max);
    
    jackpotAmount = Math.max(jackpotAmount, config.betLimits.min);
    jackpotAmount = Math.min(jackpotAmount, config.betLimits.max);

    // 6. Define Number Coverage
    const standardNumbers = [0, 3, 5, 7, 8, 9, 10, 11, 14, 15, 17, 20, 22, 24, 26, 29, 30, 34, 36];
    const jackpotNumbers = [23, 32];
    
    const bets = [];
    state.lastBetNumbers = []; // Clear and rebuild tracking array

    // Place Standard Bets
    for (const num of standardNumbers) {
        bets.push({ type: 'number', value: num, amount: standardAmount });
        state.lastBetNumbers.push(num.toString());
    }

    // Place Jackpot Bets
    for (const num of jackpotNumbers) {
        bets.push({ type: 'number', value: num, amount: jackpotAmount });
        state.lastBetNumbers.push(num.toString());
    }

    // Handle American table double-zero
    if (config.tableType === 'american') {
        bets.push({ type: 'number', value: '00', amount: standardAmount });
        state.lastBetNumbers.push('00');
    }

    // Ensure we can afford the total proposed bet, otherwise go all-in or stop
    const totalBetCost = bets.reduce((sum, b) => sum + b.amount, 0);
    if (bankroll < totalBetCost) {
        return []; 
    }

    return bets;
}