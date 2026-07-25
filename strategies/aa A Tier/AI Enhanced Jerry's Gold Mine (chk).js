/**
 * Strategy Name: AI Enhanced Jerry's Gold Mine Roulette Strategy
 * Source URL: https://youtu.be/A8mT-tuhWjg
 * YouTube Channel: The Risk and Reward Lab
 * 
 * --- FULL LOGIC DETAILS ---
 * This strategy is a highly selective dozen-betting system designed to reduce total 
 * spins exposed to house edge by waiting for specific statistical triggers.
 * 
 * Triggers (Evaluated when NOT currently in an active betting sequence):
 * 1. Six-Miss Trigger (Primary):
 *    - Triggered when any single dozen (1st, 2nd, or 3rd) has missed 6 consecutive spins.
 *    - Action: Bet on the overdue dozen.
 * 2. Strict Alternation / Follow-the-Winner Trigger (Secondary):
 *    - Triggered when the last 6 consecutive spins strictly alternate between TWO specific dozens
 *      (e.g., Dozen 1 and Dozen 2 in an A-B-A-B-A-B pattern).
 *    - Action: Bet on the most recent winning dozen, expecting a repeat ("Follow the Winner").
 * 
 * --- FULL BET PROGRESSION DETAILS ---
 * Base Unit: Set to `config.betLimits.minOutside` (e.g., $5 for standard tables).
 * 
 * Progression Levels:
 * - Level 1 (Primary Progression):
 *   Multipliers: [1, 3, 5, 7, 10] units.
 *   - Bet 1: 1 unit  (e.g., $5)
 *   - Bet 2: 3 units (e.g., $15)
 *   - Bet 3: 5 units (e.g., $25)
 *   - Bet 4: 7 units (e.g., $35)
 *   - Bet 5: 10 units (e.g., $50)
 * 
 * - Level 2 (Recovery Progression - Double Base Bet):
 *   Triggered if all 5 steps of Level 1 lose without a hit.
 *   Multipliers: [2, 6, 10, 14, 20] units.
 *   - Bet 1: 2 units  (e.g., $10)
 *   - Bet 2: 6 units  (e.g., $30)
 *   - Bet 3: 10 units (e.g., $50)
 *   - Bet 4: 14 units (e.g., $70)
 *   - Bet 5: 20 units (e.g., $100)
 * 
 * Progression Outcome Rules:
 * - On Win: Reset state, clear target dozen, and return to idle mode to await next trigger.
 * - On Loss: Advance to the next multiplier in the progression.
 * - If Level 2 completes and fails: Reset strategy state back to idle.
 * 
 * --- THE GOAL ---
 * Capture profit during high-probability trigger conditions and recover from loss streaks 
 * quickly via Level 2 recovery, immediately resetting to session idle upon securing a win.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.active = false;
        state.targetDozen = null; // 1, 2, or 3
        state.level = 1;          // 1 (Primary) or 2 (Recovery)
        state.step = 0;           // 0-indexed position in multiplier array
    }

    const level1Multipliers = [1, 3, 5, 7, 10];
    const level2Multipliers = [2, 6, 10, 14, 20];

    // Helper: Determine dozen of a winning number (0 / 00 / green return null)
    function getDozen(num) {
        if (typeof num !== 'number' || num <= 0 || num > 36) return null;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    }

    // 2. Evaluate outcome of last spin if we had an active bet
    if (state.active && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastDozen = getDozen(lastSpin.winningNumber);

        if (lastDozen === state.targetDozen) {
            // WIN: Reset state to search for next trigger
            state.active = false;
            state.targetDozen = null;
            state.level = 1;
            state.step = 0;
        } else {
            // LOSS: Advance step / level
            state.step++;
            if (state.level === 1 && state.step >= level1Multipliers.length) {
                // Move to Level 2 Recovery
                state.level = 2;
                state.step = 0;
            } else if (state.level === 2 && state.step >= level2Multipliers.length) {
                // Progression failed completely: Reset to idle
                state.active = false;
                state.targetDozen = null;
                state.level = 1;
                state.step = 0;
            }
        }
    }

    // 3. Search for triggers if currently idle
    if (!state.active) {
        if (spinHistory.length >= 6) {
            const last6Spins = spinHistory.slice(-6);
            const last6Dozens = last6Spins.map(s => getDozen(s.winningNumber));

            // Trigger 1: Single Dozen Missed 6 Spins in a Row
            for (let d = 1; d <= 3; d++) {
                if (last6Dozens.every(dozen => dozen !== d)) {
                    state.active = true;
                    state.targetDozen = d;
                    state.level = 1;
                    state.step = 0;
                    break;
                }
            }

            // Trigger 2: Strict 2-Dozen Alternation (A-B-A-B-A-B pattern over 6 spins)
            if (!state.active) {
                const allValidDozens = last6Dozens.every(d => d !== null);
                if (allValidDozens) {
                    const isAlternating = 
                        last6Dozens[0] === last6Dozens[2] && 
                        last6Dozens[2] === last6Dozens[4] &&
                        last6Dozens[1] === last6Dozens[3] && 
                        last6Dozens[3] === last6Dozens[5] &&
                        last6Dozens[0] !== last6Dozens[1];

                    if (isAlternating) {
                        state.active = true;
                        state.targetDozen = last6Dozens[last6Dozens.length - 1]; // Bet on the most recent dozen to repeat
                        state.level = 1;
                        state.step = 0;
                    }
                }
            }
        }
    }

    // 4. If no active trigger, place no bet
    if (!state.active || state.targetDozen === null) {
        return [];
    }

    // 5. Calculate Bet Amount based on current Level and Step
    const baseUnit = config.betLimits.minOutside || 5;
    const currentMultipliers = state.level === 1 ? level1Multipliers : level2Multipliers;
    const multiplier = currentMultipliers[state.step];

    let betAmount = baseUnit * multiplier;

    // 6. Clamp Bet Amount to Config Limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 7. Return Bet Object
    return [
        {
            type: 'dozen',
            value: state.targetDozen,
            amount: betAmount
        }
    ];
}