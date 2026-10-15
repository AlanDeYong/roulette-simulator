/**
 * Roulette Strategy: Even Money Strategy
 * 
 * Source:
 * - Channel: Gamblers University
 * - Video URL: https://youtu.be/VotwWHz6exw
 * 
 * Strategy Logic:
 * - This strategy focuses exclusively on Even-Money outside bets across three categories:
 *   1. Range: Low (1-18) vs High (19-36)
 *   2. Parity: Even vs Odd
 *   3. Color: Red vs Black
 * 
 * - The strategy operates in 3-bet clusters:
 *   - Cluster A (Red/Low Side): 'low', 'even', 'red'
 *   - Cluster B (Black/High Side): 'high', 'odd', 'black'
 * 
 * - Trigger & Initial Placement:
 *   - At the start or whenever a full cycle resolves (all active categories win):
 *     - If the last spin was Black, start the new cycle with Cluster B ('high', 'odd', 'black').
 *     - Otherwise, start with Cluster A ('low', 'even', 'red').
 *   - Initial bet amount for each of the 3 positions is 1 base unit (minOutside).
 * 
 * - Progression (Martingale on Unresolved Categories):
 *   - After each spin, evaluate each active category:
 *     - WIN: The category is resolved and removed from the active bets for the remainder of the cycle.
 *     - LOSS: The category remains unresolved. For the next spin, switch the position to match
 *       the winning attribute of the last spin (unless green 0/00 hit, in which case keep the existing position).
 *     - Bet Size: Double the bet size (1 -> 2 -> 4 -> 8 -> 16 -> 32 -> 64) for all remaining unresolved categories.
 * 
 * - Goal & Limits:
 *   - Profit Target: +$20 profit over starting bankroll (or target defined in config/state).
 *   - Max Progression Cap: $64 per bet position (clamped by config.betLimits.max).
 *   - Stop Loss: If max bet level loses twice consecutively or bankroll is exhausted, stop playing.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = config.betLimits ? config.betLimits.minOutside : 5;
    const maxBet = config.betLimits ? config.betLimits.max : 500;
    const startingBankroll = config.startingBankroll || 2000;
    const targetProfit = 20000;

    // Check target profit reached
    if (bankroll >= startingBankroll + targetProfit) {
        return [];
    }

    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.inCycle = false;
        state.categories = {}; 
        state.multiplier = 1;
        state.consecutiveMaxLosses = 0;
    }

    // Process last spin result if in an active cycle
    if (spinHistory && spinHistory.length > 0 && state.inCycle) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const color = lastSpin.winningColor; // 'red', 'black', 'green'

        const isGreen = (color === 'green' || num === 0 || num === 00);
        const isHigh = num >= 19 && num <= 36;
        const isLow = num >= 1 && num <= 18;
        const isEven = num > 0 && num % 2 === 0;
        const isOdd = num > 0 && num % 2 !== 0;

        let levelWonAny = false;
        let remainingCategories = {};

        // Evaluate each active category
        for (const cat in state.categories) {
            const currentBetType = state.categories[cat];
            let won = false;

            if (cat === 'color') {
                won = (currentBetType === color);
            } else if (cat === 'range') {
                won = (currentBetType === 'high' && isHigh) || (currentBetType === 'low' && isLow);
            } else if (cat === 'parity') {
                won = (currentBetType === 'even' && isEven) || (currentBetType === 'odd' && isOdd);
            }

            if (won) {
                levelWonAny = true;
                // Category resolved, drop it from active set for remaining cycle
            } else {
                // Unresolved category: update position to last winning side (if not green)
                let nextBetType = currentBetType;
                if (!isGreen) {
                    if (cat === 'color') nextBetType = color;
                    else if (cat === 'range') nextBetType = isHigh ? 'high' : 'low';
                    else if (cat === 'parity') nextBetType = isEven ? 'even' : 'odd';
                }
                remainingCategories[cat] = nextBetType;
            }
        }

        // Check cycle completion or update state
        if (Object.keys(remainingCategories).length === 0) {
            // All categories resolved -> reset cycle
            state.inCycle = false;
            state.multiplier = 1;
            state.consecutiveMaxLosses = 0;
        } else {
            // Progress remaining unresolved categories
            state.categories = remainingCategories;
            
            // Check for max level loss tracking
            if (state.multiplier >= 64) {
                state.consecutiveMaxLosses++;
                if (state.consecutiveMaxLosses >= 2) {
                    // Stop loss hit at max level
                    return [];
                }
            } else {
                state.consecutiveMaxLosses = 0;
            }

            // Double multiplier for next spin
            state.multiplier = Math.min(state.multiplier * 2, 64);
        }
    }

    // Start a new cycle if not currently in one
    if (!state.inCycle) {
        state.inCycle = true;
        state.multiplier = 1;

        // Determine starting cluster based on last winning color
        let startSide = 'A'; // Default Red/Low side
        if (spinHistory && spinHistory.length > 0) {
            const lastSpin = spinHistory[spinHistory.length - 1];
            if (lastSpin.winningColor === 'black') {
                startSide = 'B';
            }
        }

        if (startSide === 'B') {
            state.categories = {
                range: 'high',
                parity: 'odd',
                color: 'black'
            };
        } else {
            state.categories = {
                range: 'low',
                parity: 'even',
                color: 'red'
            };
        }
    }

    // Construct bets
    const bets = [];
    const baseAmount = minOutside;
    let betAmount = baseAmount * state.multiplier;

    // Clamp bet amount to config limits
    betAmount = Math.max(betAmount, minOutside);
    betAmount = Math.min(betAmount, maxBet);

    for (const cat in state.categories) {
        bets.push({
            type: state.categories[cat],
            amount: betAmount
        });
    }

    return bets;
}