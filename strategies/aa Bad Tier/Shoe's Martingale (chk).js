/**
 * ============================================================================
 * Strategy: Shoe's Martingale
 * Source: YouTube - "I WAS REALLY SHOCKED HOW MUCH I MADE WITH THIS STRATEGY!"
 * Channel: The Roulette Master (System sent by Jeff Shoemate)
 * URL: https://youtu.be/EUUZlkbEl4k
 * ============================================================================
 *
 * 1. THE FULL LOGIC IN DETAIL:
 *    - The strategy plays across all three outside even-money bet categories:
 *        a) Color: Red vs. Black
 *        b) Parity: Even vs. Odd
 *        c) Range: Low (1-18) vs. High (19-36)
 *    - Trigger/Cycle Start:
 *        - At the start of a cycle, the system inspects the last winning spin (1-36).
 *        - It places 1 base unit on the exact OPPOSITE of all three categories:
 *            * If last was Black -> bet Red (and vice versa).
 *            * If last was Even -> bet Odd (and vice versa).
 *            * If last was High (19-36) -> bet Low (1-18) (and vice versa).
 *        - If the last number was 0 or 00, it waits for a standard 1-36 spin to define the opposites.
 *
 * 2. THE FULL BET PROGRESSION IN DETAIL:
 *    - Independent Martingale per Category:
 *        * When a category WINS: That bet is satisfied and REMOVED from the layout
 *          for the remainder of the cycle.
 *        * When a category LOSES: That specific bet stays on the same side and its
 *          amount DOUBLES (1x -> 2x -> 4x -> 8x -> 16x ...) on the next spin until it hits.
 *        * If 0 or 00 hits: All currently active even-money bets lose and double.
 *    - Cycle Completion:
 *        * The cycle ends as soon as all three categories have registered a win.
 *        * Once all three have won, the cycle resets completely, and a fresh cycle
 *          begins on the opposites of the most recent winning number.
 *
 * 3. THE GOAL:
 *    - Secure a net profit from clearing all three outside bets via Martingale recovery,
 *      then reset ("hit-and-run" cycle structure).
 *    - Stop conditions protect against table limits and bankroll depletion.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    const minOutside = (config.betLimits && config.betLimits.minOutside) || 5;
    const maxBet = (config.betLimits && config.betLimits.max) || 500;
    const baseUnit = minOutside;

    // Helper functions to categorize roulette numbers (1-36)
    const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    
    function isRed(num) {
        return RED_NUMBERS.includes(num);
    }

    function isBlack(num) {
        return num >= 1 && num <= 36 && !RED_NUMBERS.includes(num);
    }

    // Initialize state
    if (!state.cycleActive) {
        state.cycleActive = false;
        state.activeBets = {}; // category -> { type: 'red'|'black'|..., units: 1 }
    }

    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;

    // If a cycle was active, evaluate the outcomes of the last spin
    if (state.cycleActive) {
        const categories = Object.keys(state.activeBets);
        
        for (const cat of categories) {
            const currentBet = state.activeBets[cat];
            let won = false;

            if (cat === 'color') {
                if (currentBet.type === 'red' && isRed(lastNum)) won = true;
                if (currentBet.type === 'black' && isBlack(lastNum)) won = true;
            } else if (cat === 'parity') {
                if (lastNum >= 1 && lastNum <= 36) {
                    if (currentBet.type === 'even' && lastNum % 2 === 0) won = true;
                    if (currentBet.type === 'odd' && lastNum % 2 !== 0) won = true;
                }
            } else if (cat === 'range') {
                if (lastNum >= 1 && lastNum <= 18 && currentBet.type === 'low') won = true;
                if (lastNum >= 19 && lastNum <= 36 && currentBet.type === 'high') won = true;
            }

            if (won) {
                // Category satisfied: remove from layout
                delete state.activeBets[cat];
            } else {
                // Loss: Double the bet progression for this category
                currentBet.units *= 2;
            }
        }

        // If all categories have won, cycle is complete
        if (Object.keys(state.activeBets).length === 0) {
            state.cycleActive = false;
        }
    }

    // Start a new cycle if not active
    if (!state.cycleActive) {
        // Must have a valid non-zero number to determine opposites
        if (lastNum === 0 || lastNum === '00' || lastNum < 1 || lastNum > 36) {
            return [];
        }

        state.activeBets = {
            color: {
                type: isRed(lastNum) ? 'black' : 'red',
                units: 1
            },
            parity: {
                type: (lastNum % 2 === 0) ? 'odd' : 'even',
                units: 1
            },
            range: {
                type: (lastNum >= 19) ? 'low' : 'high',
                units: 1
            }
        };
        state.cycleActive = true;
    }

    // Build bets to return
    const bets = [];
    let totalBetCost = 0;

    for (const cat of Object.keys(state.activeBets)) {
        const betInfo = state.activeBets[cat];
        let amount = baseUnit * betInfo.units;

        // Clamp to table limits
        amount = Math.max(amount, minOutside);
        amount = Math.min(amount, maxBet);

        bets.push({
            type: betInfo.type,
            amount: amount
        });
        totalBetCost += amount;
    }

    // Bankroll safety check
    if (totalBetCost > bankroll) {
        // Can't afford the required progression; reset cycle
        state.cycleActive = false;
        state.activeBets = {};
        return [];
    }

    return bets;
}