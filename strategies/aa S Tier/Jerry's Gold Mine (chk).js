/**
 * Source: https://youtu.be/E7jYTxoZQzk?si=vNYzouv2S3TPuzjJ
 * Channel Name: The Roulette Master
 * Strategy Name: Jerry's Gold Mine
 * * THE FULL LOGIC:
 * 1. The strategy tracks all historical spins to calculate the number of consecutive spins since each of the three Dozens (1st 12, 2nd 12, 3rd 12) has hit.
 * 2. At any point, the strategy determines which dozen has the longest drought (highest consecutive spins since last hit). If there is a tie, it breaks the tie by choosing the lowest dozen number.
 * 3. A single outside bet is placed strictly on this tracked "longest drought" dozen.
 * 4. The target position updates *only after a win* or at the start of a session. During a losing streak, the bet remains locked on the same target dozen until a win occurs.
 * * THE FULL BET PROGRESSION:
 * 1. The baseline starting bet is the minimum allowed outside bet (`config.betLimits.minOutside`).
 * 2. It tracks the cumulative session profit peak achieved immediately prior to the current betting progression leg.
 * 3. As long as the current bankroll remains equal to or above this peak profit anchor, the strategy maintains its base unit sizing (`config.betLimits.minOutside`) without increasing, even after occasional individual spin losses.
 * 4. If a win occurs but the bankroll remains lower than the peak profit anchor (failing to register a new net lifetime high or recover to the baseline target), the strategy triggers an escalated recovery tier. 
 * - The bet size increases by exactly 2 units (calculated as `2 * config.betLimits.minOutside`).
 * - This progression increments via `config.incrementMode`: if 'base' or 'fixed', it evaluates structural additions relative to the base bet scale.
 * 5. Upon capturing a new net lifetime profit high (surpassing or tying the target anchor), the progression immediately resets to the base unit configuration.
 * * THE GOAL:
 * - Steady baseline consolidation with slow structural growth while preventing heavy exponential compounding down long standard streaks.
 * - Stop-loss / Target profit: Regulated by the simulator framework wrapper parameters.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // -------------------------------------------------------------------------
    // 1. Initial Definitions & Baseline Constraints
    // -------------------------------------------------------------------------
    const baseUnit = config.betLimits.minOutside;
    const incrementAmount = 2 * baseUnit;

    // Initialize tracking states upon the initial execution loop
    if (state.highestProfitPeak === undefined) {
        state.highestProfitPeak = bankroll;
    }
    if (state.currentBetAmount === undefined) {
        state.currentBetAmount = baseUnit;
    }
    if (state.targetDozen === undefined) {
        state.targetDozen = null;
    }
    if (state.isSessionActive === undefined) {
        state.isSessionActive = false;
    }

    // No historical records yet: establish the initial baseline anchor
    if (!spinHistory || spinHistory.length === 0) {
        state.targetDozen = 1; // Default fallback for initial trigger
        state.currentBetAmount = baseUnit;
        state.isSessionActive = true;
        
        return [{
            type: 'dozen',
            value: state.targetDozen,
            amount: Math.min(Math.max(state.currentBetAmount, config.betLimits.minOutside), config.betLimits.max)
        }];
    }

    // Evaluate outcomes based on the most recent wheel extraction
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNumber = lastResult.winningNumber;

    // Map the outcome number to its respective standard column dozen index
    let lastHitDozen = 0;
    if (lastNumber >= 1 && lastNumber <= 12) {
        lastHitDozen = 1;
    } else if (lastNumber >= 13 && lastNumber <= 24) {
        lastHitDozen = 2;
    } else if (lastNumber >= 25 && lastNumber <= 36) {
        lastHitDozen = 3;
    }

    // -------------------------------------------------------------------------
    // 2. Identify Longest Drought Target Position
    // -------------------------------------------------------------------------
    let missedDozensCounters = { 1: 0, 2: 0, 3: 0 };
    
    // Parse historical array backwards to aggregate sequential drought duration
    for (let d = 1; d <= 3; d++) {
        let spinCountSinceHit = 0;
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const histNum = spinHistory[i].winningNumber;
            let histDozen = 0;
            if (histNum >= 1 && histNum <= 12) histDozen = 1;
            else if (histNum >= 13 && histNum <= 24) histDozen = 2;
            else if (histNum >= 25 && histNum <= 36) histDozen = 3;

            if (histDozen === d) {
                break;
            }
            spinCountSinceHit++;
        }
        missedDozensCounters[d] = spinCountSinceHit;
    }

    // Determine the maximum unhit value string metric
    let selectedDroughtDozen = 1;
    let maximumDroughtValue = missedDozensCounters[1];

    for (let d = 2; d <= 3; d++) {
        if (missedDozensCounters[d] > maximumDroughtValue) {
            maximumDroughtValue = missedDozensCounters[d];
            selectedDroughtDozen = d;
        }
    }

    // -------------------------------------------------------------------------
    // 3. Bet Progression Execution Logic
    // -------------------------------------------------------------------------
    if (!state.isSessionActive) {
        // Safe start fallback trigger initialization sequence
        state.highestProfitPeak = bankroll;
        state.targetDozen = selectedDroughtDozen;
        state.currentBetAmount = baseUnit;
        state.isSessionActive = true;
    } else {
        const wasWin = (state.targetDozen === lastHitDozen);

        if (wasWin) {
            // A win occurred: evaluate recovery state against our anchor ceiling
            if (bankroll >= state.highestProfitPeak) {
                // Recovered fully or registered a lifetime new session high
                state.highestProfitPeak = bankroll;
                state.currentBetAmount = baseUnit;
                state.targetDozen = selectedDroughtDozen;
            } else {
                // Win occurred but net bankroll remains in deficit: escalate recovery tier
                state.currentBetAmount += incrementAmount;
                state.targetDozen = selectedDroughtDozen;
            }
        } else {
            // Loss occurred: Maintain ongoing position target lock and preserve sizing
            // Bet size does NOT escalate mid-drought sequence per standard tracking specifications
            if (bankroll > state.highestProfitPeak) {
                state.highestProfitPeak = bankroll;
            }
        }
    }

    // -------------------------------------------------------------------------
    // 4. Clamping and Allocation Boundaries Protection
    // -------------------------------------------------------------------------
    let finalBetSizing = state.currentBetAmount;
    if (finalBetSizing < config.betLimits.minOutside) {
        finalBetSizing = config.betLimits.minOutside;
    }
    if (finalBetSizing > config.betLimits.max) {
        finalBetSizing = config.betLimits.max;
    }

    // Double check liquidity availability constraints inside current balance bankroll pool
    if (bankroll < finalBetSizing) {
        if (bankroll >= config.betLimits.minOutside) {
            finalBetSizing = bankroll;
        } else {
            return []; // Terminate processing due to insufficient capital allocations
        }
    }

    return [{
        type: 'dozen',
        value: state.targetDozen,
        amount: finalBetSizing
    }];
}