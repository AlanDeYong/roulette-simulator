/**
 * ============================================================================
 * Roulette Strategy: Tag Team GB (Martingale GB Modification)
 * ============================================================================
 * 
 * Source:
 * - URL: https://youtu.be/EyiFk1C8n-A
 * - Channel: CEG Dealer School
 * 
 * The Full Logic in Details:
 * - At the start of a round/cycle, a target roulette number (1-36) is selected.
 * - The strategy identifies the 5 outside betting positions that cover this number:
 *     1. 1:1 Color: 'red' or 'black'
 *     2. 1:1 Parity: 'even' or 'odd'
 *     3. 1:1 Range: 'low' (1-18) or 'high' (19-36)
 *     4. 2:1 Dozen: Dozen 1, 2, or 3
 *     5. 2:1 Column: Column 1, 2, or 3
 * - All 5 bets are placed initially at base unit stakes (respecting `config.betLimits.minOutside`).
 * 
 * The Full Bet Progression in Details:
 * - Each of the 5 positions tracks its own independent Martingale progression level.
 * - After each spin:
 *     - If a bet WINS: It is "pulled down" (removed from active betting).
 *     - If a bet LOSES: Its stake is doubled (Martingale: 1x -> 2x -> 4x -> 8x -> 16x ...), clamped to table limits.
 * - When all 5 bets have won (all pulled down), the cycle completes and resets.
 * - A new cycle begins with all 5 positions reset to base unit on the next target number.
 * 
 * The Goal:
 * - Capitalize on full outside coverage of a target sector to recover missed attributes with independent Martingale doubling, locking in profit as each attribute hits until the full round is cleared.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minBet = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

    // Helper: Determine the 5 outside attributes for a given number (1-36)
    function getAttributesForNumber(num) {
        if (num < 1 || num > 36) return null;
        return {
            color: RED_NUMBERS.has(num) ? 'red' : 'black',
            parity: (num % 2 === 1) ? 'odd' : 'even',
            range: (num <= 18) ? 'low' : 'high',
            dozen: Math.ceil(num / 12),
            column: ((num - 1) % 3) + 1
        };
    }

    // Helper: Check if a specific bet won on the last spin
    function checkBetWon(betItem, winningNum) {
        if (winningNum === 0 || winningNum === '00' || winningNum === 37) return false;
        
        switch (betItem.type) {
            case 'red':
                return RED_NUMBERS.has(winningNum);
            case 'black':
                return !RED_NUMBERS.has(winningNum);
            case 'even':
                return winningNum % 2 === 0;
            case 'odd':
                return winningNum % 2 === 1;
            case 'low':
                return winningNum >= 1 && winningNum <= 18;
            case 'high':
                return winningNum >= 19 && winningNum <= 36;
            case 'dozen':
                return Math.ceil(winningNum / 12) === betItem.value;
            case 'column':
                return (((winningNum - 1) % 3) + 1) === betItem.value;
            default:
                return false;
        }
    }

    // Initialize state if not present
    if (!state.activeBets) {
        state.activeBets = null;
        state.targetNumber = 17; // Default classic target number
    }

    // Process last spin result if active bets exist
    if (spinHistory && spinHistory.length > 0 && state.activeBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        const nextActiveBets = [];

        for (const activeBet of state.activeBets) {
            const won = checkBetWon(activeBet, winningNum);
            if (!won) {
                // Bet lost: double its multiplier for Martingale
                const nextMultiplier = activeBet.multiplier * 2;
                nextActiveBets.push({
                    ...activeBet,
                    multiplier: nextMultiplier
                });
            }
            // If won, it is pulled down (omitted from nextActiveBets)
        }

        state.activeBets = nextActiveBets.length > 0 ? nextActiveBets : null;
    }

    // If no active bets remain, initialize a new 5-way round
    if (!state.activeBets || state.activeBets.length === 0) {
        // Pick target number: use last winning number if between 1-36, or pick next target
        let target = 17;
        if (spinHistory && spinHistory.length > 0) {
            const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            target = (lastNum >= 1 && lastNum <= 36) ? lastNum : 17;
        }

        state.targetNumber = target;
        const attrs = getAttributesForNumber(target);

        state.activeBets = [
            { type: attrs.color, multiplier: 1 },
            { type: attrs.parity, multiplier: 1 },
            { type: attrs.range, multiplier: 1 },
            { type: 'dozen', value: attrs.dozen, multiplier: 1 },
            { type: 'column', value: attrs.column, multiplier: 1 }
        ];
    }

    // Generate bet array clamped to table limits
    const betsToPlace = [];
    for (const b of state.activeBets) {
        let amount = minBet * b.multiplier;
        amount = Math.max(amount, minBet);
        amount = Math.min(amount, maxBet);

        const betObj = {
            type: b.type,
            amount: amount
        };
        if (b.value !== undefined) {
            betObj.value = b.value;
        }
        betsToPlace.push(betObj);
    }

    return betsToPlace;
}