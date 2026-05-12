/**
 * SOURCE:
 * URL: https://www.youtube.com/watch?v=TjgohCPr-YY
 * Channel: Bet With Mo
 * * THE LOGIC:
 * Strategy Name: "Money In" (Alternating Sides Variant)
 * A coverage strategy designed for low-rollers. It bets on one side of the board (Low or High)
 * and hedges with specific street bets on that same side. 
 * - When betting "Low", streets are placed descending from the center: 16, 13, 10, 7, 4, 1.
 * - When betting "High", streets are mirrored ascending from the center: 19, 22, 25, 28, 31, 34.
 * * THE PROGRESSION:
 * Uses an 8-level progression system based on table minimums (1 unit = config.betLimits.min):
 * - Level 1: 1u Side, 1u 1st Street.
 * - Level 2 (Loss): Rebet + add 1u Side, 1u 2nd Street. (Total: 2u Side, 1u/1u Streets)
 * - Level 3 (Loss): Rebet, double all + add 2u Side, 2u 3rd Street.
 * - Level 4 (Loss): Rebet + add 2u Side, 2u 4th Street.
 * - Level 5 (Loss): Rebet, double all + add 4u Side, 4u 5th Street.
 * - Level 6 (Loss): Rebet + add 4u Side, 4u 6th Street.
 * - Level 7 (Loss): Double all bets.
 * - Level 8 (Loss): Double all bets.
 * * - On Win (Street hits): Reset to Level 1 and switch to the opposite side (Low -> High -> Low).
 * - On Push (Side hits, but missed street): Stay on current level. After 3rd push, advance level.
 * - On Bust (Loss at Level 8): Reset to Level 1 and switch to the opposite side.
 * * THE GOAL:
 * Profit $20 (or 20 base units). Upon reaching this session profit goal, the session 
 * baseline resets, and progression resets to Level 1 (switching sides).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.level) {
        state.level = 1;
        state.pushCount = 0;
        state.sessionStartBankroll = bankroll;
        state.currentSide = 'low'; // Start on the low side
        state.lastStreets = [];
    }

    // FIX: Tie the base unit to the table minimum. 
    // This ensures your multipliers bypass the limit clamping.
    const baseUnit = config.betLimits.min; 
    let shouldReset = false;

    // 2. Evaluate Previous Spin (if any)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        const isLowNumber = (num >= 1 && num <= 18);
        const isHighNumber = (num >= 19 && num <= 36);
        const isSideWin = state.currentSide === 'low' ? isLowNumber : isHighNumber;
        
        // Check if the number falls within any of our previously placed street bets
        const isStreetWin = state.lastStreets.some(st => num >= st && num <= st + 2);

        if (isStreetWin) {
            // WIN: Trigger reset and side flip
            shouldReset = true;
        } else if (isSideWin) {
            // PUSH: Side hit, but missed street
            state.pushCount++;
            if (state.pushCount >= 3) {
                state.level++;
                state.pushCount = 0;
            }
        } else {
            // LOSS: Missed both side and street
            state.level++;
            state.pushCount = 0;
        }

        // Cap Level at 8 (Bust triggers reset)
        if (state.level > 8) {
            shouldReset = true;
        }
    }

    // 3. Goal Checking ($20 or 20 units profit)
    const sessionProfit = bankroll - state.sessionStartBankroll;
    if (sessionProfit >= (20 * baseUnit)) {
        shouldReset = true;
        state.sessionStartBankroll = bankroll; // Reset session baseline
    }

    // Apply Reset Logic (Executes once to prevent double-flipping the side)
    if (shouldReset) {
        state.level = 1;
        state.pushCount = 0;
        state.currentSide = state.currentSide === 'low' ? 'high' : 'low';
    }

    // 4. Progression & Street Definitions
    const progression = {
        1: { sideUnits: 1,  streetUnits: [1] },
        2: { sideUnits: 2,  streetUnits: [1, 1] },
        3: { sideUnits: 6,  streetUnits: [2, 2, 2] },
        4: { sideUnits: 8,  streetUnits: [2, 2, 2, 2] },
        5: { sideUnits: 20, streetUnits: [4, 4, 4, 4, 4] },
        6: { sideUnits: 24, streetUnits: [4, 4, 4, 4, 4, 4] },
        7: { sideUnits: 48, streetUnits: [8, 8, 8, 8, 8, 8] },
        8: { sideUnits: 96, streetUnits: [16, 16, 16, 16, 16, 16] }
    };

    // Define mirrored streets depending on the active side
    const lowStreets = [16, 13, 10, 7, 4, 1];
    const highStreets = [19, 22, 25, 28, 31, 34];
    const activeStreets = state.currentSide === 'low' ? lowStreets : highStreets;

    // 5. Generate Bets for Current Level
    const currentProgression = progression[state.level];
    let bets = [];

    // Calculate and Clamp the Side Bet (Outside Bet)
    let sideAmount = currentProgression.sideUnits * baseUnit;
    sideAmount = Math.max(sideAmount, config.betLimits.minOutside);
    sideAmount = Math.min(sideAmount, config.betLimits.max);
    bets.push({ type: state.currentSide, amount: sideAmount });

    // Store streets for next spin evaluation
    state.lastStreets = [];

    // Calculate and Clamp the Street Bets (Inside Bets)
    for (let i = 0; i < currentProgression.streetUnits.length; i++) {
        let stAmount = currentProgression.streetUnits[i] * baseUnit;
        stAmount = Math.max(stAmount, config.betLimits.min);
        stAmount = Math.min(stAmount, config.betLimits.max);
        
        let stValue = activeStreets[i];
        bets.push({ type: 'street', value: stValue, amount: stAmount });
        state.lastStreets.push(stValue); // Save the base value of the street
    }

    return bets;
}