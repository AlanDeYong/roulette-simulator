/**
 * Strategy: Gelato Corners
 * Source: https://youtu.be/Iy-oIzj1sIY (YouTube Channel: Casino Matchmaker)
 * * The Full Logic in details:
 * - Almost the entire board is covered using an inside and outside bet mixture. 
 * - The strategy triggers a new bet calculation on every spin. 
 * - It evaluates the net profit/loss of the previous spin to determine the next action.
 * - Conditions:
 * - Win (Net Profit > 0): You won more than your total bet size.
 * - Small Loss (Net Loss <= ~15% of total bet): Only a small fraction was lost (e.g. 1 unit lost on a 31 unit total bet because of overlapping coverage).
 * - Partial Loss (Net Loss > 15% of total bet): A larger loss occurred because an uncovered number or a lesser paying section hit.
 * * The Full Bet Progression in details:
 * - Initial placement: 1 base unit on Zero. 5 base units each on the 1st Dozen, 3rd Column, and four corners (13, 19, 25, 31). This makes a total base bet of 31 units.
 * - On Win: If the bankroll reaches or exceeds the session's peak profit, the progression completely resets to level 1. If it's a win but NOT at the peak bankroll, the progression goes down 1 level.
 * - On Small Loss: Simply rebet at the current progression level.
 * - On Partial Loss: The progression level increases by 1. All bets are increased by their respective base amounts (e.g., zero goes up by 1 unit, the others go up by 5 units each).
 * * The Goal:
 * - Target Profit: As stated in the video, the goal is to make a $100 profit in 37 spins or less (or to steadily grind leaderboard wagering).
 * - Stop-loss: Run out of bankroll or hit table limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit scales to respect config minimums
    let multiplier = 1;
    while (
        1 * multiplier < config.betLimits.min || 
        5 * multiplier < config.betLimits.minOutside || 
        5 * multiplier < config.betLimits.min
    ) {
        multiplier++;
    }
    
    const baseZero = 1 * multiplier;
    const baseFive = 5 * multiplier;

    // 2. Initialize State
    if (!state.level) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBetAmount = 0;
    }

    // 3. Evaluate previous spin outcome
    if (spinHistory.length > 0 && state.bankrollAfterBet !== undefined) {
        let winAmount = bankroll - state.bankrollAfterBet;
        let net = winAmount - state.lastBetAmount;

        if (net > 0) {
            // Win condition
            if (bankroll >= state.peakBankroll) {
                state.level = 1; // Session's peak profit reached, reset
            } else {
                state.level = Math.max(1, state.level - 1); // Go down 1 level
            }
        } else if (net < 0) {
            // Loss condition
            let lossAmount = -net;
            let smallLossThreshold = state.lastBetAmount * 0.15; // Defining "small loss" threshold

            if (lossAmount <= smallLossThreshold) {
                // Small loss (e.g. pushing a $30 return on a $31 bet). Level stays the same.
            } else {
                // Partial loss or full loss. Increase level.
                state.level++;
            }
        }
    }

    // 4. Update session peak bankroll (Tracked BEFORE next bet placed)
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 5. Calculate Bet Amounts
    let curZeroBet, curFiveBet;
    
    if (config.incrementMode === 'base') {
        // Enforce max config limits without breaking the ratio
        let maxAllowedLevel = Math.floor(config.betLimits.max / baseFive);
        let maxLevel = Math.min(state.level, Math.max(1, maxAllowedLevel));
        
        curZeroBet = baseZero * maxLevel;
        curFiveBet = baseFive * maxLevel;
    } else {
        // 'fixed' increment mode
        let increase = config.minIncrementalBet * (state.level - 1);
        curZeroBet = Math.min(baseZero + increase, config.betLimits.max);
        curFiveBet = Math.min(baseFive + increase, config.betLimits.max);
    }
    
    // Ensure absolute minimum bounds are always respected
    curZeroBet = Math.max(curZeroBet, config.betLimits.min);
    curFiveBet = Math.max(curFiveBet, Math.max(config.betLimits.min, config.betLimits.minOutside));

    let totalNeeded = curZeroBet + (curFiveBet * 6);
    
    // 6. Stop-loss: insufficient funds
    if (bankroll < totalNeeded) {
        return null; 
    }

    // 7. Store state for next spin's math
    state.lastBetAmount = totalNeeded;
    state.bankrollAfterBet = bankroll - totalNeeded;

    // 8. Return Bets Array
    return [
        { type: 'number', value: 0, amount: curZeroBet },
        { type: 'dozen', value: 1, amount: curFiveBet },
        { type: 'column', value: 3, amount: curFiveBet },
        { type: 'corner', value: 13, amount: curFiveBet }, // Covers 13,14,16,17
        { type: 'corner', value: 19, amount: curFiveBet }, // Covers 19,20,22,23
        { type: 'corner', value: 25, amount: curFiveBet }, // Covers 25,26,28,29
        { type: 'corner', value: 31, amount: curFiveBet }  // Covers 31,32,34,35
    ];
}