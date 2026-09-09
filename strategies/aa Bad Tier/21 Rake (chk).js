/**
 * ============================================================================
 * Strategy: 21 Rake
 * Source: CEG Dealer School (https://youtu.be/C0LnJb9J47Q)
 * 
 * --- THE FULL LOGIC IN DETAIL ---
 * "21 Rake" covers exactly 21 numbers across the roulette table using four 
 * six-line (double street) bets. Three lines cover 18 unique numbers, while a 
 * fourth line overlaps ("touches") one of the double streets, creating an 
 * overlapping 3-number "jackpot" / "sweet spot" (e.g., lines 1-6 and 4-9 
 * overlap on numbers 4, 5, and 6).
 * 
 * - Placements:
 *     1. Line 1  (Numbers 1 - 6)
 *     2. Line 4  (Numbers 4 - 9)  -> Overlaps on 4, 5, 6 (Sweet Spot)
 *     3. Line 10 (Numbers 10 - 15)
 *     4. Line 16 (Numbers 16 - 21)
 *   Total unique numbers covered: 21.
 * 
 * --- THE FULL BET PROGRESSION ---
 * - Type: Positive Progression (Press on wins).
 * - Base Bet: 4 equal line bets (Default: $10 each, total $40 layout).
 * - On Win (Standard Covered Number):
 *     Increase each line bet by 1 increment (+$5 or base unit per line, e.g., 
 *     $10 -> $15 -> $20 -> $25).
 * - Reset Triggers (Back to Base Level):
 *     1. Hitting the Overlapping "Sweet Spot" (numbers 4, 5, 6) pays double 
 *        and triggers an immediate reset to base level.
 *     2. Reaching the progression cap ($25 each / $100 total layout) and winning.
 *     3. Any loss (number outside 1-21 or 0/00) resets the progression back to base.
 *     4. Bankroll profit target ($100+ above session high / cycle target) resets.
 * 
 * --- THE GOAL ---
 * Lock in steady positive press profits during streaks, hit the double-paying 
 * 3-number jackpot for a high-payout spin, and take profit at +$100 to +$200.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine unit size based on table limits
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;
    
    // Base unit per line: minimum $10 (or 2x min inside limit if higher)
    const baseLineBet = Math.max(10, minInside * 2);
    const pressIncrement = config.incrementMode === 'base' 
        ? baseLineBet 
        : (config.minIncrementalBet ? Math.max(config.minIncrementalBet, 5) : 5);

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.level = 1; // Level 1 ($10), Level 2 ($15), Level 3 ($20), Level 4 ($25)
        state.maxLevel = 4;
        state.lastWager = 0;
    }

    // 3. Process Previous Result (if any)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        const isSweetSpot = (lastNum >= 4 && lastNum <= 6);
        const isStandardWin = (lastNum >= 1 && lastNum <= 21);

        if (isSweetSpot) {
            // Jackpot hit: double win, reset to base per strategy rules
            state.level = 1;
        } else if (isStandardWin) {
            // Standard hit: advance progression up to max level, then reset
            if (state.level >= state.maxLevel) {
                state.level = 1; // Reset after reaching the $100 cap
            } else {
                state.level += 1;
            }
        } else {
            // Miss / Loss: reset to base bet
            state.level = 1;
        }
    }

    // 4. Calculate Current Line Bet Amount
    let currentLineBet = baseLineBet + (state.level - 1) * pressIncrement;
    currentLineBet = Math.max(currentLineBet, minInside);
    currentLineBet = Math.min(currentLineBet, maxBet);

    // Check if bankroll can support placing all 4 line bets
    const totalRequired = currentLineBet * 4;
    if (bankroll < totalRequired) {
        currentLineBet = Math.floor(bankroll / 4);
        if (currentLineBet < minInside) {
            return []; // Cannot cover minimum bets
        }
    }

    state.lastWager = currentLineBet * 4;

    // 5. Construct the 4 Double Street (Line) Bets Covering 21 Numbers
    return [
        { type: 'line', value: 1, amount: currentLineBet },  // Covers 1 - 6
        { type: 'line', value: 4, amount: currentLineBet },  // Covers 4 - 9 (Overlaps 4, 5, 6)
        { type: 'line', value: 10, amount: currentLineBet }, // Covers 10 - 15
        { type: 'line', value: 16, amount: currentLineBet }  // Covers 16 - 21
    ];
}