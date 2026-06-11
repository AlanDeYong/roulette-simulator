/**
 * Cornerstone Roulette Strategy (Revised Layout Definition with State Locking)
 * * Source:
 * - Channel: Gamblers University
 * - Video: Cornerstone Roulette Strategy!- Protect Your Bankroll!
 * - URL: https://youtu.be/KP-MwV4GHJs
 * * Full Logic & Conditions:
 * - The strategy covers specific zones using customized "Cornerstone Layouts".
 * - A single Layout consists of:
 * - 1 Corner bet (value = top-left number)
 * - 2 Split bets matching the top-left to bottom-right progression (e.g., for corner 1, splits are 1/4 and 2/5).
 * - Constraints for Layout placement:
 * - Layouts must be entirely contained within a single Dozen.
 * - Layouts cannot occupy invalid rows where a second layout wouldn't fit (e.g., top-left 4 is invalid because it blocks the dozen).
 * - Active layouts must never overlap each other.
 * - **State Locking Rule**: Once a set of layout positions is chosen, their positions **do not change** until a session reset (win) occurs. Progressions only increase the bet sizes and add new layout modules seamlessly without shifting existing ones.
 * - Triggers:
 * - Session starts with 2 valid layouts selected randomly.
 * - On the 1st loss at any level, the layout configuration and bet amounts remain flat.
 * - On the 2nd consecutive loss at a level, the progression advances: bet amounts increase and 1 new random, non-overlapping layout is appended to the existing selections.
 * - On any win, a session reset occurs: the active layout count decreases by 1 (clamped to a minimum of 2), the level drops back down by 1, and the positions are completely unlocked, randomized, and reshuffled.
 * * Full Bet Progression & Sizing:
 * - Sizing works in synchronized unit blocks across all active positions based on the progression level:
 * - Level 1: 2 Layouts active, 1 unit per position (6 total bets).
 * - Level 2: 3 Layouts active, 2 units per position (9 total bets).
 * - Level 3: 4 Layouts active, 3 units per position (12 total bets).
 * - Level 4: 5 Layouts active, 4 units per position (15 total bets).
 * * Goal:
 * - Target: Session ends and bets cease after achieving 3 total winning spins.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;

    // Generate the full coverage array of single number squares for a layout centered on a top-left corner
    function getLayoutCoverage(cornerVal) {
        return [cornerVal, cornerVal + 1, cornerVal + 3, cornerVal + 4];
    }

    // Generate the precise bet objects for a single structural layout unit
    function buildLayoutBets(cornerVal, amount) {
        return [
            { type: 'corner', value: cornerVal, amount: amount },
            { type: 'split', value: [cornerVal, cornerVal + 3], amount: amount }, // e.g. 1/4
            { type: 'split', value: [cornerVal + 1, cornerVal + 4], amount: amount } // e.g. 2/5
        ];
    }

    // Appends a new non-overlapping random layout to an existing array of layouts
    function appendRandomLayout(existingCorners, totalTargetCount) {
        const currentCorners = [...existingCorners];
        let masterPool = [1, 2, 7, 8, 13, 14, 19, 20, 25, 26, 31, 32];

        // Shuffle pool to pick randomly
        masterPool = masterPool.sort(() => Math.random() - 0.5);

        for (let corner of masterPool) {
            if (currentCorners.length >= totalTargetCount) break;

            // Enforce non-overlapping layout constraint verification checks
            let hasOverlap = false;
            const currentCoverage = getLayoutCoverage(corner);

            for (let activeCorner of currentCorners) {
                const activeCoverage = getLayoutCoverage(activeCorner);
                if (currentCoverage.some(num => activeCoverage.includes(num))) {
                    hasOverlap = true;
                    break;
                }
            }

            if (!hasOverlap) {
                currentCorners.push(corner);
            }
        }
        return currentCorners;
    }

    // Initialize Persistent State Parameters
    if (!state.init) {
        state.level = 1;
        state.activeLayoutCount = 2; 
        state.lossStreak = 0;
        state.totalWins = 0;
        state.activeCorners = appendRandomLayout([], 2); // Pick first 2 layouts cleanly
        state.init = true;
    }

    // Check if session goal achieved
    if (state.totalWins >= 300) {
        return [];
    }

    // Process progression evaluation from historical logs
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        let wonLastSpin = false;

        // Verify if the winning number hits any of our active layout grids
        for (let corner of state.activeCorners) {
            if (getLayoutCoverage(corner).includes(lastSpin.winningNumber)) {
                wonLastSpin = true;
                break;
            }
        }

        if (wonLastSpin) {
            state.totalWins++;
            state.lossStreak = 0;
            state.level = Math.max(1, state.level - 1);
            state.activeLayoutCount = Math.max(2, state.activeLayoutCount - 1);
            
            // Win Reset Occurs: Layouts are completely wiped and fresh random positions are generated
            state.activeCorners = appendRandomLayout([], state.activeLayoutCount);
        } else {
            state.lossStreak++;
            // Step up tracking parameters cleanly after every second consecutive loss
            if (state.lossStreak >= 2) {
                state.level = Math.min(4, state.level + 1);
                state.activeLayoutCount = Math.min(5, state.activeLayoutCount + 1);
                state.lossStreak = 0;
                
                // Progression step: Keep current corners locked, seamlessly append a new layout unit
                state.activeCorners = appendRandomLayout(state.activeCorners, state.activeLayoutCount);
            }
        }
    }

    // Double check target constraint boundaries before pushing operational objects
    if (state.totalWins >= 300) {
        return [];
    }

    // Assemble absolute runtime execution tracking properties
    let selections = [];
    let betAmount = unit * state.level;

    // Safety layer verification clamping configurations
    betAmount = Math.min(betAmount, config.betLimits.max);

    for (let corner of state.activeCorners) {
        const layoutBets = buildLayoutBets(corner, betAmount);
        selections = selections.concat(layoutBets);
    }

    return selections;
}