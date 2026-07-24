/**
 * Roulette Strategy: Exclusion (Cumulative Board Coverage)
 * 
 * Source:
 * - YouTube Channel: Bet With Mo
 * - Video URL: https://youtu.be/BYuLkmSwpA4
 * 
 * The Full Logic in Details:
 * - The board is divided into 6 double streets (6-line segments) strictly within dozens.
 * - This is a CUMULATIVE betting strategy. When a loss occurs, you "Rebet" (keep all 
 *   previously placed bets exactly where they are) AND add new bets targeting the double 
 *   street that just caused the loss, excluding the specific winning number.
 * - As the losing streak extends, you cover more and more of the board (up to ~67%).
 * 
 * The Full Bet Progression in Details (Total Units perfectly mapping 5-10-15-40-50-100-200-325):
 * - Level 1: Place 1 unit each on the 5 numbers of the last winning double street. (Total: 5)
 * - Level 2 (Loss 1): Rebet. Add 1 unit each on 5 numbers of the NEW winning double street. (Total: 10)
 * - Level 3 (Loss 2): Rebet. Add 1 unit each on 5 numbers of the NEW winning double street. (Total: 15)
 * - Level 4 (Loss 3): Rebet. Add 1 unit each to NEW winning double street, THEN double ALL bets. (Total: 40)
 * - Level 5 (Loss 4): Rebet. Add 2 units each on 5 numbers of the NEW winning double street. (Total: 50)
 * - Level 6 (Loss 5): Rebet. Double ALL bets. (Total: 100)
 * - Level 7 (Loss 6): Rebet. Double ALL bets. (Total: 200)
 * - Level 8 (Loss 7): Rebet. Increase ALL active bets by 5 units each. (Total: 325, assuming 25 unique spots)
 * 
 * Target / Stop Conditions:
 * - WIN & Bankroll >= Peak Session Profit: Reset progression to Level 1 and clear the board.
 * - WIN & Bankroll < Peak: Rebet only. Do not add new numbers, do not increase levels (Grind recovery).
 * - All bet outputs are dynamically clamped to `config.betLimits.min` and `.max`.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (!state.init) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.activeBets = {}; // Tracks { number: unitAmount } cumulatively
        state.lastValidSectionIdx = 0;
        state.init = true;
    }

    // Refresh maximum session peak bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Define the six double street segments restricted within dozens
    const sections = [
        [1, 2, 3, 4, 5, 6],
        [7, 8, 9, 10, 11, 12],
        [13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24],
        [25, 26, 27, 28, 29, 30],
        [31, 32, 33, 34, 35, 36]
    ];

    let lastWinningNumber = null;
    let triggerReset = false;
    let isLoss = false;

    // 2. Evaluate Outcomes and Determine Next Step
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        lastWinningNumber = lastSpin.winningNumber;

        // Track the valid section of the winning number (Ignore 0/00 for section mapping)
        if (lastWinningNumber >= 1 && lastWinningNumber <= 36) {
            for (let i = 0; i < sections.length; i++) {
                if (sections[i].includes(lastWinningNumber)) {
                    state.lastValidSectionIdx = i;
                    break;
                }
            }
        }

        // Check if the previous spin hit one of our active cumulative bets
        if (state.lastPlacedBets && state.lastPlacedBets.length > 0) {
            const wasWin = state.lastPlacedBets.some(b => b.type === 'number' && b.value === lastWinningNumber);
            
            if (wasWin) {
                if (bankroll >= state.peakBankroll) {
                    triggerReset = true; // Win + Peak = Full Reset
                }
                // If it's a win but NOT a peak, triggerReset stays false and isLoss stays false
                // This results in a strict "Rebet" bypassing level progression.
            } else {
                isLoss = true; // Loss = Progression + New Numbers
                state.level++;
                if (state.level > 8) {
                    triggerReset = true; // Progression Bust = Full Reset
                }
            }
        } else {
            triggerReset = true; // First spin with active bets
        }
    } else {
        triggerReset = true; // Very first spin of simulation
    }

    // 3. Process the Cumulative Betting Logic for the Current Level
    if (triggerReset) {
        state.level = 1;
        state.activeBets = {}; // Clear the board completely
    }

    // Helper: Add units to the 5 numbers of the most recent winning double street
    function addUnitsToTargetSection(unitAmount) {
        const targetSection = sections[state.lastValidSectionIdx];
        let countAdded = 0;
        
        targetSection.forEach(num => {
            if (num !== lastWinningNumber) {
                state.activeBets[num] = (state.activeBets[num] || 0) + unitAmount;
                countAdded++;
            }
        });

        // Safeguard: If the last winning number was 0, it wouldn't match any number in the section, 
        // meaning 6 bets would be added instead of 5. We must pop one to preserve the exact math.
        if (countAdded === 6) {
            delete state.activeBets[targetSection[5]];
        }
    }

    // Helper: Double all units currently on the board
    function doubleAllBets() {
        for (let num in state.activeBets) {
            state.activeBets[num] *= 2;
        }
    }

    // Helper: Add flat units to all spots currently on the board
    function increaseAllBets(unitAmount) {
        for (let num in state.activeBets) {
            state.activeBets[num] += unitAmount;
        }
    }

    // Apply exact step-by-step math rules
    if (triggerReset) {
        addUnitsToTargetSection(1); // Level 1
    } else if (isLoss) {
        switch (state.level) {
            case 2:
                addUnitsToTargetSection(1);
                break;
            case 3:
                addUnitsToTargetSection(1);
                break;
            case 4:
                addUnitsToTargetSection(1);
                doubleAllBets();
                break;
            case 5:
                addUnitsToTargetSection(2);
                break;
            case 6:
                doubleAllBets();
                break;
            case 7:
                doubleAllBets();
                break;
            case 8:
                increaseAllBets(5);
                break;
        }
    }

    // 4. Construct Final Bets Array from the Cumulative State
    const currentBets = [];
    state.lastPlacedBets = [];
    const baseUnitAmount = config.betLimits.min; 

    for (const numStr in state.activeBets) {
        const units = state.activeBets[numStr];
        if (units > 0) {
            let betAmount = baseUnitAmount * units;

            // Strict limit clamping
            betAmount = Math.max(betAmount, config.betLimits.min);
            betAmount = Math.min(betAmount, config.betLimits.max);

            const betObj = {
                type: 'number',
                value: parseInt(numStr, 10),
                amount: betAmount
            };

            currentBets.push(betObj);
            state.lastPlacedBets.push(betObj);
        }
    }

    return currentBets;
}