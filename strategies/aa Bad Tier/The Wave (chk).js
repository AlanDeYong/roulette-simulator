/**
 * ============================================================================
 * Strategy Name: The Wave (Randomized Dozens & Non-Overlapping Corners)
 * Source: CEG Dealer School (YouTube: https://youtu.be/3IYrRx6L1yg)
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAILS:
 * "The Wave" is a two-stage hybrid system combining negative progression on 
 * outside dozen bets with an aggressive parlay into inside corner bets.
 * 
 * - Stage 1 (Dozen Bet):
 *   A dozen (1st, 2nd, or 3rd) is randomly chosen for each spin.
 *   - If the dozen loses, the bet size increases by $10 (2 units) in a negative
 *     progression ($20 -> $30 -> $40 -> $50 -> $60 -> ...).
 *   - If the dozen wins, the total payout (3x the dozen bet) triggers Stage 2.
 * 
 * - Stage 2 (Corner Bets Parlay):
 *   The full payout received from the winning dozen is divided equally across 
 *   4 randomly selected, strictly non-overlapping corner bets (covering 16 numbers total).
 *   - If any Corner Wins: Corner pays 8:1 (delivering large profit). The strategy
 *     completely RESETS back to Stage 1 at the base $20 dozen level.
 *   - If the Corner Bets Lose: The parlay is lost. The strategy returns to 
 *     Stage 1 and increases the dozen bet by +$10 above the level that triggered
 *     the parlay.
 * 
 * THE FULL BET PROGRESSION:
 * - Base Dozen Bet: $20 (clamped to at least 4x minOutside / config limits)
 * - Progression Step: +$10 on Dozen loss or Corner stage loss
 * - Dozen progression sequence: $20 -> $30 -> $40 -> $50 -> $60 -> $70 -> $80 ...
 * - Corner Bet calculation: Math.floor((dozenBet * 3) / 4) per corner
 * - Corner win: Full reset to base level ($20 dozen)
 * 
 * THE GOAL:
 * - Target Profit: Double starting bankroll (+100% / +$600 on $600 bankroll) or +$500.
 * - Stop Loss: When bankroll is insufficient to place minimum table bets.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Sizing and Limits
    const minOutside = config.betLimits.minOutside || 5;
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;
    const baseDozenBet = Math.max(minOutside * 4, 20);
    const dozenIncrement = Math.max(minOutside * 2, 10);

    // Helper: returns the set of 4 numbers for a given corner top-left value
    function getCornerNumbers(val) {
        return [val, val + 1, val + 3, val + 4];
    }

    // Helper: randomly pick 4 non-overlapping corners covering 16 distinct numbers
    function pickRandomNonOverlappingCorners() {
        // Valid top-left corner values on a roulette board (rows 1..11, cols 1..2)
        const allPossibleCorners = [
            1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29, 31, 32
        ];
        
        // Shuffle pool
        const shuffled = [...allPossibleCorners].sort(() => Math.random() - 0.5);
        const selected = [];
        const occupiedNumbers = new Set();

        for (const c of shuffled) {
            const nums = getCornerNumbers(c);
            const overlaps = nums.some(n => occupiedNumbers.has(n));
            if (!overlaps) {
                selected.push(c);
                nums.forEach(n => occupiedNumbers.add(n));
                if (selected.length === 4) break;
            }
        }
        return selected;
    }

    // Helper: randomly pick a dozen (1, 2, or 3)
    function pickRandomDozen() {
        return Math.floor(Math.random() * 3) + 1;
    }

    // 2. State Initialization
    if (!state.initialized) {
        state.initialized = true;
        state.stage = 'DOZEN';                  // 'DOZEN' or 'CORNERS'
        state.currentDozenLevel = baseDozenBet;
        state.activeDozen = pickRandomDozen();
        state.activeCorners = [];
        state.targetBankroll = (config.startingBankroll || 600) + 600;
    }

    // 3. Stop Conditions
    if (bankroll >= state.targetBankroll) {
        return []; // Target goal reached
    }

    if (bankroll < minInside * 4 && bankroll < minOutside) {
        return []; // Insufficient funds
    }

    // 4. Process Last Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        if (state.stage === 'DOZEN') {
            const dozenStart = (state.activeDozen - 1) * 12 + 1;
            const dozenEnd = state.activeDozen * 12;
            const wonDozen = winningNum >= dozenStart && winningNum <= dozenEnd;

            if (wonDozen) {
                state.stage = 'CORNERS';
                state.activeCorners = pickRandomNonOverlappingCorners();
            } else {
                state.currentDozenLevel += dozenIncrement;
                state.activeDozen = pickRandomDozen();
            }
        } else if (state.stage === 'CORNERS') {
            const allCoveredNumbers = state.activeCorners.flatMap(c => getCornerNumbers(c));
            const wonCorner = allCoveredNumbers.includes(winningNum);

            if (wonCorner) {
                // Reset after hitting corner parlay
                state.currentDozenLevel = baseDozenBet;
                state.stage = 'DOZEN';
                state.activeDozen = pickRandomDozen();
            } else {
                // Lost corner parlay: advance progression by +$10
                state.currentDozenLevel += dozenIncrement;
                state.stage = 'DOZEN';
                state.activeDozen = pickRandomDozen();
            }
        }
    }

    // 5. Output Stage Bets
    if (state.stage === 'DOZEN') {
        let amount = state.currentDozenLevel;
        amount = Math.max(amount, minOutside);
        amount = Math.min(amount, maxBet);

        if (bankroll < amount) {
            amount = Math.max(Math.floor(bankroll), minOutside);
            if (bankroll < minOutside) return [];
        }

        return [
            {
                type: 'dozen',
                value: state.activeDozen,
                amount: amount
            }
        ];
    } else if (state.stage === 'CORNERS') {
        if (!state.activeCorners || state.activeCorners.length !== 4) {
            state.activeCorners = pickRandomNonOverlappingCorners();
        }

        const totalPayout = state.currentDozenLevel * 3;
        let perCornerAmount = Math.floor(totalPayout / 4);

        // Clamp to limits
        perCornerAmount = Math.max(perCornerAmount, minInside);
        perCornerAmount = Math.min(perCornerAmount, maxBet);

        const totalCost = perCornerAmount * 4;
        if (bankroll < totalCost) {
            perCornerAmount = Math.floor(bankroll / 4);
            if (perCornerAmount < minInside) {
                state.stage = 'DOZEN';
                state.activeDozen = pickRandomDozen();
                return [{ type: 'dozen', value: state.activeDozen, amount: Math.min(bankroll, minOutside) }];
            }
        }

        return state.activeCorners.map(pos => ({
            type: 'corner',
            value: pos,
            amount: perCornerAmount
        }));
    }

    return [];
}