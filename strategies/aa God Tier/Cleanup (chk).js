/**
 * ============================================================================
 * ROULETTE STRATEGY: Cleanup Roulette (Peak Profit Reset Modification)
 * ============================================================================
 * Source: https://youtu.be/NrxAxpfZSwI
 * YouTube Channel: The Roulette Master
 * Strategy Name: Cleanup Roulette (Modified to reset only on session peak profit)
 * 
 * --- FULL LOGIC IN DETAIL ---
 * Cleanup Roulette is a structured corner-betting system that scales both 
 * coverage (number of corners) and bet intensity across 3 distinct stages:
 * 
 * 1. Stage 1 (4 Corners):
 *    - Start by placing bets on 4 distinct corner positions.
 *    - Base bet: 1 Base Unit (config.betLimits.min) per corner.
 *    - Loss on Attempt 1 -> Double corner bet to 2 Base Units (Attempt 2).
 * 
 * 2. Stage 2 (5 Corners):
 *    - Loss on Stage 1 Attempt 2 -> Expand to 5 corners at 4 Base Units per corner (Attempt 1).
 *    - Loss on Attempt 1 -> Double corner bet to 8 Base Units per corner (Attempt 2).
 * 
 * 3. Stage 3 (6 Corners):
 *    - Loss on Stage 2 Attempt 2 -> Expand to 6 corners at 16 Base Units per corner (Attempt 1).
 *    - Loss on Attempt 1 -> Double corner bet to 32 Base Units per corner (Attempt 2).
 * 
 * --- MODIFIED RESET CONDITION ---
 * - **Peak Profit Reset**: The strategy tracks `state.peakBankroll` across the session.
 *   Progression ONLY resets (Stage 1, Attempt 1) when current `bankroll` strictly 
 *   exceeds `state.peakBankroll` (reaching a new session peak).
 * - Wins that do not reach a new session peak bankroll do NOT reset the progression, 
 *   allowing recovery bets to continue until peak profit is reached.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Corner Positions (Top-Left numbers for valid corners)
    const CORNER_POSITIONS = [1, 8, 16, 23, 29, 14];

    // 2. Initialize Persistent State
    if (state.stage === undefined) state.stage = 1;         // Stage 1 (4 corners), Stage 2 (5 corners), Stage 3 (6 corners)
    if (state.attempt === undefined) state.attempt = 1;     // Attempt 1 or 2 within current stage
    if (state.unitMultiplier === undefined) state.unitMultiplier = 1;
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;

    // 3. Peak Profit Reset Check
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
        state.stage = 1;
        state.attempt = 1;
        state.unitMultiplier = 1;
    }

    // 4. Evaluate Previous Spin Outcome for Loss Progression (if history exists)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNum = lastSpin.winningNumber;

        // Determine if last bet was a hit
        let wasHit = false;
        if (state.activeCorners && state.activeCorners.length > 0) {
            for (const cornerVal of state.activeCorners) {
                const covered = [cornerVal, cornerVal + 1, cornerVal + 3, cornerVal + 4];
                if (covered.includes(lastWinningNum)) {
                    wasHit = true;
                    break;
                }
            }
        }

        if (!wasHit) {
            // LOSS: Advance progression
            if (state.attempt === 1) {
                // Second attempt in same stage -> double unit size
                state.attempt = 2;
                state.unitMultiplier *= 2;
            } else {
                // Progression step after losing attempt 2
                if (state.stage === 1) {
                    state.stage = 2; // Move to 5 corners
                    state.attempt = 1;
                    state.unitMultiplier *= 2; // Double corner bet size
                } else if (state.stage === 2) {
                    state.stage = 3; // Move to 6 corners
                    state.attempt = 1;
                    state.unitMultiplier *= 2; // Double corner bet size
                } else {
                    // Reached max stage limit -> reset to base to prevent total wipeout
                    state.stage = 1;
                    state.attempt = 1;
                    state.unitMultiplier = 1;
                }
            }
        }
    }

    // 5. Determine Active Bet Parameters
    let cornerCount = 4;
    if (state.stage === 2) cornerCount = 5;
    if (state.stage === 3) cornerCount = 6;

    // Base unit per corner inside bet
    const baseUnit = config.betLimits.min || 2;
    let cornerBetAmount = baseUnit * state.unitMultiplier;

    // Clamp individual bet amount to table limits
    cornerBetAmount = Math.max(cornerBetAmount, config.betLimits.min);
    cornerBetAmount = Math.min(cornerBetAmount, config.betLimits.max);

    // 6. Check Bankroll Sustainability
    let totalRequired = cornerBetAmount * cornerCount;
    if (totalRequired > bankroll) {
        cornerBetAmount = Math.floor(bankroll / cornerCount);
        if (cornerBetAmount < config.betLimits.min) {
            state.stage = 1;
            state.attempt = 1;
            state.unitMultiplier = 1;
            cornerCount = 4;
            cornerBetAmount = Math.max(config.betLimits.min, Math.floor(bankroll / cornerCount));
        }
    }

    // If bankroll is less than minimum bet on 1 corner, return no bet
    if (bankroll < config.betLimits.min || cornerBetAmount < config.betLimits.min) {
        return [];
    }

    // 7. Build Return Bet Array
    const bets = [];
    const activeCorners = CORNER_POSITIONS.slice(0, cornerCount);
    state.activeCorners = activeCorners;

    for (const cornerVal of activeCorners) {
        bets.push({
            type: 'corner',
            value: cornerVal,
            amount: cornerBetAmount
        });
    }

    return bets;
}