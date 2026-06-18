/**
 * Strategy Name: Infinite Edge Roulette System
 * Source: https://youtu.be/rMJaNfCDKjw (The Roulette Master)
 * * The Full Logic in Details:
 * - This strategy is a 24-number coverage system that simultaneously bets on 2 out of the 3 available dozens.
 * - Bet Selection Trigger:
 * 1. Dozen #1: The dozen that won on the immediate last spin.
 * 2. Dozen #2: The dozen that has gone the longest number of spins without hitting.
 * - If a zero (0 or 00) hits or if the spin history is empty, the strategy initializes bets using the 
 * first dozen (1st 12) and third dozen (3rd 12) as a baseline setup until a definitive past history pattern emerges.
 * * The Full Bet Progression in Details (Two-Stage Progression):
 * - Initial/Base Bet: Begins with 1 unit (scaled to config.betLimits.minOutside) on each of the two selected dozens.
 * - Progression Rules:
 * 1. Upon a Loss: The progression follows a strict Fibonacci sequence logic tailored for dozens. 
 * When a loss occurs, the bet size steps up through the sequence values multiplier sequence: 1, 2, 3, 5, 8, 13, 21, 34...
 * Specifically, if it's the very first loss from the base level, the multiplier doubles from 1 to 2.
 * Subsequent back-to-back losses increase by summing up the two prior bet sizes (standard Fibonacci progression).
 * 2. Upon a Win (Session Profit check):
 * Unlike standard Martingale where a single win completely resets the chain, this system uses a multi-win target path.
 * If a win happens but the current bankroll remains below the peak session profit target, the current bet amount stays 
 * identical to the previous spin's value rather than resetting, moving the targets to the newly calculated dozen spots.
 * Once the net bankroll surpasses or hits the target peak session milestone, the bet resets back down to the baseline 1 unit.
 * * The Goal:
 * - The goal is to safely grind continuous increments of 1 standard unit profit while protecting bankroll via 
 * Fibonacci steps. The session stops or scales down once target profile triggers are achieved.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit for outside dozen bets
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // 2. Initialize Persistent State Variables
    if (!state.initialized) {
        state.stageMultiplier = 1;      // Current multiplier position in progression path
        state.highestBankroll = bankroll; // Tracks target milestones for resets
        state.previousMultiplier = 1;   // For Fibonacci calculations
        state.initialized = true;
    }

    // Dynamic Tracking: Update highest milestone achieved
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
        state.stageMultiplier = 1;     // Reset on reaching new profit peak
        state.previousMultiplier = 1;
    }

    // 3. Process the last spin result to modify the progression level
    if (spinHistory && spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastNum = lastResult.winningNumber;

        // Determine which dozen hit last
        let wonDozen = 0;
        if (lastNum >= 1 && lastNum <= 12) wonDozen = 1;
        else if (lastNum >= 13 && lastNum <= 24) wonDozen = 2;
        else if (lastNum >= 25 && lastNum <= 36) wonDozen = 3;

        // Retrieve the two dozens targeted on the prior spin
        const lastTargetedDozens = state.lastTargets || [1, 3];
        const wonBetOnLastSpin = lastTargetedDozens.includes(wonDozen) && wonDozen !== 0;

        if (wonBetOnLastSpin) {
            // Check if current session target milestone is completely fulfilled
            if (bankroll >= state.highestBankroll) {
                state.stageMultiplier = 1;
                state.previousMultiplier = 1;
            } else {
                // Keep bet sizing flat at current multiplier to recover remaining deficit
                // Do not increment or reset yet according to Barry's system rules.
            }
        } else {
            // Defeat/Loss on last spin: Proceed through progression steps
            if (state.stageMultiplier === 1) {
                state.previousMultiplier = 1;
                state.stageMultiplier = 2; // Initial shift from baseline doubles
            } else {
                // Apply Fibonacci step logic: Next Bet = Current Bet + Previous Bet
                const nextMultiplier = state.stageMultiplier + state.previousMultiplier;
                state.previousMultiplier = state.stageMultiplier;
                state.stageMultiplier = nextMultiplier;
            }
        }
    }

    // 4. Dozen Bet Selection Engine
    let dozen1 = 1;
    let dozen2 = 3;

    if (spinHistory && spinHistory.length > 0) {
        // Find the dozen that won on the immediate last spin
        const lastSpinNum = spinHistory[spinHistory.length - 1].winningNumber;
        let lastHitDozen = 0;
        if (lastSpinNum >= 1 && lastSpinNum <= 12) lastHitDozen = 1;
        else if (lastSpinNum >= 13 && lastSpinNum <= 24) lastHitDozen = 2;
        else if (lastSpinNum >= 25 && lastSpinNum <= 36) lastHitDozen = 3;

        // Find the dozen that has gone the longest number of spins without hitting
        let counts = { 1: Infinity, 2: Infinity, 3: Infinity };
        let tracked = { 1: false, 2: false, 3: false };
        let distance = 0;

        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const num = spinHistory[i].winningNumber;
            let doz = 0;
            if (num >= 1 && num <= 12) doz = 1;
            else if (num >= 13 && num <= 24) doz = 2;
            else if (num >= 25 && num <= 36) doz = 3;

            if (doz !== 0 && !tracked[doz]) {
                counts[doz] = distance;
                tracked[doz] = true;
            }
            distance++;
        }

        // Identify which dozens are coldest
        let maxDistance = -1;
        let coldestDozen = 1;
        for (let d = 1; d <= 3; d++) {
            if (counts[d] > maxDistance) {
                maxDistance = counts[d];
                coldestDozen = d;
            }
        }

        // Rule Application
        if (lastHitDozen !== 0) {
            dozen1 = lastHitDozen;
            if (coldestDozen !== dozen1) {
                dozen2 = coldestDozen;
            } else {
                // If last hit dozen and coldest dozen match, pick the alternative remaining dozen
                dozen2 = (dozen1 % 3) + 1;
            }
        } else {
            // Backup baseline if last hit was a zero
            dozen1 = coldestDozen;
            dozen2 = (dozen1 % 3) + 1;
        }
    }

    // Persist targeted dozens into state cache for accuracy evaluations on next loop
    state.lastTargets = [dozen1, dozen2];

    // 5. Finalize Bet Amount Calculation and Clamp to Limits
    let finalCalculatedBet = minOutside * state.stageMultiplier;
    finalCalculatedBet = Math.max(finalCalculatedBet, minOutside);
    finalCalculatedBet = Math.min(finalCalculatedBet, maxBet);

    // 6. Return standard structured bet output array
    return [
        { type: 'dozen', value: dozen1, amount: finalCalculatedBet },
        { type: 'dozen', value: dozen2, amount: finalCalculatedBet }
    ];
}