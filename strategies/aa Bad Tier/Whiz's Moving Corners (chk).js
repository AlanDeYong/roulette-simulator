/**
 * Roulette Strategy: Whiz's Moving Corners (Strict Outer-Diagonal Patterns)
 * * Source:
 * - Video URL: https://youtu.be/YH6itOhGDbA
 * - Channel Name: The Roulette Master
 * * Logic & Spatial Board Constraints:
 * 1. The strategy triggers bets on every single spin.
 * 2. It deploys dynamic corner (square) bets arranged diagonally across the table board grid, 
 * along with a single layout column bet on the 2nd Column (2 to 1 payout), and a protection bet on Zero.
 * 3. Exact Pattern Grid Constraints:
 * - Corners are placed strictly on the outer edges of dozens to ensure they are adjacent, diagonal, 
 * non-overlapping, and leave valid legal space for a secondary pair within that exact same dozen:
 * * Track A: 1 (D1), 8 (D1), 13 (D2), 20 (D2), 25 (D3)
 * * Track B: 2 (D1), 7 (D1), 14 (D2), 19 (D2), 26 (D3)
 * * Bet Progression Details:
 * 1. Base Setup: Begins with 3 Corner positions at 1 base unit each ($5 each), 1 Column position on the 2nd Column 
 * at 1 base unit ($5), and a direct single unit hedge protective layout marker on Zero ($2).
 * 2. Loss Handling Strategy (Safer Progression):
 * - After the 1st Loss: Do NOT alter the absolute size units of current layout coordinates. Add a 4th Corner position 
 * from the chosen diagonal pattern track ($5) to widen board grid net coverage.
 * - After the 2nd Consecutive Loss: Incorporate a 5th Corner layout coverage point ($5). Simultaneously, upgrade 
 * the wager units on all existing layout components flatly by 1 unit offset layer ($5 added to every corner position, 
 * and $2 added to the layout component on Zero). 
 * - For any further extended down-cycles, everything upgrades flatly step-by-step by its initial base layout configuration 
 * units instead of aggressively compounding exponential multiplier arrays like classic Martingale methods.
 * 3. Win Handling & Reset Strategy:
 * - Full Reset: Executed ONLY when the system recovers all past drawdowns and hits or exceeds peak session profit (`bankroll >= state.highestBankroll`). 
 * - Partial Recovery Win: If a win occurs but bankroll remains underneath the peak target baseline, the progression drops back down by exactly 1 level (`state.currentLevel--`). 
 * Corners remain at max coverage (5 corners) if currently expanded, ensuring optimal recovery footprint until peak is cleared.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // -------------------------------------------------------------------------
    // 1. INITIALIZE CONSTANTS AND STATIC RULES
    // -------------------------------------------------------------------------
    const BASE_CORNER_AMOUNT = Math.max(5, config.betLimits.min);
    const BASE_COLUMN_AMOUNT = Math.max(5, config.betLimits.minOutside);
    const BASE_ZERO_AMOUNT   = Math.max(2, config.betLimits.min);
    const COLUMN_TARGET      = 2; 

    // The two explicit geometric layout tracks meeting the non-overlapping paired dozen rule
    const TRACK_A = [1, 8, 13, 20, 25]; 
    const TRACK_B = [2, 7, 14, 19, 26]; 

    // -------------------------------------------------------------------------
    // 2. INITIALIZE PERSISTENT STATE OBJECTS
    // -------------------------------------------------------------------------
    if (state.isInitialized === undefined) {
        state.currentLevel       = 1;     
        state.activeCornersCount = 3;     
        state.highestBankroll    = bankroll;
        // Randomly select one of the two strict diagonal template tracks for this session run
        state.selectedTrack      = Math.random() < 0.5 ? 'A' : 'B';
        state.isInitialized      = true;
    }

    // Capture the initial highest bankroll before evaluating the historical run
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    // -------------------------------------------------------------------------
    // 3. ANALYZE SPIN HISTORY AND ASSESS PERFORMANCE TRENDS
    // -------------------------------------------------------------------------
    let lastRoundWon = false;

    if (spinHistory && spinHistory.length > 0 && state.previousBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        let hitCorner = false;
        let hitColumn = false;
        let hitZero   = false;

        state.previousBets.forEach(b => {
            if (b.type === 'corner') {
                const tl = b.value;
                const covered = [tl, tl + 1, tl + 3, tl + 4];
                if (covered.includes(num)) hitCorner = true;
            }
            if (b.type === 'column' && num !== 0 && num % 3 === 2) {
                hitColumn = true;
            }
            if (b.type === 'number' && b.value === 0 && num === 0) {
                hitZero = true;
            }
        });

        if (hitCorner || hitColumn || hitZero) {
            lastRoundWon = true;
        }

        // Apply progressive stepping and regressive leveling modifications
        if (lastRoundWon) {
            if (bankroll >= state.highestBankroll) {
                // Hard Reset: Reached or surpassed session peak profit boundaries
                state.currentLevel = 1;
                state.activeCornersCount = 3;
                state.selectedTrack = Math.random() < 0.5 ? 'A' : 'B';
            } else {
                // Win but not in peak profit: Drop progression down by exactly 1 level
                state.currentLevel = Math.max(1, state.currentLevel - 1);
                
                // If dropping back down to level 1 from level 2, safely drop coverage back to base standard
                if (state.currentLevel === 1) {
                    state.activeCornersCount = 3;
                }
            }
        } else {
            // Loss path progression logic
            if (state.activeCornersCount === 3) {
                state.activeCornersCount = 4;
            } else if (state.activeCornersCount === 4) {
                state.activeCornersCount = 5;
                state.currentLevel = 2;
            } else {
                state.currentLevel++;
            }
        }
    }

    // -------------------------------------------------------------------------
    // 4. MAP TARGET LABELS BASED ON THE ACTIVE SELECTED TRACK DIAGONAL
    // -------------------------------------------------------------------------
    const activePatternArray = state.selectedTrack === 'A' ? TRACK_A : TRACK_B;
    const workingCornerPositions = [];

    for (let i = 0; i < state.activeCornersCount; i++) {
        workingCornerPositions.push(activePatternArray[i]);
    }

    // -------------------------------------------------------------------------
    // 5. CALCULATE BET LAYOUT OBJECT ARRAYS AND CLAMP TO LIMITS
    // -------------------------------------------------------------------------
    const bets = [];
    let cornerBetAmount = BASE_CORNER_AMOUNT * state.currentLevel;
    let columnBetAmount = BASE_COLUMN_AMOUNT * state.currentLevel;
    let zeroBetAmount   = BASE_ZERO_AMOUNT * state.currentLevel;

    // Apply corner arrays
    workingCornerPositions.forEach(val => {
        let finalCornerAmount = Math.min(Math.max(cornerBetAmount, config.betLimits.min), config.betLimits.max);
        bets.push({
            type: 'corner',
            value: val,
            amount: finalCornerAmount
        });
    });

    // Apply column structural placement
    let finalColumnAmount = Math.min(Math.max(columnBetAmount, config.betLimits.minOutside), config.betLimits.max);
    bets.push({
        type: 'column',
        value: COLUMN_TARGET,
        amount: finalColumnAmount
    });

    // Apply standard zero layout coverage position marker
    let finalZeroAmount = Math.min(Math.max(zeroBetAmount, config.betLimits.min), config.betLimits.max);
    bets.push({
        type: 'number',
        value: 0,
        amount: finalZeroAmount
    });

    // -------------------------------------------------------------------------
    // 6. RISK CONTROLLER AND STATE PERSISTENCE SAVE
    // -------------------------------------------------------------------------
    let totalRequiredCapital = bets.reduce((sum, b) => sum + b.amount, 0);

    if (totalRequiredCapital > bankroll) {
        return [];
    }

    state.previousBets = bets;

    return bets;
}