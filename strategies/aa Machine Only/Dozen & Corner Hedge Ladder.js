<<<<<<< HEAD
/**
 * STRATEGY: Dozen & Corner Hedge Ladder
 * * THE LOGIC:
 * 1. Target Selection: Look at the Dozen that hit *before* the current winning Dozen.
 * (e.g., If history is [D1, D2, D3], current is D3. The one before D3 was D2. Target D2.)
 * 2. Structure: 
 * - Main Bet: The Target Dozen.
 * - Hedge Bets: "Upper Left" and "Upper Right" Corners within that Dozen.
 * * THE PROGRESSION (Specific Ladder):
 * - Level 1 (Start): Dozen ($4), Left Corner ($2), Right Corner ($0).
 * - Level 2 (Loss): Add Right Corner ($2), Dozen (+$3). -> D($7), L($2), R($2).
 * - Level 3 (Loss): Add Left Corner ($1), Dozen (+$2). -> D($9), L($3), R($2).
 * - Level 4+ (Loss): Alternate adding to Right then Left.
 * - Rule: When adding to Right, Dozen +$3. When adding to Left, Dozen +$2.
 * - Corner Increments: Assumed $2 for Right, $1 for Left based on steps 5 & 6.
 * * THE GOAL:
 * - Reset progression on any WIN.
 * - Reset strategy completely if "Session Profit" is reached (e.g., +100 units).
 * - On Loss, stay on the SAME Dozen and climb the ladder.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---
    const SESSION_TARGET = 100; // Reset if we make this much profit
    const DOZEN_IDS = { 1: '1st 12', 2: '2nd 12', 3: '3rd 12' };

    // Corner Definitions (Top-Left number of the corner block)
    // "Upper Left" = First valid corner in the dozen
    // "Upper Right" = Last valid corner in the dozen
    const CORNERS = {
        1: { left: 1, right: 8 },   // D1 (1-12): Covers 1-5 and 8-12
        2: { left: 13, right: 20 }, // D2 (13-24): Covers 13-17 and 20-24
        3: { left: 25, right: 32 }  // D3 (25-36): Covers 25-29 and 32-36
    };

    // --- 2. HELPERS ---
    const getDozen = (num) => {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null; // 0
    };

    // --- 3. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.progression = 1;
        state.targetDozen = null;
        state.startBankroll = bankroll;
        state.initialized = true;
    }

    // Check Session Profit
    const currentProfit = bankroll - state.startBankroll;
    if (currentProfit >= SESSION_TARGET) {
        // Reset everything if session goal reached
        state.progression = 1;
        state.targetDozen = null;
        state.startBankroll = bankroll; // Reset baseline
        // console.log("Session Target Reached. Resetting.");
    }

    // --- 4. HISTORY ANALYSIS & WIN/LOSS CHECK ---
    // We only check win/loss if we actually had a target last spin
    if (spinHistory.length > 0 && state.targetDozen) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        const lastDozen = getDozen(lastNum);

        // Did we win? 
        // A win is defined as hitting the Dozen OR hitting one of our Corners.
        // However, user instruction says "if win, choose next... if loss, add...".
        // Usually, hitting a Corner but missing the Dozen might still be a net loss or small gain.
        // We will assume "Win" means we profited or hit the main Dozen. 
        // Simplest interpretation: If the Dozen hits, it's a Win. If a Corner hits, it's likely a Win or break-even.
        // Let's check strict "Dozen Hit" for the main Reset, as corners are hedges.
        
        let isWin = (lastDozen === state.targetDozen);
        
        // Check Corner Hits (Manual check)
        const c = CORNERS[state.targetDozen];
        const hitLeft = [c.left, c.left+1, c.left+3, c.left+4].includes(lastNum);
        const hitRight = [c.right, c.right+1, c.right+3, c.right+4].includes(lastNum);
        
        if (hitLeft || hitRight) isWin = true;

        if (isWin) {
            state.progression = 1;
            state.targetDozen = null; // Force selection of new target
        } else {
            state.progression++;
            // Do NOT clear targetDozen. On loss, we stay and increment bets.
        }
    }

    // --- 5. SELECT TARGET (If needed) ---
    // We only pick a new target if we are at progression 1 (Fresh start or just won)
    if (state.progression === 1) {
        // Logic: "choose the dozen which hit before the current dozen that hits."
        // We need at least 2 history items: [Previous, Current]
        if (spinHistory.length < 2) return [];

        const currentSpin = spinHistory[spinHistory.length - 1];
        const previousSpin = spinHistory[spinHistory.length - 2];
        
        const prevDozenResult = getDozen(previousSpin.winningNumber);

        // If previous spin was 0, we can't really target a dozen. Skip.
        if (!prevDozenResult) return [];

        state.targetDozen = prevDozenResult;
    }

    // Double check we have a target (might fail if 0 was rolled previously)
    if (!state.targetDozen) return [];

    // --- 6. CALCULATE BET AMOUNTS (The Progression) ---
    
    // Base Values (Level 1)
    let dozenBet = 4;
    let leftCornerBet = 2;
    let rightCornerBet = 0;

    // Simulate the ladder for levels > 1
    // We loop through levels to build up the bet totals accurately based on the rules
    for (let i = 2; i <= state.progression; i++) {
        // Even Steps (2, 4, 6...): Add to RIGHT Corner
        // Odd Steps (3, 5, 7...): Add to LEFT Corner
        // Note: The user's prompt sequence is L2(Right), L3(Left).
        
        if (i % 2 === 0) { 
            // Level 2, 4, 6... (Add to Right)
            // Rule: "when adding a bet to the right corner, increase the bet on the dozen by $3"
            dozenBet += 3;
            rightCornerBet += 2; // Step 5 says add $2. We assume this is constant for right side adds.
        } else {
            // Level 3, 5, 7... (Add to Left)
            // Rule: "when adding a bet to the left corner, increase the bet on the dozen by $2"
            dozenBet += 2;
            leftCornerBet += 1; // Step 6 says add $1. We assume this is constant for left side adds.
        }
    }

    // --- 7. CLAMP TO LIMITS ---
    // Ensure we don't exceed max or go below min
    dozenBet = Math.min(dozenBet, config.betLimits.max);
    dozenBet = Math.max(dozenBet, config.betLimits.minOutside);

    // Corners must be at least min inside bet
    if (leftCornerBet > 0) leftCornerBet = Math.max(leftCornerBet, config.betLimits.min);
    if (rightCornerBet > 0) rightCornerBet = Math.max(rightCornerBet, config.betLimits.min);
    
    // Global max check
    leftCornerBet = Math.min(leftCornerBet, config.betLimits.max);
    rightCornerBet = Math.min(rightCornerBet, config.betLimits.max);

    // --- 8. CONSTRUCT BETS ---
    const bets = [];
    const corners = CORNERS[state.targetDozen];

    // 1. Dozen Bet
    bets.push({
        type: 'dozen',
        value: state.targetDozen,
        amount: dozenBet
    });

    // 2. Left Corner Bet
    if (leftCornerBet > 0) {
        bets.push({
            type: 'corner',
            value: corners.left, // Top-left number of the corner
            amount: leftCornerBet
        });
    }

    // 3. Right Corner Bet
    if (rightCornerBet > 0) {
        bets.push({
            type: 'corner',
            value: corners.right,
            amount: rightCornerBet
        });
    }

    return bets;
=======
/**
 * STRATEGY: Dozen & Corner Hedge Ladder
 * * THE LOGIC:
 * 1. Target Selection: Look at the Dozen that hit *before* the current winning Dozen.
 * (e.g., If history is [D1, D2, D3], current is D3. The one before D3 was D2. Target D2.)
 * 2. Structure: 
 * - Main Bet: The Target Dozen.
 * - Hedge Bets: "Upper Left" and "Upper Right" Corners within that Dozen.
 * * THE PROGRESSION (Specific Ladder):
 * - Level 1 (Start): Dozen ($4), Left Corner ($2), Right Corner ($0).
 * - Level 2 (Loss): Add Right Corner ($2), Dozen (+$3). -> D($7), L($2), R($2).
 * - Level 3 (Loss): Add Left Corner ($1), Dozen (+$2). -> D($9), L($3), R($2).
 * - Level 4+ (Loss): Alternate adding to Right then Left.
 * - Rule: When adding to Right, Dozen +$3. When adding to Left, Dozen +$2.
 * - Corner Increments: Assumed $2 for Right, $1 for Left based on steps 5 & 6.
 * * THE GOAL:
 * - Reset progression on any WIN.
 * - Reset strategy completely if "Session Profit" is reached (e.g., +100 units).
 * - On Loss, stay on the SAME Dozen and climb the ladder.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---
    const SESSION_TARGET = 100; // Reset if we make this much profit
    const DOZEN_IDS = { 1: '1st 12', 2: '2nd 12', 3: '3rd 12' };

    // Corner Definitions (Top-Left number of the corner block)
    // "Upper Left" = First valid corner in the dozen
    // "Upper Right" = Last valid corner in the dozen
    const CORNERS = {
        1: { left: 1, right: 8 },   // D1 (1-12): Covers 1-5 and 8-12
        2: { left: 13, right: 20 }, // D2 (13-24): Covers 13-17 and 20-24
        3: { left: 25, right: 32 }  // D3 (25-36): Covers 25-29 and 32-36
    };

    // --- 2. HELPERS ---
    const getDozen = (num) => {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null; // 0
    };

    // --- 3. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.progression = 1;
        state.targetDozen = null;
        state.startBankroll = bankroll;
        state.initialized = true;
    }

    // Check Session Profit
    const currentProfit = bankroll - state.startBankroll;
    if (currentProfit >= SESSION_TARGET) {
        // Reset everything if session goal reached
        state.progression = 1;
        state.targetDozen = null;
        state.startBankroll = bankroll; // Reset baseline
        // console.log("Session Target Reached. Resetting.");
    }

    // --- 4. HISTORY ANALYSIS & WIN/LOSS CHECK ---
    // We only check win/loss if we actually had a target last spin
    if (spinHistory.length > 0 && state.targetDozen) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        const lastDozen = getDozen(lastNum);

        // Did we win? 
        // A win is defined as hitting the Dozen OR hitting one of our Corners.
        // However, user instruction says "if win, choose next... if loss, add...".
        // Usually, hitting a Corner but missing the Dozen might still be a net loss or small gain.
        // We will assume "Win" means we profited or hit the main Dozen. 
        // Simplest interpretation: If the Dozen hits, it's a Win. If a Corner hits, it's likely a Win or break-even.
        // Let's check strict "Dozen Hit" for the main Reset, as corners are hedges.
        
        let isWin = (lastDozen === state.targetDozen);
        
        // Check Corner Hits (Manual check)
        const c = CORNERS[state.targetDozen];
        const hitLeft = [c.left, c.left+1, c.left+3, c.left+4].includes(lastNum);
        const hitRight = [c.right, c.right+1, c.right+3, c.right+4].includes(lastNum);
        
        if (hitLeft || hitRight) isWin = true;

        if (isWin) {
            state.progression = 1;
            state.targetDozen = null; // Force selection of new target
        } else {
            state.progression++;
            // Do NOT clear targetDozen. On loss, we stay and increment bets.
        }
    }

    // --- 5. SELECT TARGET (If needed) ---
    // We only pick a new target if we are at progression 1 (Fresh start or just won)
    if (state.progression === 1) {
        // Logic: "choose the dozen which hit before the current dozen that hits."
        // We need at least 2 history items: [Previous, Current]
        if (spinHistory.length < 2) return [];

        const currentSpin = spinHistory[spinHistory.length - 1];
        const previousSpin = spinHistory[spinHistory.length - 2];
        
        const prevDozenResult = getDozen(previousSpin.winningNumber);

        // If previous spin was 0, we can't really target a dozen. Skip.
        if (!prevDozenResult) return [];

        state.targetDozen = prevDozenResult;
    }

    // Double check we have a target (might fail if 0 was rolled previously)
    if (!state.targetDozen) return [];

    // --- 6. CALCULATE BET AMOUNTS (The Progression) ---
    
    // Base Values (Level 1)
    let dozenBet = 4;
    let leftCornerBet = 2;
    let rightCornerBet = 0;

    // Simulate the ladder for levels > 1
    // We loop through levels to build up the bet totals accurately based on the rules
    for (let i = 2; i <= state.progression; i++) {
        // Even Steps (2, 4, 6...): Add to RIGHT Corner
        // Odd Steps (3, 5, 7...): Add to LEFT Corner
        // Note: The user's prompt sequence is L2(Right), L3(Left).
        
        if (i % 2 === 0) { 
            // Level 2, 4, 6... (Add to Right)
            // Rule: "when adding a bet to the right corner, increase the bet on the dozen by $3"
            dozenBet += 3;
            rightCornerBet += 2; // Step 5 says add $2. We assume this is constant for right side adds.
        } else {
            // Level 3, 5, 7... (Add to Left)
            // Rule: "when adding a bet to the left corner, increase the bet on the dozen by $2"
            dozenBet += 2;
            leftCornerBet += 1; // Step 6 says add $1. We assume this is constant for left side adds.
        }
    }

    // --- 7. CLAMP TO LIMITS ---
    // Ensure we don't exceed max or go below min
    dozenBet = Math.min(dozenBet, config.betLimits.max);
    dozenBet = Math.max(dozenBet, config.betLimits.minOutside);

    // Corners must be at least min inside bet
    if (leftCornerBet > 0) leftCornerBet = Math.max(leftCornerBet, config.betLimits.min);
    if (rightCornerBet > 0) rightCornerBet = Math.max(rightCornerBet, config.betLimits.min);
    
    // Global max check
    leftCornerBet = Math.min(leftCornerBet, config.betLimits.max);
    rightCornerBet = Math.min(rightCornerBet, config.betLimits.max);

    // --- 8. CONSTRUCT BETS ---
    const bets = [];
    const corners = CORNERS[state.targetDozen];

    // 1. Dozen Bet
    bets.push({
        type: 'dozen',
        value: state.targetDozen,
        amount: dozenBet
    });

    // 2. Left Corner Bet
    if (leftCornerBet > 0) {
        bets.push({
            type: 'corner',
            value: corners.left, // Top-left number of the corner
            amount: leftCornerBet
        });
    }

    // 3. Right Corner Bet
    if (rightCornerBet > 0) {
        bets.push({
            type: 'corner',
            value: corners.right,
            amount: rightCornerBet
        });
    }

    return bets;
>>>>>>> origin/main
}