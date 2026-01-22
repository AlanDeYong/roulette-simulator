/**
 * STRATEGY: Chris's "Quattro" System
 * * SOURCE: 
 * YouTube Channel: Roulette Training
 * Video URL: https://www.youtube.com/watch?v=rOJh4VX9RSQ (Timestamp: 00:48:07)
 * * THE LOGIC:
 * This is an aggressive inside-betting strategy that seeks to cover specific sectors of the board.
 * - Initial Bet: Places 4 bets total. 
 * 1. The "Basket" (Covers 0, 1, 2, 3).
 * 2. Three distinct Corners (non-overlapping).
 * - Total Coverage: 16 Numbers.
 * * THE PROGRESSION (Martingale Variant):
 * 1. On First Loss: 
 * - Add 1 additional Corner (Coverage increases to 20 numbers).
 * - DOUBLE the bet unit on ALL positions.
 * 2. On Subsequent Losses:
 * - Keep the coverage the same (Basket + 4 Corners).
 * - DOUBLE the bet unit again.
 * 3. On Win:
 * - Reset to the Initial setup (Basket + 3 Corners).
 * - Reset bet amount to the base unit.
 * * THE GOAL:
 * Quick profit accumulation using high coverage (approx 43% to 54%). 
 * Stop-loss suggested: If the doubling hits the table limit or 20% of bankroll drawdown.
 * Profit Target: +20-30 units.
 */

function bet(spinHistory, bankroll, config, state) {
    // ---------------------------------------------------
    // 1. CONFIGURATION & STATE INITIALIZATION
    // ---------------------------------------------------
    
    // Define the base unit using the table minimum for Inside bets
    const baseUnit = config.betLimits.min;
    
    // Initialize persistent state variables if they don't exist
    if (state.progressionLevel === undefined) state.progressionLevel = 0;
    if (state.lastCoveredNumbers === undefined) state.lastCoveredNumbers = [];

    // ---------------------------------------------------
    // 2. ANALYZE PREVIOUS SPIN (Win/Loss Check)
    // ---------------------------------------------------
    
    // If history exists, check if our previous bets won
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNumber = lastSpin.winningNumber;

        // Check if the winning number was in our covered array
        const isWin = state.lastCoveredNumbers.includes(lastWinningNumber);

        if (isWin) {
            // WIN: Reset everything
            state.progressionLevel = 0;
        } else {
            // LOSS: Increase progression
            state.progressionLevel++;
        }
    }

    // ---------------------------------------------------
    // 3. CALCULATE BET SIZING & POSITIONS
    // ---------------------------------------------------

    // Martingale Calculation: 2^level
    // Level 0 = 1 unit
    // Level 1 = 2 units
    // Level 2 = 4 units, etc.
    let multiplier = Math.pow(2, state.progressionLevel);
    let betAmount = baseUnit * multiplier;

    // --- CRITICAL: RESPECT TABLE LIMITS ---
    // Ensure bet is at least the minimum
    betAmount = Math.max(betAmount, config.betLimits.min);
    // Ensure bet does not exceed the maximum
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Stop betting if bankroll is too low to cover the spread
    // We need either 4 or 5 chips depending on level
    const chipsNeeded = (state.progressionLevel === 0) ? 4 : 5;
    if (bankroll < (betAmount * chipsNeeded)) {
        return []; // Not enough money to execute strategy
    }

    // ---------------------------------------------------
    // 4. DEFINE BET POSITIONS
    // ---------------------------------------------------
    
    const bets = [];
    // Reset coverage tracking for the next spin's verification
    const currentCoveredNumbers = [];

    // Helper to add a bet and track its numbers
    function addBet(type, value, numbersCovered) {
        bets.push({ type: type, value: value, amount: betAmount });
        currentCoveredNumbers.push(...numbersCovered);
    }

    // A. The Basket (0, 1, 2, 3)
    // Note: 'basket' value is usually 0. Covers 0,1,2,3.
    addBet('basket', 0, [0, 1, 2, 3]);

    // B. The Standard 3 Corners
    // We select corners to spread the board without overlapping.
    // Corner 5: Covers 5, 6, 8, 9
    addBet('corner', 5, [5, 6, 8, 9]);
    
    // Corner 17: Covers 17, 18, 20, 21
    addBet('corner', 17, [17, 18, 20, 21]);
    
    // Corner 26: Covers 26, 27, 29, 30
    addBet('corner', 26, [26, 27, 29, 30]);

    // C. The "Extra" Corner (Only added after a loss / Level 1+)
    if (state.progressionLevel > 0) {
        // Corner 32: Covers 32, 33, 35, 36
        addBet('corner', 32, [32, 33, 35, 36]);
    }

    // ---------------------------------------------------
    // 5. UPDATE STATE & RETURN
    // ---------------------------------------------------
    
    // Save the numbers we just bet on so we can check for a win in the next turn
    state.lastCoveredNumbers = currentCoveredNumbers;

    return bets;
}