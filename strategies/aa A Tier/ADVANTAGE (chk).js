/**
 * Advantage Method (Corrected Reset Logic)
 * 
 * Source: "Bet With Mo" (YouTube) - https://www.youtube.com/watch?v=QsQ1Phfo-Tg
 * 
 * The Logic: 
 * A high-coverage system targeting up to 30 numbers using a combination of 
 * Double Streets (Lines) and Splits.
 * 
 * The Progression (6 Levels):
 * - Target: Win 20 base units ($20) incrementally from the last peak bankroll.
 * - Reset: ONLY reset to Level 1 when the target bankroll (peak + 20) is reached.
 * - On Win (Target not reached): Rebet current level.
 * - On Total Loss: Advance immediately to the next progression level.
 * - On Partial Loss: Rebet the current level up to 2 times before advancing.
 * 
 * Progression Blueprint:
 * - Level 1: L1 Streets (1/6, 31/36) @ 2u. L1 Splits @ 1u.
 * - Level 2: Rebet L1. Add L2 Streets (7/12, 25/30) @ 4u. L1 Streets @ 4u. L2 Splits @ 1u.
 * - Level 3: Double all bets. Increase all streets by 2u. Add L3 Street (16/21) @ 10u.
 * - Level 4: Double all bets. Increase all streets by 2u.
 * - Level 5: Double all bets.
 * - Level 6 (Recovery): Add exactly 15u to each active street from Level 5.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = Math.max(config.betLimits.min, 1); 

    // 1. Initialization
    if (!state.initialized) {
        state.level = 1;
        state.partialLossRetries = 0;
        state.peakBankroll = bankroll;
        state.targetBankroll = state.peakBankroll + (20 * baseUnit);
        state.lastBankroll = bankroll;
        state.lastBetAmount = 0;
        state.initialized = true;
    }

    // 2. Process previous spin result and adjust progression
    if (spinHistory.length > 0) {
        const netChange = bankroll - state.lastBankroll;
        const didWinSomething = netChange > -state.lastBetAmount && netChange !== 0;
        const isWin = netChange > 0;
        const isPartialLoss = netChange < 0 && didWinSomething;
        const isTotalLoss = netChange === -state.lastBetAmount;

        // Condition A: Target Hit (Reset Condition)
        if (bankroll >= state.targetBankroll) {
            state.level = 1;
            state.partialLossRetries = 0;
            state.peakBankroll = bankroll; // Update new peak
            state.targetBankroll = state.peakBankroll + (20 * baseUnit); // Set next $20 milestone
        }
        // Condition B: Net Win (Target Not Reached)
        else if (isWin) {
            // Do not reset level. Just clear partial loss retries and rebet current level.
            state.partialLossRetries = 0;
        }
        // Condition C: Partial Loss (Net Negative, but some return hit)
        else if (isPartialLoss) {
            if (state.partialLossRetries < 2) {
                state.partialLossRetries++; // Rebet same level
            } else {
                state.level++; // Max retries hit, advance
                state.partialLossRetries = 0;
            }
        }
        // Condition D: Total Loss (Zero return)
        else if (isTotalLoss) {
            state.level++;
            state.partialLossRetries = 0;
        }

        // Safety: If progression busts past Level 6, reset to Level 1
        if (state.level > 6) {
            state.level = 1;
            state.partialLossRetries = 0;
        }
    }

    // Save bankroll for the next spin's comparison
    state.lastBankroll = bankroll;

    // 3. Progression Blueprint (Unit Allocations Per Level)
    const blueprint = {
        1: { strL1: 2,  strL2: 0,  strL3: 0,  splL1: 1, splL2: 0 },
        2: { strL1: 4,  strL2: 4,  strL3: 0,  splL1: 1, splL2: 1 },
        3: { strL1: 10, strL2: 10, strL3: 10, splL1: 2, splL2: 2 },
        4: { strL1: 22, strL2: 22, strL3: 22, splL1: 4, splL2: 4 },
        5: { strL1: 44, strL2: 44, strL3: 44, splL1: 8, splL2: 8 },
        6: { strL1: 59, strL2: 59, strL3: 59, splL1: 8, splL2: 8 }
    };

    const currentLevelUnits = blueprint[state.level];
    const bets = [];
    let totalBetAmount = 0;

    // Helper to calculate, clamp, and push bets
    const addBet = (type, value, units) => {
        if (units <= 0) return;
        
        let amount = units * baseUnit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        bets.push({ type, value, amount });
        totalBetAmount += amount;
    };

    // 4. Construct the Bets
    
    // L1 Streets: 1/6 and 31/36
    addBet('line', 1, currentLevelUnits.strL1);
    addBet('line', 31, currentLevelUnits.strL1);

    // L2 Streets: 7/12 and 25/30
    addBet('line', 7, currentLevelUnits.strL2);
    addBet('line', 25, currentLevelUnits.strL2);

    // L3 Street: 16/21
    addBet('line', 16, currentLevelUnits.strL3);

    // L1 Splits
    const l1Splits = [[2,3], [3,6], [5,6], [32,33], [33,36], [35,36]];
    l1Splits.forEach(splitVals => {
        addBet('split', splitVals, currentLevelUnits.splL1);
    });

    // L2 Splits
    const l2Splits = [[8,9], [9,12], [11,12], [26,27], [27,30], [29,30]];
    l2Splits.forEach(splitVals => {
        addBet('split', splitVals, currentLevelUnits.splL2);
    });

    // Save total bet amount for loss evaluation next round
    state.lastBetAmount = totalBetAmount;

    return bets;
}