/**
 * @description Implements the Indestructible Double Streets Strategy by Mark Ganon.
 * * === Strategy Documentation ===
 * - Source: YouTube Video "SUBSCRIBER NEVER LOSES!" by channel "The Roulette Master"
 * - URL: https://www.youtube.com/watch?v=7FhbCyNgD2c
 * * Full Logic:
 * - This strategy places simultaneous Inside bets on two specific Double Streets (Six Lines):
 * 1. Line 7 (Covers numbers 7-12)
 * 2. Line 25 (Covers numbers 25-30)
 * - Bets are placed continuously every single spin as long as the bankroll allows and the final goal is not met.
 * * Full Bet Progression:
 * - Starts with 1 base unit on each of the two Line positions.
 * - The strategy increases the bet size on each position by 1 unit every 2 spins, regardless of wins or losses.
 * - When the session profit meets or exceeds the current milestone target ($50 increments), the bet size resets
 * back to 1 base unit, and the target advances to the next multiple of $50.
 * * The Goal:
 * - The strategy operates on milestone targets of $50, $100, $150, and a final session profit goal of $200.
 * - Bets stop once the final session goal of $200 profit is achieved.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish the base betting unit for Inside line bets
    const unit = config.betLimits.min;

    // 2. Initialize Persistent State Variables
    if (state.progression === undefined) state.progression = 1;
    if (state.spinCount === undefined) state.spinCount = 0;
    if (state.nextMilestone === undefined) state.nextMilestone = 50;
    if (state.startingBankroll === undefined) state.startingBankroll = bankroll;

    // 3. Process historical results if a spin just occurred
    if (spinHistory.length > 0) {
        const currentProfit = bankroll - state.startingBankroll;

        // Stop betting if the final session target of $200 profit is met
        if (currentProfit >= 200000) {
            return [];
        }

        // Check if the current milestone profit target has been achieved or exceeded
        if (currentProfit >= state.nextMilestone) {
            state.progression = 1;
            state.spinCount = 0;
            // Advance milestone target to the next $50 increment above current profit
            state.nextMilestone = Math.floor(currentProfit / 50) * 50 + 50;
        } else {
            // Increment spin count for the current betting level
            state.spinCount++;
            // Every 2 spins, increase the bet progression multiplier by 1 unit
            if (state.spinCount >= 2) {
                state.progression++;
                state.spinCount = 0;
            }
        }
    }

    // 4. Calculate and clamp the individual bet amounts
    let betAmount = unit * state.progression;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Verify if the bankroll can cover the total layout cost (2 separate line bets)
    if (bankroll < (betAmount * 2)) {
        return []; 
    }

    // 5. Return the dual line bet configuration array
    return [
        { type: 'line', value: 7, amount: betAmount },
        { type: 'line', value: 25, amount: betAmount }
    ];
}