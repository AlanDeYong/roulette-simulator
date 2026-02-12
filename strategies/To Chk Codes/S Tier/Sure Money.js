/**
 * Strategy: "Sure Money" (Double Dozen Hedge)
 * Source: Bet With Mo - https://www.youtube.com/watch?v=4h93YPyfopA
 *
 * THE LOGIC:
 * This strategy attempts to cover approximately 66% of the table by betting on two out of the three Dozens simultaneously.
 * To satisfy the "$11 Starting Bet" described in the video:
 * - We place 1 unit (scaled to min limit) on Dozen A.
 * - We place 1 unit (scaled to min limit) on Dozen B.
 * - We place a small hedge on Zero (optional, but consistent with "Sure Money" safety).
 *
 * "Start from the opposite side":
 * The strategy interprets this as betting against the last result.
 * - If the last number was in Dozen 1, we bet on Dozen 2 and Dozen 3.
 * - If the last number was in Dozen 2, we bet on Dozen 1 and Dozen 3.
 * - If the last number was in Dozen 3, we bet on Dozen 1 and Dozen 2.
 *
 * THE PROGRESSION:
 * Martingale (Triple Martingale variation for Dozens).
 * - On Win: Reset to base units.
 * - On Loss: Triple the previous bet amount to recover losses from two losing dozens.
 * (Note: Standard Martingale (Doubling) on Dozens only breaks even or loses slightly due to the double wager. Tripling is aggressive but required for profit on recovery).
 *
 * THE GOAL:
 * Quick accumulation of small profits ("Sure Money") by winning frequently (64-66% win rate).
 * Stop Loss: Recommended at 30% of Bankroll.
 * Target: +20% of Bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & SETUP ---
    const baseUnit = config.betLimits.minOutside; // Usually 5
    const hedgeUnit = config.betLimits.min;       // Usually 2 (for the Zero hedge)
    
    // Initialize State
    if (state.progressionLevel === undefined) state.progressionLevel = 1;
    if (state.lastBetWon === undefined) state.lastBetWon = true;

    // Helper to determine which Dozen a number belongs to (1, 2, or 3)
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    };

    // --- 2. ANALYZE HISTORY & DETERMINE OUTCOME ---
    let lastDozenHit = 0; // Default to 0 if no history
    
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        lastDozenHit = getDozen(winningNum);

        // Did we win last time?
        // We won if the winning number was NOT the one dozen we didn't bet on.
        // We track 'activeDozens' in state to verify strictly.
        if (state.activeDozens) {
            // Check if the winning number is inside one of our active dozens
            // OR if it was Zero (since we hedge Zero)
            const wonDozen = state.activeDozens.includes(lastDozenHit);
            const wonZero = (lastDozenHit === 0); 
            
            state.lastBetWon = wonDozen || wonZero;
        }
    }

    // --- 3. MANAGE PROGRESSION ---
    if (state.lastBetWon) {
        state.progressionLevel = 1; // Reset on win
    } else {
        // On loss, we need to triple to cover the cost of 2 bets losing
        // Level 1: 1 unit. Loss = -2.
        // Level 2: 3 units. Cost 6. Return 9. Net +3. Covers previous -2.
        state.progressionLevel *= 3;
    }

    // Calculate current bet amount
    let currentBetAmount = baseUnit * state.progressionLevel;
    
    // Safety Clamp: Don't exceed max limits or remaining bankroll
    // We place 2 bets, so max single bet is bankroll / 2
    const maxAffordable = Math.floor(bankroll / 2);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max, maxAffordable);

    // Stop if we can't afford the minimum bet
    if (currentBetAmount < config.betLimits.minOutside) {
        console.log("Bankroll too low to continue Sure Money strategy.");
        return [];
    }

    // --- 4. DETERMINE BET PLACEMENT ("Opposite Side") ---
    // If the last number was Dozen 1, we bet Dozen 2 & 3.
    // If last was Dozen 2, we bet 1 & 3.
    // If last was Dozen 3, we bet 1 & 2.
    // If last was 0 (or new game), default to 1 & 3 (Middle Gap).
    let targetDozens = [];
    
    if (lastDozenHit === 1) targetDozens = [2, 3];
    else if (lastDozenHit === 2) targetDozens = [1, 3];
    else if (lastDozenHit === 3) targetDozens = [1, 2];
    else targetDozens = [1, 3]; // Default/Zero case

    // Save strictly for next spin validation
    state.activeDozens = targetDozens;

    // --- 5. CONSTRUCT BETS ---
    const bets = [];

    // Add Dozen Bets
    targetDozens.forEach(dozenId => {
        bets.push({
            type: 'dozen',
            value: dozenId,
            amount: currentBetAmount
        });
    });

    // Add Zero Hedge (Only at base level or small progression to save cost)
    // We keep the hedge small to maximize the "Sure Money" from the dozens
    if (state.progressionLevel <= 3 && bankroll > config.betLimits.min) {
        bets.push({
            type: 'number',
            value: 0,
            amount: config.betLimits.min // Keep hedge minimal
        });
    }

    return bets;
}