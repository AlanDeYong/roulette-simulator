
/**
 * Strategy: Dozen Blitz Accelerator
 * * Source: 
 * Video: "Unlock Explosive Roulette Wins: Introducing the Dozen Blitz Accelerator"
 * Channel: The Lucky Felt
 * URL: https://www.youtube.com/watch?v=pl3XTohW6kU
 * * Logic:
 * The strategy operates in three modes: BASE, BLITZ, and RECOVERY.
 * * 1. BASE MODE (The Grind):
 * - Bet 1 unit on two separate Dozens (e.g., Dozen 1 and Dozen 2).
 * - Coverage: ~64%.
 * - Goal: Secure small, frequent wins to fund the "Blitz".
 * * 2. BLITZ MODE (The Accelerator):
 * - Trigger: A win in Base Mode.
 * - Action: Take the *profit* from the previous spin and bet it on 2 Corners (Inside bets).
 * - Goal: Use "house money" to hit a high-payout bet (8:1) risk-free.
 * - Exit: Win or Lose, return to Base Mode immediately (One-shot attempt).
 * * 3. RECOVERY MODE:
 * - Trigger: A loss in Base Mode (the un-bet Dozen or Zero hits).
 * - Action: Switch to betting on a SINGLE Dozen (targeting the last winning dozen aka "repeater").
 * - Progression: Increase bet size to cover previous losses + small profit.
 * - Level 1: 3 units
 * - Level 2: 6 units
 * - Level 3: 9 units
 * - Level 4: 15 units
 * - Exit: Return to Base Mode immediately upon winning or maxing out progression.
 * * Goal:
 * Grind small profits safely, use profits for high-variance shots, and recover losses aggressively but structurally.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPERS ---
    
    // Determine the base betting unit (based on Table Min for Outside bets)
    const baseUnit = config.betLimits.minOutside;
    
    // Helper to get which dozen a number belongs to (1, 2, or 3). Returns 0 for 0/00.
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    };

    // Helper to get valid Corner bets (Top-Left number of the square)
    // Valid corners are numbers that are NOT in the right column (divisible by 3) 
    // and NOT in the bottom row (>= 34).
    const getRandomCorners = (count) => {
        const validCorners = [];
        for (let i = 1; i <= 32; i++) {
            if (i % 3 !== 0) validCorners.push(i);
        }
        const selected = [];
        for (let j = 0; j < count; j++) {
            const randIndex = Math.floor(Math.random() * validCorners.length);
            selected.push(validCorners[randIndex]);
        }
        return selected;
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.mode) state.mode = 'BASE'; // Modes: 'BASE', 'BLITZ', 'RECOVERY'
    if (!state.recoveryLevel) state.recoveryLevel = 0;
    if (!state.lastBetTotal) state.lastBetTotal = 0;
    if (!state.lastDozenHit) state.lastDozenHit = null;

    // Defined Dozens to bet in Base Mode (Can be static 1 & 2 as per video)
    const baseDozens = [1, 2]; 

    // Recovery Progression Multipliers (Multiples of baseUnit)
    // Approx matches video: Lost 2 units -> Bet 3. Lost 5 units -> Bet 6.
    const recoveryProgression = [3, 6, 9, 15, 25];

    // --- 3. ANALYZE PREVIOUS SPIN (If strictly necessary for logic) ---
    // We need to know if we won or lost the last spin to switch modes.
    let wonLast = false;
    let lastProfit = 0;
    
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const winningDozen = getDozen(winningNum);
        state.lastDozenHit = winningDozen;

        // Determine if our specific last bets won
        // (Simulator handles bankroll, but we need logic for mode switching)
        if (state.mode === 'BASE') {
            // Did one of our base dozens hit?
            if (baseDozens.includes(winningDozen)) {
                wonLast = true;
                // Base bet = 2 units. Win pays 3 units on the hitting dozen.
                // Profit = 1 unit.
                lastProfit = baseUnit; 
            }
        } else if (state.mode === 'RECOVERY') {
             // We bet on a specific single dozen in recovery.
             // We assume we bet on state.recoveryTargetDozen
             if (winningDozen === state.recoveryTargetDozen) {
                 wonLast = true;
             }
        }
        // Note: BLITZ outcome doesn't change logic (always resets to Base), so strictly tracking it isn't vital.
    }

    // --- 4. DETERMINE NEXT MOVE ---

    let bets = [];
    let nextMode = state.mode;

    // FSM (Finite State Machine) Logic
    if (spinHistory.length === 0) {
        nextMode = 'BASE';
    } else {
        if (state.mode === 'BASE') {
            if (wonLast) {
                nextMode = 'BLITZ';
            } else {
                nextMode = 'RECOVERY';
                state.recoveryLevel = 0; // Start progression
            }
        } else if (state.mode === 'BLITZ') {
            // Whether we won big or lost the free shot, return to grind
            nextMode = 'BASE';
        } else if (state.mode === 'RECOVERY') {
            if (wonLast) {
                // Recovered! Back to grind.
                nextMode = 'BASE';
                state.recoveryLevel = 0;
            } else {
                // Lost again. Increase progression.
                state.recoveryLevel++;
                // If we exceed our defined progression steps, take the loss and reset.
                if (state.recoveryLevel >= recoveryProgression.length) {
                    nextMode = 'BASE';
                    state.recoveryLevel = 0;
                }
            }
        }
    }

    // Update State
    state.mode = nextMode;

    // --- 5. CONSTRUCT BETS ---

    if (state.mode === 'BASE') {
        // Bet on Dozen 1 and 2
        const amount = Math.max(baseUnit, config.betLimits.minOutside);
        
        bets.push({ type: 'dozen', value: baseDozens[0], amount: amount });
        bets.push({ type: 'dozen', value: baseDozens[1], amount: amount });
        
        state.lastBetTotal = amount * 2;

    } else if (state.mode === 'BLITZ') {
        // Bet the PROFIT from the base win on 2 Corners.
        // Base profit is usually 1 unit.
        // Total Blitz Bet = baseUnit. Split into 2 corners.
        let blitzTotal = baseUnit;
        
        // Ensure we meet table minimums. 
        // If minInside is 2, and baseUnit is 5. We have 5 to split. 2.50 each.
        let amountPerCorner = blitzTotal / 2;

        // Clamp to min limit
        amountPerCorner = Math.max(amountPerCorner, config.betLimits.min);
        // Clamp to max limit
        amountPerCorner = Math.min(amountPerCorner, config.betLimits.max);

        const corners = getRandomCorners(2);
        
        bets.push({ type: 'corner', value: corners[0], amount: amountPerCorner });
        bets.push({ type: 'corner', value: corners[1], amount: amountPerCorner });

        state.lastBetTotal = amountPerCorner * 2;

    } else if (state.mode === 'RECOVERY') {
        // Bet on a SINGLE Dozen using progression.
        // Target: The dozen that just hit (if available), or default to Dozen 2 if 0 hit.
        state.recoveryTargetDozen = state.lastDozenHit > 0 ? state.lastDozenHit : 2;

        const units = recoveryProgression[state.recoveryLevel];
        let amount = baseUnit * units;

        // Safety Clamps
        amount = Math.max(amount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);
        
        // Bankroll Check: Don't bet more than we have
        if (amount > bankroll) amount = bankroll;

        if (amount > 0) {
            bets.push({ type: 'dozen', value: state.recoveryTargetDozen, amount: amount });
        }
        
        state.lastBetTotal = amount;
    }

    return bets;

}