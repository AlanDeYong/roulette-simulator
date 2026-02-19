
/**
 * Strategy: "Never Lose" Tweaked (Follow the Leader)
 * Source: WillVegas - https://www.youtube.com/watch?v=8xC-Wn0GUh4
 *
 * THE LOGIC:
 * This is a "Cover the Table" strategy covering approximately 34 numbers.
 * 1. Base Bet Structure (Ratio 1:1:3):
 * - 1 Unit on Column 2
 * - 1 Unit on Column 3
 * - 3 Units on an Even Money Option (High 19-36 or Low 1-18)
 *
 * 2. The "Tweak" (Follow the Leader):
 * - The Even Money bet is NOT static.
 * - It follows the previous number.
 * - If the last number was High (19-36), bet High.
 * - If the last number was Low (1-18), bet Low.
 * - If the last number was Zero, maintain the previous High/Low selection.
 *
 * THE PROGRESSION (Recovery):
 * - The strategy uses a "Level" multiplier system.
 * - Base Level (1): Bets are 1, 1, 3.
 * - Loss: If the previous spin resulted in a net loss or bankroll drop, increase Level by 1.
 * - Level 2: Bets are 2, 2, 6.
 * - Level 3: Bets are 3, 3, 9.
 * - Reset: The video creator emphasizes protecting the bankroll.
 * - If the current bankroll exceeds the session High Water Mark (Session Profit), reset to Level 1.
 *
 * THE GOAL:
 * - Grind small profits using high coverage (winning on ~92% of spins on Single Zero).
 * - Target: Small session profit (e.g., +$50 on a $500 bankroll) then reset or stop.
 *
 * NOTE ON LIMITS:
 * This strategy requires 3 separate Outside bets. The code calculates the base unit
 * using `config.betLimits.minOutside`. If your table minimum is $5, your base bet
 * will be $25 total ($5 Col, $5 Col, $15 Even).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Logic
    if (state.level === undefined) state.level = 1;
    if (state.highWaterMark === undefined) state.highWaterMark = bankroll;
    if (state.currentSide === undefined) state.currentSide = 'high'; // Default start side (19-36)

    // Define the Betting Unit based on table limits
    // We use minOutside because all bets here are Outside bets.
    const baseUnit = config.betLimits.minOutside || 1;

    // 2. Analyze Previous Spin (if available) to adjust Level and Side
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // A. Handle "Follow the Leader" Logic (The Tweak)
        if (lastNum >= 1 && lastNum <= 18) {
            state.currentSide = 'low';
        } else if (lastNum >= 19 && lastNum <= 36) {
            state.currentSide = 'high';
        }
        // If 0, we do not change state.currentSide, we stick to the previous one.

        // B. Handle Progression Logic
        // Calculate the profit of the last spin to determine Win/Loss
        // (We compare current bankroll to what it was before the payout?
        // Easier to just compare against High Water Mark or check trend).

        if (bankroll > state.highWaterMark) {
            // We have reached a new peak (Session Profit) -> Reset
            state.level = 1;
            state.highWaterMark = bankroll;
        } else {
            // We are below the high water mark.
            // Did we lose money on the *specific last spin*?
            // To be precise, we need to know if the last spin was a net loss.
            // Since we don't store previous bankroll in state explicitly, we can infer logic:
            // The strategy implies increasing bets until recovery.
            // If the bankroll dropped compared to the previous High Water Mark check, we generally increase.
            // However, strictly following the video: "If we lose, we go up."

            // Let's assume a loss trigger if we aren't at ATH (All Time High)
            // But if we just won a partial amount, we shouldn't necessarily increase.
            // Simple heuristic: If bankroll < state.highWaterMark, we are in "Recovery Mode".
            // Ideally, we calculate if the last spin was a 'hit' or 'miss'.

            // Quick check if last spin was a total loss (hitting 0 or the uncovered holes in Col 1):
            // Uncovered numbers in this strategy: 0, and numbers in Column 1 that are OPPOSITE to currentSide.
            // Actually, simply: if bankroll decreased from previous step, increase level.
            // Since we can't see 'previous step' bankroll easily without storing it:
            if (state.previousBankroll && bankroll < state.previousBankroll) {
                state.level++;
            }
            // Note: If we won but haven't recovered ATH, we usually stay at current level or increase only on loss.
            // The code below defaults to maintaining level on a partial win, increasing only on a drop.
        }
    }

    // Store current bankroll for next spin comparison
    state.previousBankroll = bankroll;

    // 3. Calculate Bet Amounts based on Level
    // Ratio: 1 (Col 2) : 1 (Col 3) : 3 (Even Money)
    let colBetAmount = baseUnit * state.level;
    let evenBetAmount = (baseUnit * 3) * state.level;

    // 4. Clamp to Limits
    colBetAmount = Math.max(colBetAmount, config.betLimits.minOutside);
    colBetAmount = Math.min(colBetAmount, config.betLimits.max);

    evenBetAmount = Math.max(evenBetAmount, config.betLimits.minOutside);
    evenBetAmount = Math.min(evenBetAmount, config.betLimits.max);

    // 5. Construct Bets
    const bets = [];

    // Column 2
    bets.push({
        type: 'column',
        value: 2,
        amount: colBetAmount
    });

    // Column 3
    bets.push({
        type: 'column',
        value: 3,
        amount: colBetAmount
    });

    // Dynamic Even Money Bet (Follow the Leader)
    bets.push({
        type: state.currentSide, // 'high' or 'low'
        amount: evenBetAmount
    });

    return bets;

}