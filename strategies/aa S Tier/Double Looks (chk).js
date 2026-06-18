/**
 * Roulette Strategy: The Double Looks (Hybrid System - Corrected Tracking)
 * * Source:
 * - URL: https://youtu.be/Hk2M7ejf3CQ
 * - Channel: Casino Matchmaker
 * * The Full Logic in Details:
 * 1. Wait for a spin to complete, then place the starting bet following the color of the last winner.
 * 2. Stage 1 (Even Chance): Bet on the color of the last winning number ('red' or 'black').
 * - On a loss: Rebet Stage 1, dynamically changing the bet target to follow the color of the last winner.
 * - On a win: Advance to Stage 2.
 * 3. Stage 2 (Dozen Progression): Take the total returns (initial bet + winnings) and distribute them 
 * equally across two of the three dozens, prioritizing the most recent winning dozen.
 * - On a loss: Cycle failed. Go back to Stage 1.
 * - On a win: Cycle successful. Full progression reset.
 * * The Full Bet Progression in Details:
 * - The strategy utilizes a negative progression buffer. It gives the player 3 cycle attempts at the 
 * current unit tier before escalating.
 * - Initial base bet tier: 1 Unit (determined by config.betLimits.minOutside).
 * - If 3 consecutive cycle attempts fail without achieving a Stage 2 win, the base bet tier increases by 1 unit.
 * - Upon any Stage 2 win, the tier fully resets back to 1 Unit.
 * * The Goal:
 * - Target Profit: Grinding steady unit wins.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for at least one spin to complete to establish the tracking target
    if (spinHistory.length === 0) {
        return [];
    }

    // 2. Initialize persisting state variables
    if (!state.initiated) {
        state.unitSize = config.betLimits.minOutside;
        state.tier = 1;              // Current multiplier tier of the negative progression
        state.failedAttempts = 0;    // Tracks failed attempts at the current tier (max 3)
        state.stage = 1;             // Stage 1 = Even Chance, Stage 2 = Two Dozens
        state.stage1Stake = 0;       // Stores the stake used in Stage 1 to calculate Stage 2
        state.initiated = true;
    }

    const lastSpin = spinHistory[spinHistory.length - 1];

    // 3. Process results from the previous spin to update the strategy state
    if (state.lastProcessedSpinIndex !== undefined && spinHistory.length > state.lastProcessedSpinIndex) {
        if (state.stage === 1) {
            // Evaluates Stage 1 outcome against the color we bet on
            if (lastSpin.winningColor === state.previousBetTarget) {
                // Win: Advance to Stage 2
                state.stage = 2;
            } else {
                // Loss (including green 0): Cycle failed step. Increment failed attempts.
                state.failedAttempts++;
                if (state.failedAttempts >= 3) {
                    state.tier++;
                    state.failedAttempts = 0;
                }
                state.stage = 1; // On loss, stay at Stage 1 and rebet following the last winner
            }
        } else if (state.stage === 2) {
            // Evaluates Stage 2 outcome (Two Dozens)
            const winNumber = lastSpin.winningNumber;
            let currentDozen = 0;
            if (winNumber >= 1 && winNumber <= 12) currentDozen = 1;
            else if (winNumber >= 13 && winNumber <= 24) currentDozen = 2;
            else if (winNumber >= 25 && winNumber <= 36) currentDozen = 3;

            if (state.coveredDozens && state.coveredDozens.includes(currentDozen)) {
                // Win: Reset system progression entirely
                state.tier = 1;
                state.failedAttempts = 0;
            } else {
                // Loss: Cycle failed. Increment progression counters.
                state.failedAttempts++;
                if (state.failedAttempts >= 3) {
                    state.tier++;
                    state.failedAttempts = 0;
                }
            }
            // Always return back to Stage 1 after a Stage 2 execution
            state.stage = 1;
        }
    }
    
    // Sync execution history marker
    state.lastProcessedSpinIndex = spinHistory.length;

    // Skip betting if the last number was a green 0 (no clear red/black winner to follow)
    if (lastSpin.winningColor === 'green' && state.stage === 1) {
        return [];
    }

    // 4. Calculate current stake tier
    const currentBaseStake = state.unitSize * state.tier;

    if (state.stage === 1) {
        // Stage 1 Bet: Set target to follow the last winning color
        state.previousBetTarget = lastSpin.winningColor;

        let betAmount = Math.max(currentBaseStake, config.betLimits.minOutside);
        betAmount = Math.min(betAmount, config.betLimits.max);

        state.stage1Stake = betAmount;

        return [{ type: state.previousBetTarget, amount: betAmount }];

    } else if (state.stage === 2) {
        // Stage 2 Bet: Distribute total returns (Stake * 2) across two dozens
        const totalReturns = state.stage1Stake * 2;
        let dozenBetAmount = totalReturns / 2;

        // Clamp to outside table limits
        dozenBetAmount = Math.max(dozenBetAmount, config.betLimits.minOutside);
        dozenBetAmount = Math.min(dozenBetAmount, config.betLimits.max);

        // Identify the most recent winning dozen
        let primaryDozen = 1;
        const lastNum = lastSpin.winningNumber;
        if (lastNum >= 1 && lastNum <= 12) primaryDozen = 1;
        else if (lastNum >= 13 && lastNum <= 24) primaryDozen = 2;
        else if (lastNum >= 25 && lastNum <= 36) primaryDozen = 3;
        
        // Dynamically pair it with an adjacent choice to cover 24 numbers
        let secondaryDozen = primaryDozen === 3 ? 2 : primaryDozen + 1;
        state.coveredDozens = [primaryDozen, secondaryDozen];

        return [
            { type: 'dozen', value: primaryDozen, amount: dozenBetAmount },
            { type: 'dozen', value: secondaryDozen, amount: dozenBetAmount }
        ];
    }

    return [];
}