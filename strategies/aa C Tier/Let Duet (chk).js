/**
 * Strategy: "Let Duet" (Modified with Loss Recovery)
 * Source: CEG Dealer School & User Customization
 * URL: https://youtu.be/XfXkxLZqhiY?si=IJVmLCrNs0hUfXbS
 * * The Logic:
 * - Formation: "W" shape using 7 Corner bets.
 * - Corners: [1, 8, 13, 17, 19, 26, 31]
 * - Triggers:
 * - Bet every spin.
 * * The Progression (User Defined):
 * 1. Loss Progression (Negative):
 * - Trigger: Increases based on consecutive losses.
 * - Schedule (updates every 3 consecutive losses):
 * - Losses 0-2: Base Unit
 * - Losses 3-5: Base + 1 Unit
 * - Losses 6-8: Double the previous ( (Base+1)*2 )
 * - Losses 9-11: Add 1 Unit to previous
 * - Losses 12-14: Double the previous
 * - Pattern: Add 1 Unit -> Double -> Repeat.
 * 2. Win Logic:
 * - Check Session Profit (Current Bankroll - Starting Bankroll).
 * - IF Session Profit >= Target (e.g., 10% or 100 units): 
 * RESET strategy to Base Unit and 0 losses.
 * - ELSE (Profit not met): 
 * "REBET" (Maintain the same bet size as the winning spin to continue recovery).
 * * The Goal:
 * - Recover losses using a stepped martingale/d'alembert hybrid, then reset once a session profit target is hit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- Configuration ---
    const baseUnit = config.betLimits.minOutside || 5; 
    const corners = [1, 8, 13, 17, 19, 26, 31];
    const targetProfit = 50; // Target profit to trigger a full reset

    // --- Helper: Check Corner Win ---
    function isCornerWin(cornerValue, winningNumber) {
        const covered = [
            cornerValue, 
            cornerValue + 1, 
            cornerValue + 3, 
            cornerValue + 4
        ];
        return covered.includes(winningNumber);
    }

    // --- State Initialization ---
    if (state.consecutiveLosses === undefined) state.consecutiveLosses = 0;
    if (state.startBankroll === undefined) state.startBankroll = bankroll;
    if (state.currentUnitSize === undefined) state.currentUnitSize = baseUnit;
    if (state.lastBets === undefined) state.lastBets = [];

    // --- Process Last Spin ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNumber = lastSpin.winningNumber;
        
        // Calculate P/L for the last spin
        let spinWinnings = 0;
        let spinCost = 0;
        
        state.lastBets.forEach(b => {
            spinCost += b.amount;
            if (b.type === 'corner' && isCornerWin(b.value, lastWinNumber)) {
                spinWinnings += (b.amount * 8) + b.amount;
            }
        });

        const netSpinProfit = spinWinnings - spinCost;
        const totalSessionProfit = bankroll - state.startBankroll;

        if (netSpinProfit > 0) {
            // --- WIN Logic ---
            if (totalSessionProfit >= targetProfit) {
                // Target met: Reset everything
                state.consecutiveLosses = 0;
                state.currentUnitSize = baseUnit;
            } else {
                // Target NOT met: "Rebet"
                // We maintain the currentUnitSize and do NOT increment consecutiveLosses.
                // We also do not reset consecutiveLosses, effectively pausing the loss ladder
                // to capitalize on the current bet size for recovery.
            }
        } else {
            // --- LOSS Logic ---
            state.consecutiveLosses++;
            
            // Calculate new Unit Size based on "Add 1, then Double" cycle every 3 losses
            // Cycles change every 3 losses (floored)
            const cycles = Math.floor(state.consecutiveLosses / 3);
            
            let calculatedUnit = baseUnit;
            
            // Iteratively apply the progression logic
            // Cycle 1 (Loss 3-5): Add 1
            // Cycle 2 (Loss 6-8): Double
            // Cycle 3 (Loss 9-11): Add 1
            // Cycle 4 (Loss 12-14): Double
            for (let i = 1; i <= cycles; i++) {
                if (i % 2 !== 0) {
                    // Odd Cycles (1, 3, 5...): Add 1 Unit
                    calculatedUnit += baseUnit; 
                } else {
                    // Even Cycles (2, 4, 6...): Double Up
                    calculatedUnit = calculatedUnit * 2;
                }
            }
            
            state.currentUnitSize = calculatedUnit;
        }
    }

    // --- Construct Bets ---
    // Ensure unit doesn't exceed max bet limit divided by number of bets (to be safe) 
    // or just clamp individual bets.
    let finalUnit = state.currentUnitSize;
    
    // Clamp to min/max limits
    finalUnit = Math.max(finalUnit, config.betLimits.min);
    finalUnit = Math.min(finalUnit, config.betLimits.max);

    const newBets = corners.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: finalUnit
    }));

    // --- Update State ---
    state.lastBets = newBets;

    return newBets;
}