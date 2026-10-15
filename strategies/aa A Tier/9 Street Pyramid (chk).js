/**
 * ------------------------------------------------------------------------------------------------
 * STRATEGY: 9 Street Pyramid (Random Non-Overlapping Corners)
 * ------------------------------------------------------------------------------------------------
 * Source:
 *   - Channel: WillVegas Roulette (WillVegas)
 *   - Video: "🔥 9 STREET PYRAMID Roulette Strategy! | Can This System Beat the Wheel? 🎰"
 *   - URL: https://youtu.be/jCOUFIm6HEY
 *
 * Strategy Overview & Logic:
 *   The "9 Street Pyramid" covers 27 numbers via 9 Street bets (Streets 7 to 31, spanning numbers
 *   7 through 33). Upon winning a base street bet, the system advances to Phase B and reinvests the
 *   profit by adding 3 randomly selected, strictly non-overlapping Corner bets placed entirely within
 *   the 9-street zone (7 to 33).
 *
 * 1. Covered Positions:
 *    - 9 Streets: Street 7 (7-9), Street 10 (10-12), Street 13 (13-15), Street 16 (16-18),
 *                 Street 19 (19-21), Street 22 (22-24), Street 25 (25-27), Street 28 (28-30),
 *                 Street 31 (31-33). (Leaves 0, 1-6, and 34-36 open).
 *    - 3 Random Non-Overlapping Corners (Phase B):
 *                 Selected randomly from all valid corners contained within [7..33] such that
 *                 no two corners share any numbers.
 *
 * 2. Two-Phase Structure:
 *    - Phase A (Streets Base):
 *      Place current level units on each of the 9 Streets (Total: 9 units).
 *      - If a Street hits (+3 units net): Advance to Phase B, generating 3 new random corners.
 *      - If an uncovered number hits (Loss): Level + 1, remain in Phase A.
 *
 *    - Phase B (Pyramid / Jackpot Active):
 *      Place current level units on the 9 Streets + the 3 active Corners (Total: 12 units).
 *      - If a Jackpot Corner hits: Both Street and Corner win. Reset level to 1 and return to Phase A.
 *      - If a Street hits without a Corner: Net Push (0). Retain active corners and stay in Phase B.
 *      - If an uncovered number hits (Loss): Level + 1, clear corners, and return to Phase A.
 *
 * 3. The Goal:
 *    - Target Profit: +$150 profit (or session baseline target).
 * ------------------------------------------------------------------------------------------------
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min || 1;
    const maxBet = config.betLimits.max || 500;

    // Helper: Returns the 4 numbers covered by a corner with top-left value `c`
    function getCornerNumbers(c) {
        return [c, c + 1, c + 3, c + 4];
    }

    // Helper: Randomly picks 3 non-overlapping corners strictly within numbers 7 to 33
    function selectRandomNonOverlappingCorners() {
        // All valid corner top-left values contained entirely in [7..33]
        const candidateCorners = [7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29];
        
        // Fisher-Yates shuffle
        for (let i = candidateCorners.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = candidateCorners[i];
            candidateCorners[i] = candidateCorners[j];
            candidateCorners[j] = temp;
        }

        const selectedCorners = [];
        const coveredNumbers = new Set();

        for (let i = 0; i < candidateCorners.length; i++) {
            const c = candidateCorners[i];
            const nums = getCornerNumbers(c);
            
            // Check if this corner overlaps with any already-selected corner
            const overlaps = nums.some(n => coveredNumbers.has(n));
            if (!overlaps) {
                selectedCorners.push(c);
                nums.forEach(n => coveredNumbers.add(n));
                if (selectedCorners.length === 3) break;
            }
        }

        return {
            corners: selectedCorners,
            jackpotNumbers: Array.from(coveredNumbers)
        };
    }

    // 1. Initialize Persistent State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.phase = 'PHASE_A';
        state.activeCorners = [];
        state.jackpotNumbers = [];
        state.initialBankroll = bankroll;
        state.targetProfit = 150;
    }

    // 2. Process Previous Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Street hit check (7 to 33)
        const isStreetHit = winningNum >= 7 && winningNum <= 33;
        const isCornerHit = state.jackpotNumbers.includes(winningNum);

        if (state.phase === 'PHASE_A') {
            if (isStreetHit) {
                // Street win: transition to Phase B and pick 3 random non-overlapping corners
                const selection = selectRandomNonOverlappingCorners();
                state.activeCorners = selection.corners;
                state.jackpotNumbers = selection.jackpotNumbers;
                state.phase = 'PHASE_B';
            } else {
                // Loss: step up progression
                const inc = config.incrementMode === 'base' ? 1 : (config.minIncrementalBet || 1);
                state.level += inc;
                state.phase = 'PHASE_A';
            }
        } else if (state.phase === 'PHASE_B') {
            if (isCornerHit) {
                // Jackpot hit: both street and corner win
                state.level = 1;
                state.phase = 'PHASE_A';
                state.activeCorners = [];
                state.jackpotNumbers = [];
            } else if (isStreetHit) {
                // Push: maintain active corners and stay in Phase B
                state.phase = 'PHASE_B';
            } else {
                // Uncovered loss: step up progression and return to Phase A
                const inc = config.incrementMode === 'base' ? 1 : (config.minIncrementalBet || 1);
                state.level += inc;
                state.phase = 'PHASE_A';
                state.activeCorners = [];
                state.jackpotNumbers = [];
            }
        }

        // Target profit reset check
        if (bankroll >= state.initialBankroll + state.targetProfit) {
            state.level = 1;
            state.phase = 'PHASE_A';
            state.activeCorners = [];
            state.jackpotNumbers = [];
            state.initialBankroll = bankroll;
        }
    }

    // 3. Compute Clamped Bet Amount
    let betAmount = unit * state.level;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, maxBet);

    // 4. Construct Bets Array
    const bets = [];

    // The 9 Streets covering 7 through 33
    const streetStarts = [7, 10, 13, 16, 19, 22, 25, 28, 31];
    for (let i = 0; i < streetStarts.length; i++) {
        bets.push({
            type: 'street',
            value: streetStarts[i],
            amount: betAmount
        });
    }

    // Phase B: add the 3 active random non-overlapping corners
    if (state.phase === 'PHASE_B' && state.activeCorners.length > 0) {
        for (let i = 0; i < state.activeCorners.length; i++) {
            bets.push({
                type: 'corner',
                value: state.activeCorners[i],
                amount: betAmount
            });
        }
    }

    return bets;
}