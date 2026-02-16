/**
 * STRATEGY: Moving Boxes (Modified Kentucky White)
 * SOURCE: Bet With Mo - https://www.youtube.com/watch?v=_2g2k9xr3nM
 *
 * THE LOGIC:
 * This is a negative progression strategy using "Corner" bets (covering 4 numbers).
 * The core concept is to cover specific sectors of the board ("Boxes") while leaving
 * gaps ("Streets") between them to maximize spread. The bets "move" (randomize position)
 * or increase in volume/value after losses.
 *
 * THE PROGRESSION (8 Levels):
 * - Level 1: 3 Corners (1 unit each). Total Risk: 3 units.
 * - Level 2: 4 Corners (1 unit each). Total Risk: 4 units.
 * - Level 3: 4 Corners (2 units each). Total Risk: 8 units.
 * - Level 4: 4 Corners (3 units each). Total Risk: 12 units.
 * - Level 5: 4 Corners (5 units each). (Video calls this the "Booster" level).
 * - Level 6: 4 Corners (10 units each). (Doubling previous total exposure).
 * - Level 7: 4 Corners (20 units each).
 * - Level 8: 4 Corners (40 units each).
 *
 * RULES:
 * 1. "Leave a Street": When placing corners, there must be a gap of at least one row
 * between selections to avoid clustering too tightly.
 * 2. On Win: Reset to Level 1.
 * 3. On Loss: Move to the next Level. If Level 8 loses, reset to Level 1 (Stop Loss).
 * 4. "Moving": The specific corners chosen are randomized every spin to simulate
 * the "moving" aspect described in the video.
 *
 * NOTE:
 * The video mentions placing chips "in the center" for Level 5. Mathematically and
 * visually on the table, this equates to increasing the stake on the Corner intersection.
 * This script interprets Level 5 as a significant jump in unit size per corner.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---

    // Define the 8-Level Progression (Units per Corner)
    // L1 uses 3 corners, L2-L8 use 4 corners.
    const PROGRESSION = [
        { corners: 3, units: 1 },  // Level 1
        { corners: 4, units: 1 },  // Level 2
        { corners: 4, units: 2 },  // Level 3
        { corners: 4, units: 3 },  // Level 4
        { corners: 4, units: 5 },  // Level 5 (Booster)
        { corners: 4, units: 10 }, // Level 6 (Martingale begins)
        { corners: 4, units: 20 }, // Level 7
        { corners: 4, units: 40 }  // Level 8
    ];

    // Initialize State if first run
    if (state.level === undefined) {
        state.level = 0; // Index of PROGRESSION array (0 = Level 1)
        state.totalProfit = 0;
        state.startBankroll = bankroll;
    }

    // Determine Base Unit (Use limits from config)
    // Corner bets are 'Inside' bets, so we use min, not minOutside
    const baseUnit = config.betLimits.min;

    // --- 2. ANALYZE PREVIOUS SPIN ---

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBetAmount = state.lastTotalBet || 0;

        // Calculate if we won based on bankroll change
        // (Simulator handles payouts, so strictly checking bankroll delta is safest)
        const won = (bankroll > state.previousBankroll);

        if (won) {
            // WIN: Reset to Level 1
            state.level = 0;
        } else {
            // LOSS: Increase Level
            state.level++;

            // STOP LOSS: If we exceed Level 8, reset to 1 (or stop)
            if (state.level >= PROGRESSION.length) {
                // Determine if we should stop or reset.
                // For this simulation, we reset to Level 1 to keep playing.
                state.level = 0;
            }
        }
    }

    // Update 'previousBankroll' for the next spin's comparison
    state.previousBankroll = bankroll;

    // --- 3. GENERATE BETS FOR CURRENT LEVEL ---

    const currentStage = PROGRESSION[state.level];
    const numCorners = currentStage.corners;
    const unitsPerCorner = currentStage.units;

    // Helper: Calculate amount strictly respecting limits
    let betAmount = unitsPerCorner * baseUnit;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // --- 4. SELECT CORNERS (The "Moving" Logic) ---

    // Grid of valid top-left numbers for Corners (1, 2, 4, 5... 32)
    // We organize them by "Rows" to handle the "Leave a Street" rule.
    // A Roulette board has 12 rows. A corner sits on the line between rows.
    // Valid Corner Top-Lefts by Row Start:
    // Row 1: 1, 2
    // Row 2: 4, 5
    // Row 3: 7, 8 ... up to Row 11: 31, 32
    // (Row 12 [34] cannot be a top-left of a corner)

    const availableRowIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    // We need to pick 'numCorners' rows that are NOT adjacent (leaving a street/gap).
    // Simple randomization approach with validation:
    let selectedCorners = [];
    let attempts = 0;

    while (selectedCorners.length < numCorners && attempts < 100) {
        attempts++;
        selectedCorners = []; // Reset and try to build a valid set

        // Shuffle rows to randomize ("Move" the boxes)
        let shuffledRows = [...availableRowIndices].sort(() => 0.5 - Math.random());

        for (let row of shuffledRows) {
            // Check if this row is too close to any already selected row
            // "Leave a street" implies avoiding the immediate next row.
            // Distance between row indices must be > 1.
            const isTooClose = selectedCorners.some(selected => Math.abs(selected.row - row) <= 1);

            if (!isTooClose) {
                // Valid Row. Now pick Left (col 1) or Right (col 2) corner randomly.
                // Row n starts at number: (n-1)*3 + 1
                // Corner Left is that number. Corner Right is that number + 1.
                const rowStartNum = (row - 1) * 3 + 1;
                const offset = Math.random() < 0.5 ? 0 : 1; // 0 for left, 1 for right
                const cornerVal = rowStartNum + offset;

                selectedCorners.push({ row: row, val: cornerVal });

                if (selectedCorners.length === numCorners) break;
            }
        }
    }

    // Fallback: If strict spacing fails (rare with 4 corners), just pick random valid corners
    if (selectedCorners.length < numCorners) {
        selectedCorners = [];
        const allCorners = [];
        for (let r = 1; r <= 11; r++) {
            allCorners.push((r - 1) * 3 + 1); // Left
            allCorners.push((r - 1) * 3 + 2); // Right
        }
        // Shuffle and pick
        const shuffled = allCorners.sort(() => 0.5 - Math.random());
        for (let i = 0; i < numCorners; i++) {
            selectedCorners.push({ val: shuffled[i] });
        }
    }

    // --- 5. CONSTRUCT BET ARRAY ---

    const bets = selectedCorners.map(c => ({
        type: 'corner',
        value: c.val,
        amount: betAmount
    }));

    // Record total bet for next spin analysis
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);

    return bets;
}