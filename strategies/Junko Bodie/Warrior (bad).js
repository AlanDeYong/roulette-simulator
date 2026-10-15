/**
 * Warrior Roulette Strategy
 * 
 * Source:
 * - URL: https://youtu.be/ZdG-6F3EEKk
 * - Channel: Junko Bodie
 * - Strategy Name: Warrior Roulette Strategy (formerly "Bushido")
 * 
 * Strategy Logic:
 * - The strategy combines high-coverage inside number bets (16 straight-up numbers across 2 verticals/columns)
 *   with 2 outside Column hedge bets (2 out of 3 columns covered).
 * - Target / Goal: Reach a NEW SESSION HIGH profit on each cycle. The moment current bankroll surpasses
 *   the previous peak bankroll, the entire strategy resets to base Level 1 bets.
 * 
 * Bet Placements:
 * - 16 Straight-Up Inside Bets: 8 numbers in Column 1 (1, 4, 7, 10, 13, 16, 19, 22) and 8 numbers in Column 2 (2, 5, 8, 11, 14, 17, 20, 23).
 * - 2 Outside Column Bets: 1 unit on Column 1 and 1 unit on Column 2 (or Column 3 hedge).
 * 
 * Bet Progression:
 * 1. Phase 1 (Initial Doubling / Martingale Phase):
 *    - Base bets start at 1 unit per inside number (config.betLimits.min) and 1 base unit per outside column (config.betLimits.minOutside).
 *    - On a loss or spin that does not reach a new peak bankroll, double the entire bet up to 2 times (1x -> 2x -> 4x).
 * 2. Phase 2 (Recovery Stepping Phase):
 *    - If 4x multiplier is reached and the session has not achieved a new session high, transition into Phase 2 recovery.
 *    - In Phase 2, inside bets step up incrementally after each spin:
 *      - Steps 1-6: Increase inside unit by +1 base unit per step.
 *      - Steps 7-10: Increase inside unit by +2 base units per step.
 *      - Steps 11+: Increase inside unit by +5 base units per step.
 *    - Outside column bets scale proportionally to maintain partial win safety net.
 * 3. Reset Rule:
 *    - The moment any spin produces a new peak bankroll (current bankroll > peak bankroll), the strategy immediately resets
 *      back to Phase 1, Level 1 base bets.
 * 
 * Target & Stop Loss:
 * - Profit Target: Continuous peak profit accumulation (Hit-and-Run or session profit target e.g., +10% to +20% bankroll).
 * - Stop Loss: Maximum bankroll loss limit or bankroll depletion.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Minimum and Maximum Bet Limits
    const minInside = config.betLimits?.min || 1;
    const minOutside = config.betLimits?.minOutside || 5;
    const maxBet = config.betLimits?.max || 500;

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.initialized = true;
        state.peakBankroll = bankroll;
        state.phase = 1;             // Phase 1: Doubling stage, Phase 2: Stepping Recovery stage
        state.doublesCount = 0;      // Tracks doubled bets in Phase 1 (0, 1, 2)
        state.multiplier = 1;        // Bet multiplier for Phase 1 (1x, 2x, 4x)
        state.recoveryStep = 0;      // Current step in Phase 2 recovery
    }

    // 3. Evaluate Spin History & Adjust Progression
    if (spinHistory && spinHistory.length > 0) {
        // Check if current bankroll hit a new session peak
        if (bankroll > state.peakBankroll) {
            // New Session High achieved -> Reset to Base Level 1
            state.peakBankroll = bankroll;
            state.phase = 1;
            state.doublesCount = 0;
            state.multiplier = 1;
            state.recoveryStep = 0;
        } else {
            // Did not reach new high -> Advance Progression
            if (state.phase === 1) {
                if (state.doublesCount < 2) {
                    // Double up (up to 2 times: 1x -> 2x -> 4x)
                    state.doublesCount++;
                    state.multiplier *= 2;
                } else {
                    // Transition to Phase 2: Stepping Recovery
                    state.phase = 2;
                    state.recoveryStep = 1;
                }
            } else if (state.phase === 2) {
                // Step progression inside recovery
                state.recoveryStep++;
            }
        }
    } else {
        // First spin baseline setup
        state.peakBankroll = bankroll;
    }

    // 4. Calculate Unit Amounts Based on Active Phase
    let insideUnit = minInside;
    let outsideUnit = minOutside;

    if (state.phase === 1) {
        // Phase 1: Apply Martingale Multiplier (1x, 2x, 4x)
        insideUnit = minInside * state.multiplier;
        outsideUnit = minOutside * state.multiplier;
    } else if (state.phase === 2) {
        // Phase 2: Stepping Recovery Progression
        let stepAdd = 0;
        const step = state.recoveryStep;

        if (step <= 6) {
            stepAdd = step; // +1 unit per step for steps 1-6
        } else if (step <= 10) {
            stepAdd = 6 + (step - 6) * 2; // +2 units per step for steps 7-10
        } else {
            stepAdd = 14 + (step - 10) * 5; // +5 units per step for steps 11+
        }

        insideUnit = minInside + (stepAdd * minInside);
        // Scale outside hedge proportionally to inside unit expansion
        const scaleRatio = insideUnit / minInside;
        outsideUnit = Math.round(minOutside * Math.max(1, scaleRatio * 0.5));
    }

    // 5. Clamp Bet Amounts to Table Limits
    const clampBet = (amount, minLimit) => {
        return Math.max(minLimit, Math.min(amount, maxBet));
    };

    const finalInsideBet = clampBet(insideUnit, minInside);
    const finalOutsideBet = clampBet(outsideUnit, minOutside);

    // 6. Define Bet Placements (16 Inside Numbers + 2 Column Outside Hedges)
    // 8 numbers in Column 1 + 8 numbers in Column 2
    const insideNumbers = [
        1, 4, 7, 10, 13, 16, 19, 22,   // 8 numbers in Column 1
        2, 5, 8, 11, 14, 17, 20, 23    // 8 numbers in Column 2
    ];

    const bets = [];

    // Place Inside Bets on 16 individual numbers
    for (const num of insideNumbers) {
        bets.push({
            type: 'number',
            value: num,
            amount: finalInsideBet
        });
    }

    // Place Outside Hedge Bets on Column 1 and Column 2
    bets.push({
        type: 'column',
        value: 1,
        amount: finalOutsideBet
    });

    bets.push({
        type: 'column',
        value: 2,
        amount: finalOutsideBet
    });

    // 7. Total Bet Sanity Check against Bankroll
    const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetAmount > bankroll) {
        // Scale down bets proportionally if bankroll is low
        const ratio = bankroll / totalBetAmount;
        if (ratio < 0.2) return []; // Stop betting if bankroll is exhausted

        return bets.map(b => ({
            ...b,
            amount: clampBet(Math.floor(b.amount * ratio), b.type === 'number' ? minInside : minOutside)
        }));
    }

    return bets;
}