/**
 * STRATEGY: "Roulette Jackpot Twist" (Win with Mo Adaptation)
 * * SOURCE: 
 * Channel: ROULETTE JACKPOT
 * Video: https://www.youtube.com/watch?v=jK_U1NsED5c
 * * THE LOGIC:
 * The strategy uses a "Boom Boom" pattern, placing 4 Split bets simultaneously to create a 
 * "Slot" or cluster of coverage on the board. 
 * - There are 3 distinct "Slots" (sets of 4 splits) that the player rotates through.
 * - Each Slot covers 8 distinct numbers on the board.
 * * THE PROGRESSION (Negative Progression / Martingale Hybrid):
 * 1. Start at Level 1 (1 unit per split).
 * 2. If WIN: 
 * - Reset progression to Level 1.
 * - Move to the NEXT Slot (Slot 1 -> Slot 2 -> Slot 3 -> Slot 1).
 * 3. If LOSS:
 * - Stay on the SAME Slot.
 * - Increase progression level by 1 (Level 1 -> Level 2 -> Level 3).
 * - Bet amounts are: 1 unit, 2 units, 3 units.
 * 4. STOP LOSS / RESET:
 * - If a loss occurs at Level 3 (Total loss of sequence), reset to Level 1 and move to the next Slot (or restart at Slot 1).
 * * THE GOAL:
 * To maximize short-term variance by aggressively scaling bets to recover losses (17:1 payout on splits allows 
 * significant recovery even with small units).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- CONFIGURATION ---
    // The video uses 3 sets of 4 Split bets. 
    // We define these as "Slots" attempting to match the video's coverage.
    const SLOTS = [
        // Slot 1 (Visual approximation: Middle/Right heavy)
        [[8, 11], [10, 13], [17, 20], [26, 29]],
        
        // Slot 2 (Shifted coverage)
        [[5, 8], [13, 16], [23, 26], [32, 35]],
        
        // Slot 3 (Left/Middle heavy)
        [[6, 9], [14, 17], [20, 23], [31, 34]]
    ];

    const MAX_PROGRESSION_LEVEL = 3;
    const MIN_BET = config.betLimits.min; // Use table minimum for inside bets

    // --- STATE INITIALIZATION ---
    if (state.slotIndex === undefined) state.slotIndex = 0; // Which group of splits are we betting?
    if (state.progression === undefined) state.progression = 1; // Current unit multiplier (1, 2, or 3)
    if (state.activeSplits === undefined) state.activeSplits = []; // Remember what we bet on for win checking

    // --- HISTORY ANALYSIS (Determine Win/Loss) ---
    // We need to know if the LAST spin won to decide the next move.
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Check if the winning number was covered by our last bets
        // A split [a, b] covers number 'a' and number 'b'
        let isWin = false;
        
        if (state.activeSplits && state.activeSplits.length > 0) {
            // Flatten the splits array to check coverage
            // activeSplits is like [[8,11], [10,13]...]
            const coveredNumbers = state.activeSplits.flat();
            if (coveredNumbers.includes(lastNumber)) {
                isWin = true;
            }
        }

        // --- PROGRESSION LOGIC ---
        if (isWin) {
            // WIN: Reset units, Move to next slot
            state.progression = 1;
            state.slotIndex = (state.slotIndex + 1) % SLOTS.length;
        } else {
            // LOSS: Increase units, Stay on same slot
            state.progression += 1;

            // HARD RESET: If we lose at Level 3, we accept the loss and reset
            if (state.progression > MAX_PROGRESSION_LEVEL) {
                state.progression = 1;
                // Video implies starting over or moving on. We'll move to next slot to avoid "cold" numbers.
                state.slotIndex = 0; 
            }
        }
    }

    // --- CALCULATE BET AMOUNT ---
    let baseAmount = MIN_BET * state.progression;

    // --- RESPECT BET LIMITS ---
    baseAmount = Math.max(baseAmount, config.betLimits.min);
    baseAmount = Math.min(baseAmount, config.betLimits.max);

    // --- PLACE BETS ---
    const currentSlotSplits = SLOTS[state.slotIndex];
    const bets = [];

    // Save active splits to state for next spin's verification
    state.activeSplits = currentSlotSplits;

    // Generate bet objects
    for (let splitPair of currentSlotSplits) {
        bets.push({
            type: 'split',
            value: splitPair,
            amount: baseAmount
        });
    }

    return bets;
}