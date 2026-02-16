/**
 * Strategy: The Alex Von Schilling System (Double Unit Recovery)
 * Source: THEROULETTEMASTERTV - "INCREDIBLE ROULETTE SYSTEM WON $2895 IN 15 MINUTES!"
 * URL: https://youtu.be/jN-tEMWRk48?si=4R7qcNrPowK5U4vE
 * * THE LOGIC:
 * This strategy relies on covering "Jackpot" numbers (specifically 17 and 20) with overlapping bets
 * while covering a significant portion of the board to minimize losses or break even.
 * * The 9 Bets (Equal Unit Sizing):
 * 1. Second Column (covers 2,5,8,11,14,17,20,23,26,29,32,35)
 * 2. Corner 32-36 (covers 32,33,35,36)
 * 3. Corner 25-29 (covers 25,26,28,29)
 * 4. Corner 20-24 (covers 20,21,23,24)
 * 5. Corner 13-17 (covers 13,14,16,17)
 * 6. Corner 8-12  (covers 8,9,11,12)
 * 7. Corner 1-5   (covers 1,2,4,5)
 * 8. Basket 0-2   (covers top bets, approximated as Basket 0,00,1,2,3 or 0,1,2,3)
 * 9. Split 17-20  (The "Jackpot" bet overlapping the column and corners)
 * * THE PROGRESSION (Aggressive Negative Progression):
 * 1. Base Bet: 1 Unit on each of the 9 spots.
 * 2. On Loss: INCREASE the bet size by 2 UNITS per spot. (e.g., 1 -> 3 -> 5).
 * 3. On Push (Break Even): Maintain current bet size.
 * 4. On Win: 
 * - If Total Bankroll > Starting Bankroll (Session Profit): RESET to 1 Unit.
 * - If Total Bankroll <= Starting Bankroll: MAINTAIN current bet size (do not reduce until profit).
 * * THE GOAL:
 * Recover losses quickly using the +2 unit jumps and hit the "Jackpot" numbers (17/20)
 * while the bets are high to secure a massive session profit, then reset.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Initialization
    // Use the higher of the two minimums to ensure legal bets for both Inside (Corners) and Outside (Columns).
    // This ensures all 9 bets are of equal monetary value as per the strategy.
    const baseChip = Math.max(config.betLimits.min, config.betLimits.minOutside);

    if (state.unitSize === undefined) state.unitSize = 1;
    if (state.initialBankroll === undefined) state.initialBankroll = bankroll;
    if (state.previousBankroll === undefined) state.previousBankroll = bankroll;

    // 2. Analyze Previous Spin (if valid)
    if (spinHistory.length > 0) {
        const profitDelta = bankroll - state.previousBankroll;
        const totalSessionProfit = bankroll - state.initialBankroll;

        // Logic:
        // Profit > 0: Win
        // Profit < 0: Loss
        // Profit == 0: Push (Break Even) - Note: In practice, "Break Even" might be slight +/- due to payouts, 
        // strictly 0 is ideal, but we treat positive as win, negative as loss.

        if (profitDelta > 0) {
            // WIN
            if (totalSessionProfit > 0) {
                // We are in session profit: RESET
                state.unitSize = 1;
            } else {
                // We won, but still recovering losses: MAINTAIN
                // state.unitSize remains the same
            }
        } else if (profitDelta < 0) {
            // LOSS
            // Increase by 2 units
            state.unitSize += 2;
        } else {
            // PUSH (Break Even)
            // Maintain bet
        }
    }

    // 3. Update State for next turn
    state.previousBankroll = bankroll;

    // 4. Calculate Bet Amount
    // Clamp bet amount to the maximum limit allowed by the table
    let betAmount = state.unitSize * baseChip;
    betAmount = Math.max(betAmount, baseChip); // Ensure at least min
    betAmount = Math.min(betAmount, config.betLimits.max); // Ensure at most max

    // 5. Construct Bets
    // The strategy requires 9 specific bets of equal size.
    const bets = [
        // 1. Second Column
        { type: 'column', value: 2, amount: betAmount },
        
        // 2. Corner 32-36 (Top Left: 32)
        { type: 'corner', value: 32, amount: betAmount },
        
        // 3. Corner 25-29 (Top Left: 25)
        { type: 'corner', value: 25, amount: betAmount },
        
        // 4. Corner 20-24 (Top Left: 20)
        { type: 'corner', value: 20, amount: betAmount },
        
        // 5. Corner 13-17 (Top Left: 13)
        { type: 'corner', value: 13, amount: betAmount },
        
        // 6. Corner 8-12 (Top Left: 8)
        { type: 'corner', value: 8, amount: betAmount },
        
        // 7. Corner 1-5 (Top Left: 1)
        { type: 'corner', value: 1, amount: betAmount },
        
        // 8. "0-2 Corner" -> Mapped to Basket (0,00,1,2,3 or 0,1,2,3)
        // This is the standard bet for covering the top of the board (0/00/2).
        { type: 'basket', value: 0, amount: betAmount },
        
        // 9. Split 17-20 (The Jackpot Bet)
        { type: 'split', value: [17, 20], amount: betAmount }
    ];

    return bets;
}