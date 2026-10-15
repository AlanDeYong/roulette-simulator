/**
 * ============================================================================
 * ROULETTE STRATEGY: THE TROJAN GRID (DYNAMIC NON-OVERLAPPING SELECTION)
 * ============================================================================
 * Source:
 *   - Channel: The Lucky Felt (Todd Hoover)
 *   - Video URL: https://youtu.be/94oyJU7EQgc
 *   - Strategy: The Trojan Grid (Stealth 50/50 Inside-Bet System)
 *
 * Full Logic in Detail:
 *   - The strategy dynamically selects 2 Six-Line (Double Street) bets and
 *     3 non-overlapping Split bets to cover exactly 18 distinct numbers.
 *   - Once the layout is randomly generated, the chosen positions remain locked
 *     across spins until a session reset occurs (upon reaching net profit / target
 *     or triggering the level-4 hard stop).
 *   - Mathematically Balanced 1:1 Payout Floor:
 *       * Each Six-Line bet has a weight of 3 units (pays 5:1 -> returns 18 units).
 *       * Each Split bet has a weight of 1 unit (pays 17:1 -> returns 18 units).
 *       * Total base bet is 9 units across 18 numbers, ensuring a flat 1:1 net return on any hit.
 *
 * Full Bet Progression (D'Alembert with Level-4 Safety Cap):
 *   - Base Unit: Derived from inside bet limits (config.betLimits.min).
 *   - Level 1: 9 units (2x Six Lines @ 3 units, 3x Splits @ 1 unit).
 *   - On Loss: Increase progression level by +1 (Level 1 -> 2 -> 3 -> 4).
 *   - On Win:
 *       * If session is in net profit (current bankroll > initial bankroll) or reaches
 *         target profit (+20%), reset level to 1 and re-randomize positions.
 *       * Otherwise, step down 1 level in progression (e.g., Level 4 -> 3 -> 2 -> 1).
 *   - Hard Stop / Safety Reset: If a loss occurs at Level 4 (36 units), do not progress
 *     to 45 units; reset immediately to Level 1 and re-randomize board positions.
 *
 * Target Profit:
 *   - +20% of starting bankroll.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Helper function: Randomly generate 2 non-overlapping lines and 3 non-overlapping splits
    function generateTrojanGrid() {
        // Available line start numbers on standard European/American layout: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
        const allLineStarts = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31];
        
        // Shuffle line starts to pick 2 completely non-overlapping six-lines
        const shuffledLines = allLineStarts.slice().sort(() => Math.random() - 0.5);
        let line1 = null;
        let line2 = null;

        for (let i = 0; i < shuffledLines.length; i++) {
            const start1 = shuffledLines[i];
            for (let j = i + 1; j < shuffledLines.length; j++) {
                const start2 = shuffledLines[j];
                // Two lines do not overlap if their start indices differ by at least 6
                if (Math.abs(start1 - start2) >= 6) {
                    line1 = start1;
                    line2 = start2;
                    break;
                }
            }
            if (line1 !== null) break;
        }

        // Track all numbers covered by the 2 lines (12 numbers total)
        const coveredNumbers = new Set();
        for (let n = line1; n < line1 + 6; n++) coveredNumbers.add(n);
        for (let n = line2; n < line2 + 6; n++) coveredNumbers.add(n);

        // Generate all valid adjacent splits (horizontal and vertical) across the 1-36 grid
        const allPossibleSplits = [];
        for (let num = 1; num <= 36; num++) {
            // Horizontal split (right neighbor in the same 3-number street)
            if (num % 3 !== 0 && num + 1 <= 36) {
                allPossibleSplits.push([num, num + 1]);
            }
            // Vertical split (downward neighbor in the next street)
            if (num + 3 <= 36) {
                allPossibleSplits.push([num, num + 3]);
            }
        }

        // Shuffle splits and pick 3 non-overlapping splits from the remaining 24 uncovered numbers
        const shuffledSplits = allPossibleSplits.sort(() => Math.random() - 0.5);
        const selectedSplits = [];

        for (const split of shuffledSplits) {
            const [n1, n2] = split;
            if (!coveredNumbers.has(n1) && !coveredNumbers.has(n2)) {
                selectedSplits.push(split);
                coveredNumbers.add(n1);
                coveredNumbers.add(n2);
                if (selectedSplits.length === 3) break;
            }
        }

        return {
            lines: [line1, line2],
            splits: selectedSplits
        };
    }

    // 2. Determine base unit respecting inside bet limits
    const insideMin = (config.betLimits && config.betLimits.min) ? config.betLimits.min : 2;
    const maxBetLimit = (config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
    const baseUnit = insideMin;

    // 3. Initialize persistent state
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.progressionLevel = 1; // 1 to 4
        state.maxLevel = 4;
        state.targetProfit = (config.startingBankroll || bankroll) * 0.20;
        state.lastBankroll = bankroll;
        state.grid = generateTrojanGrid();
    }

    // 4. Process previous spin result if available
    if (spinHistory && spinHistory.length > 0) {
        const isWin = bankroll > state.lastBankroll;
        const currentProfit = bankroll - state.initialBankroll;

        if (isWin) {
            // Reset to Level 1 and select new layout on reaching session profit or target
            if (currentProfit >= state.targetProfit || currentProfit > 0) {
                state.progressionLevel = 1;
                state.grid = generateTrojanGrid();
            } else {
                // Step back 1 level in D'Alembert
                state.progressionLevel = Math.max(1, state.progressionLevel - 1);
            }
        } else {
            // Loss occurred
            if (state.progressionLevel >= state.maxLevel) {
                // Hard stop triggered at Level 4 - reset to Level 1 and re-randomize layout
                state.progressionLevel = 1;
                state.grid = generateTrojanGrid();
            } else {
                // Step up progression level
                state.progressionLevel += 1;
            }
        }
    }

    // Update last bankroll for next turn
    state.lastBankroll = bankroll;

    // Ensure layout exists in state
    if (!state.grid || !state.grid.lines || !state.grid.splits) {
        state.grid = generateTrojanGrid();
    }

    // 5. Calculate unit amounts according to progression level
    const level = state.progressionLevel;
    const sixLineUnits = 3 * level;
    const splitUnits = 1 * level;

    const clampBet = (amount) => {
        let clamped = Math.max(amount, insideMin);
        clamped = Math.min(clamped, maxBetLimit);
        return clamped;
    };

    const sixLineAmount = clampBet(sixLineUnits * baseUnit);
    const splitAmount = clampBet(splitUnits * baseUnit);

    // 6. Build bet array using the locked random grid
    const bets = [
        { type: 'line', value: state.grid.lines[0], amount: sixLineAmount },
        { type: 'line', value: state.grid.lines[1], amount: sixLineAmount },
        { type: 'split', value: state.grid.splits[0], amount: splitAmount },
        { type: 'split', value: state.grid.splits[1], amount: splitAmount },
        { type: 'split', value: state.grid.splits[2], amount: splitAmount }
    ];

    // Bankroll check
    const totalRequired = (sixLineAmount * 2) + (splitAmount * 3);
    if (bankroll < totalRequired) {
        return null;
    }

    return bets;
}