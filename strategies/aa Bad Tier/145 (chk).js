/**
 * 145 ROULETTE STRATEGY (9-LEVEL SYSTEM WITH EXPANDED NUMBER COVERAGE)
 * 
 * Source:
 * - URL: https://youtu.be/gCEj0f9YEgs
 * - Channel: Bet With Mo
 * 
 * The Full Logic in Details:
 * - Base Bets: Starts with 1 unit on Street bet and 4 units on Dozen bet (Total = 5 units).
 * - Side Selection: Alternates between Low Progression (1st Dozen + Street 13) and 
 *   High Progression (3rd Dozen + Street 22) upon hitting peak session profit.
 * - Trigger: Bet placed on every spin continuously, progressing levels on losses.
 * 
 * The Full Bet Progression in Details (9 Levels):
 * - Level 1: Dozen (4u), Street (1u). [Total: 5u]
 * - Level 2 (Loss 1): Dozen (8u), Street (2u), Add Set 1 Straight Numbers @ 1u each. [Total: 15u]
 *   - Low Side Set 1: [3, 6, 9, 12, 15]
 *   - High Side Set 1: [24, 27, 30, 33, 36]
 * - Level 3 (Loss 2): Dozen (12u), Street (3u), Add Set 2 Straight Numbers @ 1u each. [Total: 25u]
 *   - Low Side Set 2: [2, 5, 8, 11, 14]
 *   - High Side Set 2: [23, 26, 29, 32, 35]
 * - Level 4 (Loss 3): Dozen (16u), Street (4u), Keep all Set 1 & Set 2 Numbers @ 1u each. [Total: 30u]
 * - Level 5 (Loss 4): Dozen (20u), Street (5u), Keep all Set 1 & Set 2 Numbers @ 1u each. [Total: 35u]
 * - Level 6 (Loss 5): Dozen (24u), Street (6u), Increase all Straight Numbers by +1u (2u each). [Total: 50u]
 * - Level 7 (Loss 6): Dozen (28u), Street (7u), Keep all Straight Numbers @ 2u each. [Total: 55u]
 * - Level 8 (Loss 7): Double up all bets from Level 7 (Dozen 56u, Street 14u, Numbers 4u each). [Total: 110u]
 * - Level 9 (Loss 8): Double up all bets from Level 8 (Dozen 112u, Street 28u, Numbers 8u each). [Total: 220u]
 * 
 * Win / Loss Rules:
 * - On Loss: Rebet and advance to the next progression level.
 * - On Win: Check session bankroll. If new peak profit is reached, reset level to 1 and switch sides.
 *   Otherwise, rebet at current level.
 * 
 * Goal:
 * - Capitalize on run-outs and lock in profits at session peaks while maintaining side rotation.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.side = 'low'; // 'low' = 1st Dozen + Street 13; 'high' = 3rd Dozen + Street 22
        state.peakBankroll = bankroll;
    }

    // 2. Evaluate Last Spin Result & Handle Progression
    if (spinHistory.length > 0) {
        if (bankroll > state.peakBankroll) {
            // Reached peak session profit: reset to Level 1 and switch sides
            state.peakBankroll = bankroll;
            state.level = 1;
            state.side = state.side === 'low' ? 'high' : 'low';
        } else {
            const lastSpin = spinHistory[spinHistory.length - 1];
            const winNum = lastSpin.winningNumber;
            
            // Check if last spin was a winning spin for active side
            const isLowWin = (winNum >= 1 && winNum <= 15);
            const isHighWin = (winNum >= 22 && winNum <= 36);
            const wasWin = state.side === 'low' ? isLowWin : isHighWin;

            if (!wasWin) {
                // Advance level on loss up to Level 9
                state.level = Math.min(9, state.level + 1);
            }
            // On win without peak bankroll, level remains unchanged (rebet)
        }
    }

    // 3. Define Level Multipliers (in base units)
    const levelConfigs = {
        1: { dozen: 4, street: 1, set1: 0, set2: 0 },
        2: { dozen: 8, street: 2, set1: 1, set2: 0 },
        3: { dozen: 12, street: 3, set1: 1, set2: 1 },
        4: { dozen: 16, street: 4, set1: 1, set2: 1 },
        5: { dozen: 20, street: 5, set1: 1, set2: 1 },
        6: { dozen: 24, street: 6, set1: 2, set2: 2 },
        7: { dozen: 28, street: 7, set1: 2, set2: 2 },
        8: { dozen: 56, street: 14, set1: 4, set2: 4 },
        9: { dozen: 112, street: 28, set1: 8, set2: 8 }
    };

    const cfg = levelConfigs[state.level] || levelConfigs[1];

    // 4. Calculate Bet Amounts Respecting Table Limits
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Scale units directly from limits
    let dozenAmt = Math.min(Math.max(cfg.dozen * minInside, minOutside), maxBet);
    let streetAmt = Math.min(Math.max(cfg.street * minInside, minInside), maxBet);
    
    let set1Amt = cfg.set1 > 0 ? Math.min(Math.max(cfg.set1 * minInside, minInside), maxBet) : 0;
    let set2Amt = cfg.set2 > 0 ? Math.min(Math.max(cfg.set2 * minInside, minInside), maxBet) : 0;

    // 5. Construct Bet Array
    const bets = [];

    if (state.side === 'low') {
        // Low side: 1st Dozen (1-12) + Street 13 (covers 13, 14, 15)
        bets.push({ type: 'dozen', value: 1, amount: dozenAmt });
        bets.push({ type: 'street', value: 13, amount: streetAmt });

        // Set 1 Numbers: 3, 6, 9, 12, 15
        if (set1Amt > 0) {
            const set1Numbers = [3, 6, 9, 12, 15];
            set1Numbers.forEach(num => {
                bets.push({ type: 'number', value: num, amount: set1Amt });
            });
        }

        // Set 2 Numbers: 2, 5, 8, 11, 14
        if (set2Amt > 0) {
            const set2Numbers = [2, 5, 8, 11, 14];
            set2Numbers.forEach(num => {
                bets.push({ type: 'number', value: num, amount: set2Amt });
            });
        }
    } else {
        // High side: 3rd Dozen (25-36) + Street 22 (covers 22, 23, 24)
        bets.push({ type: 'dozen', value: 3, amount: dozenAmt });
        bets.push({ type: 'street', value: 22, amount: streetAmt });

        // Set 1 Numbers: 24, 27, 30, 33, 36
        if (set1Amt > 0) {
            const set1Numbers = [24, 27, 30, 33, 36];
            set1Numbers.forEach(num => {
                bets.push({ type: 'number', value: num, amount: set1Amt });
            });
        }

        // Set 2 Numbers: 23, 26, 29, 32, 35
        if (set2Amt > 0) {
            const set2Numbers = [23, 26, 29, 32, 35];
            set2Numbers.forEach(num => {
                bets.push({ type: 'number', value: num, amount: set2Amt });
            });
        }
    }

    return bets;
}