/**
 * Strategy Name: Rapid Recovery Roulette System
 * Source: https://youtu.be/3xk5OeCp2Pw (Channel: The Roulette Master)
 * * The Full Logic in details:
 * - This strategy dynamically transitions across 3 strategic tiers depending on results.
 * - Tier 1 (Base Level): Bets are placed flatly on two adjacent/chosen Dozens 
 * (Dozen 1 and Dozen 2). No progression is triggered by single losses.
 * - Transition to Tier 2: Triggered exclusively after experiencing TWO consecutive losses in Tier 1.
 * - Tier 2 (Double Street Overlay): Continues betting on the same two Dozens at 2 units each
 * and introduces a hedging bet of 1 unit on the Double Street (Six-line) 25-30. 
 * If a loss occurs during Tier 2, all bets are aggressively doubled.
 * - Transition to Tier 3: Triggered after encountering TWO consecutive losses while in Tier 2.
 * - Tier 3 (Romanovski Hedge): Migrates layout to a full Romanovski matrix, allocating 
 * three units across two dozens, combined with two corner bets covering missing numbers 
 * within the exposed dozen.
 * * The Full Bet Progression in details:
 * - Tier 1: Two outside dozen bets at 2 units each (Base level).
 * - WIN: Remain at 2 units flat.
 * - SINGLE LOSS: Maintain 2 units flat. Do not increase.
 * - TWO LOSSES IN A ROW: Elevate configuration into Tier 2.
 * - Tier 2: Initial step sets 2 units on Dozen 1, 2 units on Dozen 2, and 1 unit on Double Street (25-30).
 * - LOSS: Double all active bet sizes (4 units per dozen, 2 units on Double Street).
 * - TWO LOSSES IN A ROW: Escalate sequence directly to Tier 3 Romanovski framework.
 * - Tier 3: Converts to a dynamic Romanovski setup. Sets a total sum matching the nearest multiple
 * divisible by 3 that covers previous deficits. Places 1/3 of that value on two distinct corners,
 * with the remaining balance split evenly on two dozens.
 * - WIN: Recovers deficit cleanly. Fully resets tracking properties back to Tier 1 base variables.
 * * The Goal:
 * - Target profit is designed around capturing steady net increments safely (+10 units base milestones).
 * - Safety mechanism stops sequences if maximum bankroll thresholds or boundary caps break down.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit structures dynamically from outside limits
    const baseUnit = config.betLimits.minOutside;

    // 2. Initialize Persistence State Variables
    if (!state.currentTier) state.currentTier = 1; 
    if (!state.consecutiveLosses) state.consecutiveLosses = 0;
    if (!state.tierTwoMultiplier) state.tierTwoMultiplier = 1;
    if (!state.targetProfitMilestone) state.targetProfitMilestone = bankroll + (baseUnit * 2);

    // Define Dozen Boundaries
    const getDozen = (num) => {
        if (num === 0 || num === 37) return 0; // Green slots
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        return 3;
    };

    // 3. Process Spin Outcomes and State Updates
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDoz = getDozen(lastNum);

        // Check active layout elements for coverage analysis
        let wasWin = false;
        if (state.lastPlacedBets) {
            for (const activeBet of state.lastPlacedBets) {
                if (activeBet.type === 'dozen' && activeBet.value === lastDoz) {
                    wasWin = true;
                }
                if (activeBet.type === 'line' && lastNum >= activeBet.value && lastNum <= (activeBet.value + 5)) {
                    wasWin = true;
                }
                if (activeBet.type === 'corner') {
                    const tl = activeBet.value;
                    const validNumbers = [tl, tl + 1, tl + 3, tl + 4];
                    if (validNumbers.includes(lastNum)) wasWin = true;
                }
            }
        }

        if (wasWin) {
            state.consecutiveLosses = 0;
            if (state.currentTier === 2) {
                if (bankroll >= state.targetProfitMilestone) {
                    state.currentTier = 1;
                    state.tierTwoMultiplier = 1;
                    state.targetProfitMilestone = bankroll + (baseUnit * 2);
                }
            } else if (state.currentTier === 3) {
                state.currentTier = 1;
                state.tierTwoMultiplier = 1;
                state.targetProfitMilestone = bankroll + (baseUnit * 2);
            }
        } else {
            state.consecutiveLosses += 1;
            if (state.currentTier === 1 && state.consecutiveLosses >= 2) {
                state.currentTier = 2;
                state.consecutiveLosses = 0;
                state.tierTwoMultiplier = 1;
            } else if (state.currentTier === 2) {
                if (state.consecutiveLosses >= 2) {
                    state.currentTier = 3;
                    state.consecutiveLosses = 0;
                } else {
                    state.tierTwoMultiplier *= 2; // Double up all active bets upon a loss in Tier 2
                }
            }
        }
    }

    // 4. Construct Bets based on active Tier Level logic
    let betsArray = [];

    if (state.currentTier === 1) {
        let amt = baseUnit * 2; // Start with 2 units bet each on the dozens
        amt = Math.min(Math.max(amt, config.betLimits.minOutside), config.betLimits.max);
        
        betsArray.push({ type: 'dozen', value: 1, amount: amt });
        betsArray.push({ type: 'dozen', value: 2, amount: amt });
    } 
    else if (state.currentTier === 2) {
        // Base Tier 2 is 2 units each dozen and 1 unit on double street, multiplied if inside loss progression
        let dozAmt = baseUnit * 2 * state.tierTwoMultiplier;
        let lineAmt = baseUnit * 1 * state.tierTwoMultiplier;

        // Clamp to absolute bounds defined inside global engine configs
        dozAmt = Math.min(Math.max(dozAmt, config.betLimits.minOutside), config.betLimits.max);
        lineAmt = Math.min(Math.max(lineAmt, config.betLimits.min), config.betLimits.max);

        betsArray.push({ type: 'dozen', value: 1, amount: dozAmt });
        betsArray.push({ type: 'dozen', value: 2, amount: dozAmt });
        betsArray.push({ type: 'line', value: 25, amount: lineAmt }); // Six-line spanning 25-30
    } 
    else if (state.currentTier === 3) {
        let baselineValue = baseUnit * 6; 
        let dozenBetValue = (baselineValue / 3) * 1.5; 
        let cornerBetValue = baselineValue / 3;

        dozenBetValue = Math.min(Math.max(dozenBetValue, config.betLimits.minOutside), config.betLimits.max);
        cornerBetValue = Math.min(Math.max(cornerBetValue, config.betLimits.min), config.betLimits.max);

        betsArray.push({ type: 'dozen', value: 1, amount: dozenBetValue });
        betsArray.push({ type: 'dozen', value: 2, amount: dozenBetValue });
        betsArray.push({ type: 'corner', value: 25, amount: cornerBetValue }); 
        betsArray.push({ type: 'corner', value: 31, amount: cornerBetValue }); 
    }

    state.lastPlacedBets = betsArray;
    return betsArray;
}