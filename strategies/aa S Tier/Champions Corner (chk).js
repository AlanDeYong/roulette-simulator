/**
 * Strategy Name: Champions Corner Roulette (by Keith) - Dynamic Random Layout
 * 
 * Source:
 * - URL: https://youtu.be/VB6o7RWfFZs
 * - Channel: The Roulette Master
 * 
 * Strategy Overview & Logic:
 * - The strategy places 6 non-overlapping Corner bets across the roulette layout, covering 24 numbers.
 * - Corner positions are randomly selected at the start of a cycle and remain fixed throughout that cycle.
 * - New random, non-overlapping corner positions are picked only when a cycle resets (after profit recovery or reaching target).
 * 
 * Progression & Rules:
 * 1. Base Level Win:
 *    - If all corner bets are at base level and a win occurs, keep bets at base level (rebet and collect profit).
 * 2. Total Loss (Miss or Zero):
 *    - If no corner hits, increase the bet amount on ALL 6 corners by 1 unit (+minIncrementalBet or base unit).
 * 3. Win During Progression (Recovery):
 *    - If cycle profit is recovered / reached: Reset bets to base unit and randomize a new set of 6 non-overlapping corners.
 *    - If still in recovery: Increase all corners by 1 unit EXCEPT the winning corner that just hit (it keeps its current bet amount).
 * 
 * Goal:
 * - Target profit: Cash out / reset cycle after achieving +20 to +25 units profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and incremental step
    const unit = config.betLimits.min;
    const increment = config.incrementMode === 'base' ? unit : (config.minIncrementalBet || unit);

    // 2. Helper Functions
    // Returns array of 4 numbers covered by a corner with top-left value n
    function getCornerNumbers(topLeft) {
        return [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];
    }

    // Check if winning number is covered by a corner
    function cornerCovers(topLeft, num) {
        if (num === 0 || num === '00' || num === null || num === undefined) return false;
        const n = Number(num);
        return n === topLeft || n === topLeft + 1 || n === topLeft + 3 || n === topLeft + 4;
    }

    // Generate 6 valid, non-overlapping corners randomly
    function pickRandomNonOverlappingCorners() {
        // Valid top-left corner numbers on a standard roulette table (1-32, excluding right column 3, 6, 9... and bottom row 34, 35, 36)
        const validTopLefts = [];
        for (let rowStart = 1; rowStart <= 31; rowStart += 3) {
            validTopLefts.push(rowStart);     // Column 1 (e.g. 1 covers 1,2,4,5)
            validTopLefts.push(rowStart + 1); // Column 2 (e.g. 2 covers 2,3,5,6)
        }

        // Shuffle candidate corner positions
        const shuffled = [...validTopLefts].sort(() => Math.random() - 0.5);
        const selectedCorners = [];
        const coveredNumbers = new Set();

        for (const corner of shuffled) {
            const nums = getCornerNumbers(corner);
            const overlaps = nums.some(n => coveredNumbers.has(n));

            if (!overlaps) {
                selectedCorners.push(corner);
                nums.forEach(n => coveredNumbers.add(n));
                if (selectedCorners.length === 6) break;
            }
        }

        // Fallback in case random pick resulted in fewer than 6 due to tight layout packing
        if (selectedCorners.length < 6) {
            return [1, 7, 13, 19, 25, 31];
        }

        return selectedCorners;
    }

    // Initialize or reset cycle setup
    function resetCycle(currentBankroll) {
        state.cornerPositions = pickRandomNonOverlappingCorners();
        state.bets = {};
        state.cornerPositions.forEach(c => {
            state.bets[c] = unit;
        });
        state.inProgression = false;
        state.cycleStartBankroll = currentBankroll;
    }

    // 3. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.startBankroll = bankroll;
        state.targetProfit = unit * 25;
        resetCycle(bankroll);
    }

    // 4. Process Previous Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Find which active corner won, if any
        let winningCorner = null;
        for (const c of state.cornerPositions) {
            if (cornerCovers(c, winningNum)) {
                winningCorner = c;
                break;
            }
        }

        if (winningCorner !== null) {
            // A corner hit
            if (bankroll >= state.cycleStartBankroll + (unit * 2)) {
                // Cycle recovered / profit achieved -> Reset and pick new random non-overlapping corners
                resetCycle(bankroll);
            } else if (!state.inProgression) {
                // Win at base level -> maintain corners and base bet
                state.cornerPositions.forEach(c => {
                    state.bets[c] = unit;
                });
                state.cycleStartBankroll = bankroll;
            } else {
                // Win in progression but not fully in profit yet:
                // Increase all corners by 1 unit EXCEPT the winning corner
                state.cornerPositions.forEach(c => {
                    if (c !== winningCorner) {
                        state.bets[c] = (state.bets[c] || unit) + increment;
                    }
                });
            }
        } else {
            // Loss (missed or zero) -> All active corners increase by 1 increment
            state.inProgression = true;
            state.cornerPositions.forEach(c => {
                state.bets[c] = (state.bets[c] || unit) + increment;
            });
        }
    }

    // 5. Target Profit Check
    if (bankroll - state.startBankroll >= state.targetProfit) {
        resetCycle(bankroll);
    }

    // 6. Build Bet Array Clamped to Table Limits
    const betOrders = [];
    for (const c of state.cornerPositions) {
        let amount = state.bets[c] || unit;

        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        betOrders.push({
            type: 'corner',
            value: c,
            amount: amount
        });
    }

    return betOrders;
}