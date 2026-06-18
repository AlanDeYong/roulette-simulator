/**
 * Strategy Name: "Devious Dozens" Reboot (Peak Bankroll Target Tracking)
 * Source: "Devious Dozens" Reboot! 💵💵 Roulette Strategy by WillVegas (https://youtu.be/XNWMuUOHNfA)
 * * * Full Logic Details:
 * - This strategy dynamically covers 24 numbers by simultaneously betting on two Dozens.
 * - The bets are inherently asymmetrical, featuring a "Lower Bet" (1 unit base) and a "Higher Bet" (2 units base).
 * - POSITIONAL SHIFTING RULES:
 * - On a Win: Shift positions forward around the table layout (e.g., [2nd, 3rd] shifts to [3rd, 1st]).
 * - On a Loss or a Push: Stay put. Do not shift the dozens positions. Re-bet the exact same areas.
 * * * Full Bet Progression Details:
 * - If a spin results in a net loss, the positions stay put, and the progression tier increases by +1 unit.
 * - If a spin results in a push, the positions stay put, and the progression tier remains unchanged.
 * - If a spin results in a win, the positions shift forward, and the progression tier remains unchanged.
 * - RESET CONDITION: The strategy tracks the peak bankroll achieved during the session. Once the current bankroll
 * reaches or exceeds the target ($20 above the session's peak bankroll), the progression tier resets to 1, 
 * the dozens reset to [1, 2], and a new peak tracking baseline is established.
 * * * The Goal:
 * - Target Profit: Reach +$20 above the session's peak bankroll before resetting the system.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // ==========================================
    // 1. Peak Bankroll and Target Initialization/Reset
    // ==========================================
    if (!state.peakBankroll || bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Set the initial session target based on the starting/peak bankroll
    if (!state.targetBankroll) {
        state.targetBankroll = state.peakBankroll + 20;
    }

    // Reset progression completely if target profit from peak bankroll is achieved
    if (bankroll >= state.targetBankroll) {
        state.progressionTier = 1;
        state.currentDozens = [1, 2];
        state.peakBankroll = bankroll; // Update peak to current bankroll post-payout
        state.targetBankroll = bankroll + 20; // Establish next milestone target
    }

    // ==========================================
    // 2. Initialize Core State Variables
    // ==========================================
    if (!state.progressionTier) {
        state.progressionTier = 1; 
    }
    if (!state.currentDozens) {
        state.currentDozens = [1, 2]; 
    }

    const baseUnit = config.betLimits.minOutside || 5;

    // ==========================================
    // 3. Assess Previous Result & Adjust Multipliers
    // ==========================================
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;

        // Calculate previous bet values to determine round outcome
        let prevBetA = baseUnit * state.progressionTier;
        let prevBetB = (baseUnit * 2) * state.progressionTier;
        let prevTotalRisk = prevBetA + prevBetB;
        let wonAmount = 0;

        let hitFirstDozen = false;
        let hitSecondDozen = false;

        // Map winning number to its respective dozen
        if (winningNumber >= 1 && winningNumber <= 12) {
            if (state.currentDozens[0] === 1) hitFirstDozen = true;
            if (state.currentDozens[1] === 1) hitSecondDozen = true;
        } else if (winningNumber >= 13 && winningNumber <= 24) {
            if (state.currentDozens[0] === 2) hitFirstDozen = true;
            if (state.currentDozens[1] === 2) hitSecondDozen = true;
        } else if (winningNumber >= 25 && winningNumber <= 36) {
            if (state.currentDozens[0] === 3) hitFirstDozen = true;
            if (state.currentDozens[1] === 3) hitSecondDozen = true;
        }

        if (hitFirstDozen) {
            wonAmount = prevBetA * 3; 
        } else if (hitSecondDozen) {
            wonAmount = prevBetB * 3;
        }

        // ==========================================
        // 4. Update Progression and Shift Layout
        // ==========================================
        if (wonAmount > prevTotalRisk) {
            // WIN: Shift layout forward, keep progression level steady
            state.currentDozens = state.currentDozens.map(d => {
                let next = d + 1;
                return next > 3 ? 1 : next;
            });
        } else if (wonAmount < prevTotalRisk) {
            // LOSS: Stay put on layout, increase progression tier
            state.progressionTier += 1;
        } else {
            // PUSH: Stay put on layout, do nothing to progression tier
        }
    }

    // ==========================================
    // 5. Build and Clamp Final Bets
    // ==========================================
    let finalAmountA = baseUnit * state.progressionTier;
    let finalAmountB = (baseUnit * 2) * state.progressionTier;

    // Table limits enforcement
    finalAmountA = Math.max(finalAmountA, config.betLimits.minOutside);
    finalAmountA = Math.min(finalAmountA, config.betLimits.max);

    finalAmountB = Math.max(finalAmountB, config.betLimits.minOutside);
    finalAmountB = Math.min(finalAmountB, config.betLimits.max);

    // Safeguard bankroll protection
    if (bankroll < (finalAmountA + finalAmountB)) {
        return []; 
    }

    return [
        { type: 'dozen', value: state.currentDozens[0], amount: finalAmountA },
        { type: 'dozen', value: state.currentDozens[1], amount: finalAmountB }
    ];
}