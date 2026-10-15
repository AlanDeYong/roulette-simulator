/**
 * Roulette Strategy: Dynamic Dozen & Even-Money Coverage
 * * Source: Adapted from https://youtu.be/HheiKWrWjQY (YouTube Channel: WillVegas)
 * * The Full Logic in details:
 * This strategy dynamically covers 30 numbers by betting on an Even-Money space and a Dozen.
 * - Waiting Phase: The strategy observes the first 37 spins without betting.
 * - Hot Street Analysis: It counts occurrences of two double streets: 13-18 and 19-24 over the last 37 spins.
 * - If 13-18 is hotter: Bets are placed on Low (1-18) and the 3rd Dozen (25-36).
 * - If 19-24 is hotter (or tied): Bets are placed on High (19-36) and the 1st Dozen (1-12).
 * - The bets are placed in a 1:2 ratio (1 unit on Dozen, 2 units on Low/High).
 * - Win Condition: The Even-Money bet hits (+1 base unit profit).
 * - Push Condition: The Dozen bet hits (Break even).
 * - Loss Condition: The uncovered 6 numbers or Greens (0, 00) hit.
 * * The Full Bet Progression in details:
 * The strategy utilizes a standard Martingale-style doubling progression.
 * - Initial Bet (Level 0): 1 unit on Dozen, 2 units on Even-Money.
 * - After a Loss: Move up one progression level, doubling both bet amounts.
 * - After a Push: Remain at the exact same progression level.
 * - After a Win: Move down one progression level (halve the bet amounts, minimum level 0).
 * - Session/Mode Reset: The progression resets to Level 0 AND the past 37 spins are re-evaluated to determine 
 *   the new betting mode ONLY when the session's peak profit (a new high bankroll) is reached. If the level 
 *   drops to 0 naturally via wins before hitting a new peak, the mode does not change.
 * * The Goal:
 * To accumulate slow, steady session profit by dynamically avoiding the coldest sections of the board.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for 37 spins to gather enough data
    if (spinHistory.length < 37) {
        return [];
    }

    // 2. Initialize State Persistence
    if (state.level === undefined) {
        state.level = 0;
        state.peakBankroll = bankroll;
        state.needsModeEvaluation = true; // Evaluate mode on the very first valid spin
    }

    // 3. Evaluate Last Spin & Adjust Progression (if we had an active bet)
    if (state.currentMode !== undefined) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        if (state.currentMode === 'LOW_3RD') {
            if (num >= 1 && num <= 18) {
                state.level = Math.max(0, state.level - 1); // Win: Step down
            } else if (num >= 25 && num <= 36) {
                // Push: Level remains unchanged
            } else {
                state.level++; // Loss: Double up
            }
        } else if (state.currentMode === 'HIGH_1ST') {
            if (num >= 19 && num <= 36) {
                state.level = Math.max(0, state.level - 1); // Win: Step down
            } else if (num >= 1 && num <= 12) {
                // Push: Level remains unchanged
            } else {
                state.level++; // Loss: Double up
            }
        }
    }

    // 4. Reset Progression & Trigger Mode Re-evaluation ONLY on New Session Peak Profit
    if (bankroll > state.peakBankroll) {
        state.level = 0;
        state.peakBankroll = bankroll;
        state.needsModeEvaluation = true; 
    }

    // 5. Determine Mode dynamically ONLY if a reset was triggered
    if (state.needsModeEvaluation) {
        let count13_18 = 0;
        let count19_24 = 0;
        
        // Analyze the last 37 spins
        const last37 = spinHistory.slice(-37);
        for (let i = 0; i < last37.length; i++) {
            const n = last37[i].winningNumber;
            if (n >= 13 && n <= 18) count13_18++;
            else if (n >= 19 && n <= 24) count19_24++;
        }

        // Set the active betting mode based on the hotter double street
        if (count13_18 > count19_24) {
            state.currentMode = 'LOW_3RD';
        } else {
            state.currentMode = 'HIGH_1ST';
        }
        
        // Lock in the mode until the next peak profit is reached
        state.needsModeEvaluation = false;
    }

    // 6. Calculate Bet Amounts
    const baseUnit = config.betLimits.minOutside;
    const multiplier = Math.pow(2, state.level);
    
    let dozenAmount = baseUnit * multiplier;
    let evenAmount = (baseUnit * 2) * multiplier;

    // 7. Clamp Amounts to Respect Bet Limits
    dozenAmount = Math.max(config.betLimits.minOutside, Math.min(dozenAmount, config.betLimits.max));
    evenAmount = Math.max(config.betLimits.minOutside, Math.min(evenAmount, config.betLimits.max));

    // 8. Return Active Bets based on Current Mode
    if (state.currentMode === 'LOW_3RD') {
        return [
            { type: 'low', amount: evenAmount },
            { type: 'dozen', value: 3, amount: dozenAmount }
        ];
    } else {
        return [
            { type: 'high', amount: evenAmount },
            { type: 'dozen', value: 1, amount: dozenAmount }
        ];
    }
}