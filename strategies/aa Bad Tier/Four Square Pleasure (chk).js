/**
 * -----------------------------------------------------------------------------
 * Strategy: Four Square Pleasure (Random Selection)
 * Source: CEG Dealer School (https://youtu.be/yexl1Geqeg0)
 * -----------------------------------------------------------------------------
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. Stage 1 (Dozen Qualifier):
 *    - A single bet placed on a randomly selected Dozen (1, 2, or 3).
 *    - Base amount is clamped according to config limits (default 2 units / $10).
 *    - If the Dozen loses: Re-roll or rebet Stage 1 flatly.
 *    - If the Dozen wins (paying 2:1): Pocket the original stake and use the 
 *      profit to fund Stage 2.
 * 
 * 2. Stage 2 (Four Square - Inside Corner Bets):
 *    - The strategy picks 4 mutually non-overlapping corner bets chosen at random
 *      from all 22 valid grid corner positions, covering 16 distinct numbers.
 *    - Initial bet per corner starts at 1 unit ($5 in the video, $20 total risk).
 * 
 * THE FULL BET PROGRESSION:
 * - Loss at Any Point:
 *    - Immediately resets to Stage 1 with base betting units.
 * - Win Progression in Stage 2:
 *    - Corner win pays 8:1 ($40 profit + $5 stake = $45 returned).
 *    - Profit is locked in, and corner wagers increase by 1 base unit per corner
 *      for the next spin (e.g., $5 -> $10 -> $15 per corner).
 * 
 * THE GOAL:
 * - Target profit: +$200 above starting bankroll, or stop on bankroll depletion.
 * -----------------------------------------------------------------------------
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish bet limits
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    const baseOutsideBet = Math.max(minOutside, 10);
    const baseCornerBet = Math.max(minInside, Math.floor(baseOutsideBet / 2));

    const targetProfit = (config.startingBankroll || 2000) + 20000;
    const stopLoss = 0;

    if (bankroll >= targetProfit || bankroll <= stopLoss) {
        return [];
    }

    // Helper: Map top-left anchor number to all 4 numbers in a corner bet
    function getCornerNumbers(topLeft) {
        return [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];
    }

    // Helper: Verify if two corner bets share any overlapping numbers
    function cornersOverlap(c1, c2) {
        const set1 = getCornerNumbers(c1);
        const set2 = getCornerNumbers(c2);
        return set1.some(num => set2.includes(num));
    }

    // Helper: Pick 4 mutually non-overlapping corner bets randomly
    function getRandomNonOverlappingCorners() {
        const validCorners = [];
        for (let col = 0; col < 11; col++) {
            const base = col * 3 + 1;
            validCorners.push(base);     // row 1-2 corner anchor
            validCorners.push(base + 1); // row 2-3 corner anchor
        }

        // Shuffle candidate corner anchors (Fisher-Yates)
        for (let i = validCorners.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = validCorners[i];
            validCorners[i] = validCorners[j];
            validCorners[j] = temp;
        }

        const selected = [];
        for (let i = 0; i < validCorners.length && selected.length < 4; i++) {
            const candidate = validCorners[i];
            const overlaps = selected.some(c => cornersOverlap(c, candidate));
            if (!overlaps) {
                selected.push(candidate);
            }
        }
        return selected;
    }

    // 2. Initialize Persistent State
    if (!state.stage) {
        state.stage = 'DOZEN_QUALIFIER';
        state.cornerUnits = 1;
        state.currentDozen = Math.floor(Math.random() * 3) + 1;
        state.currentCorners = getRandomNonOverlappingCorners();
        state.lastBetStage = null;
    }

    // 3. Evaluate Previous Spin Result
    if (spinHistory && spinHistory.length > 0 && state.lastBetStage) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        if (state.lastBetStage === 'DOZEN_QUALIFIER') {
            const minNum = (state.currentDozen - 1) * 12 + 1;
            const maxNum = state.currentDozen * 12;
            const isDozenWin = winningNum >= minNum && winningNum <= maxNum;

            if (isDozenWin) {
                state.stage = 'FOUR_CORNERS';
                state.cornerUnits = 1;
                state.currentCorners = getRandomNonOverlappingCorners();
            } else {
                state.stage = 'DOZEN_QUALIFIER';
                state.currentDozen = Math.floor(Math.random() * 3) + 1;
            }
        } else if (state.lastBetStage === 'FOUR_CORNERS') {
            const isCornerWin = state.currentCorners.some(c => getCornerNumbers(c).includes(winningNum));

            if (isCornerWin) {
                state.cornerUnits += 1;
                state.currentCorners = getRandomNonOverlappingCorners();
            } else {
                state.stage = 'DOZEN_QUALIFIER';
                state.cornerUnits = 1;
                state.currentDozen = Math.floor(Math.random() * 3) + 1;
            }
        }
    }

    // 4. Construct Bets
    const bets = [];

    if (state.stage === 'DOZEN_QUALIFIER') {
        let amount = Math.max(baseOutsideBet, minOutside);
        amount = Math.min(amount, maxBet, bankroll);

        if (amount >= minOutside) {
            bets.push({
                type: 'dozen',
                value: state.currentDozen,
                amount: amount
            });
            state.lastBetStage = 'DOZEN_QUALIFIER';
        }
    } else if (state.stage === 'FOUR_CORNERS') {
        let perCornerAmount = baseCornerBet * state.cornerUnits;
        perCornerAmount = Math.max(perCornerAmount, minInside);
        perCornerAmount = Math.min(perCornerAmount, maxBet);

        const totalWager = perCornerAmount * state.currentCorners.length;
        if (totalWager > bankroll) {
            perCornerAmount = Math.floor(bankroll / state.currentCorners.length);
        }

        if (perCornerAmount >= minInside && state.currentCorners.length === 4) {
            for (let i = 0; i < state.currentCorners.length; i++) {
                bets.push({
                    type: 'corner',
                    value: state.currentCorners[i],
                    amount: perCornerAmount
                });
            }
            state.lastBetStage = 'FOUR_CORNERS';
        } else {
            // Insufficient bankroll for inside corners; fallback to Stage 1
            state.stage = 'DOZEN_QUALIFIER';
            state.cornerUnits = 1;
            state.currentDozen = Math.floor(Math.random() * 3) + 1;
            let fallbackAmount = Math.min(baseOutsideBet, bankroll);
            if (fallbackAmount >= minOutside) {
                bets.push({
                    type: 'dozen',
                    value: state.currentDozen,
                    amount: fallbackAmount
                });
                state.lastBetStage = 'DOZEN_QUALIFIER';
            }
        }
    }

    return bets;
}