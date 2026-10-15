/**
 * Strategy: Star 2.2 Betting System
 * * Source:
 * - URL: https://youtu.be/n9D-pMDFbl4?si=g3b71aJs1iz0wVZu
 * - YouTube Channel: Casino Matchmaker
 * * The Full Logic in Details:
 * - The strategy operates entirely on Even Chance bets. This function implements the 
 * "Follow the Winning Color" approach as showcased in the source video.
 * - If the spin history is empty, it acts as a baseline trigger spin and no bet is placed.
 * - Otherwise, it identifies the last winning color ('red' or 'black') and places the next bet on that same color.
 * If the last winning color was 'green' (0 or 00), it safely defaults to 'red' or follows the last known color state.
 * * The Full Bet Progression in Details:
 * - The system operates on an automated progression matrix consisting of alternating "Grey" (Safety) 
 * and "White" (Parlay) levels structured to capture consecutive wins.
 * - Progression Matrix Levels:
 * Level 1: $10 (Base) -> Win 1st bet: Done/Reset immediately. Lose: Go to Level 2.
 * Level 2: $10 (Grey Zone) -> Win: Stay/Repeat $10. Lose: Go to Level 3.
 * Level 3: $10 (White Zone) -> Win: Go to Level 4 (Parlay). Lose: Go to Level 5.
 * Level 4: $20 (White Zone Parlay) -> Win: Done/Reset. Lose: Go to Level 5.
 * Level 5: $20 (Grey Zone) -> Win: Stay/Repeat $20. Lose: Go to Level 6.
 * Level 6: $20 (White Zone) -> Win: Go to Level 7 (Parlay). Lose: Go to Level 8.
 * Level 7: $40 (White Zone Parlay) -> Win: Done/Reset. Lose: Go to Level 8.
 * Level 8: $40 (Grey Zone) -> Win: Stay/Repeat $40. Lose: Go to Level 9.
 * Level 9: $40 (White Zone) -> Win: Go to Level 10 (Parlay). Lose: Go to Level 11.
 * Level 10: $80 (White Zone Parlay) -> Win: Done/Reset. Lose: Go to Level 11.
 * Level 11: $80 (Grey Zone) -> Win: Stay/Repeat $80. Lose: Go to Level 12.
 * Level 12: $80 (White Zone) -> Win: Go to Level 13 (Parlay). Lose: Stop/Loss limit reached.
 * Level 13: $160 (White Zone Parlay) -> Win: Done/Reset. Lose: Stop/Loss limit reached.
 * * The Goal:
 * - Achieve flat target profit milestones (e.g., +$10 increments per progression cycle reset).
 * - Target Profit for the session: $50 - $100.
 * - Stop-Loss Condition: Reaching beyond the absolute maximum breakdown level of the sequence ($160 bet failure).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Setup Session Settings & Base Constants
    const baseOutsideUnit = config.betLimits.minOutside;
    const targetProfit = 50000; 
    const startingBankroll = config.startingBankroll || 2000;

    // Check for global target session stop conditions
    if (bankroll >= startingBankroll + targetProfit || bankroll <= baseOutsideUnit) {
        return [];
    }

    // 2. Initialize State Management
    if (!state.starProgressionLevel) {
        state.starProgressionLevel = 1;
    }
    if (!state.lastBetTarget) {
        state.lastBetTarget = null;
    }

    // 3. Evaluate previous result outcome to navigate the Matrix logic
    if (spinHistory.length > 0 && state.lastBetTarget) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinColor = lastSpin.winningColor;
        
        // Check if our tracked bet position won
        const wonPrevious = (lastWinColor === state.lastBetTarget);

        if (wonPrevious) {
            // Level-specific win rules matching the Star 2.2 matrix logic
            if (state.starProgressionLevel === 1) {
                // Winning the first base step immediately resets the sequence
                state.starProgressionLevel = 1;
            } else if (state.starProgressionLevel === 2) {
                // Grey Zone rule: Stay on Level 2 to try capturing the White level trigger
                state.starProgressionLevel = 2;
            } else if (state.starProgressionLevel === 3) {
                // White Zone triggered: Advance to the Parlay stage
                state.starProgressionLevel = 4;
            } else if (state.starProgressionLevel === 4) {
                // Parlay Won: Milestone achieved, full sequence reset
                state.starProgressionLevel = 1;
            } else if (state.starProgressionLevel === 5) {
                // Grey Zone rule: Repeat level
                state.starProgressionLevel = 5;
            } else if (state.starProgressionLevel === 6) {
                // White Zone triggered: Advance to parlay
                state.starProgressionLevel = 7;
            } else if (state.starProgressionLevel === 7) {
                // Parlay Won: Full sequence reset
                state.starProgressionLevel = 1;
            } else if (state.starProgressionLevel === 8) {
                // Grey Zone rule: Repeat level
                state.starProgressionLevel = 8;
            } else if (state.starProgressionLevel === 9) {
                // White Zone triggered: Advance to parlay
                state.starProgressionLevel = 10;
            } else if (state.starProgressionLevel === 10) {
                // Parlay Won: Full sequence reset
                state.starProgressionLevel = 10;
            } else if (state.starProgressionLevel === 11) {
                // Grey Zone rule: Repeat level
                state.starProgressionLevel = 11;
            } else if (state.starProgressionLevel === 12) {
                // White Zone triggered: Advance to final parlay
                state.starProgressionLevel = 13;
            } else if (state.starProgressionLevel === 13) {
                // Final Parlay Won: Full sequence reset
                state.starProgressionLevel = 1;
            }
        } else {
            // Loss Logic: Move deeper into the next progression tier level
            if (state.starProgressionLevel === 1) state.starProgressionLevel = 2;
            else if (state.starProgressionLevel === 2) state.starProgressionLevel = 3;
            else if (state.starProgressionLevel === 3) state.starProgressionLevel = 5; // Skip Parlay if base loss occurs
            else if (state.starProgressionLevel === 4) state.starProgressionLevel = 5;
            else if (state.starProgressionLevel === 5) state.starProgressionLevel = 6;
            else if (state.starProgressionLevel === 6) state.starProgressionLevel = 8; // Skip Parlay if tier loss occurs
            else if (state.starProgressionLevel === 7) state.starProgressionLevel = 8;
            else if (state.starProgressionLevel === 8) state.starProgressionLevel = 9;
            else if (state.starProgressionLevel === 9) state.starProgressionLevel = 11; // Skip Parlay if tier loss occurs
            else if (state.starProgressionLevel === 10) state.starProgressionLevel = 11;
            else if (state.starProgressionLevel === 11) state.starProgressionLevel = 12;
            else if (state.starProgressionLevel === 12) return []; // Stop Loss reached
            else if (state.starProgressionLevel === 13) return []; // Stop Loss reached
        }
    }

    // 4. Map active Star 2.2 Level to defined Multiplier Units
    let unitMultiplier = 1;
    switch (state.starProgressionLevel) {
        case 1:  unitMultiplier = 1; break;   // $10 Base
        case 2:  unitMultiplier = 1; break;   // $10 Grey
        case 3:  unitMultiplier = 1; break;   // $10 White
        case 4:  unitMultiplier = 2; break;   // $20 Parlay
        case 5:  unitMultiplier = 2; break;   // $20 Grey
        case 6:  unitMultiplier = 2; break;   // $20 White
        case 7:  unitMultiplier = 4; break;   // $40 Parlay
        case 8:  unitMultiplier = 4; break;   // $40 Grey
        case 9:  unitMultiplier = 4; break;   // $40 White
        case 10: unitMultiplier = 8; break;   // $80 Parlay
        case 11: unitMultiplier = 8; break;   // $80 Grey
        case 12: unitMultiplier = 8; break;   // $80 White
        case 13: unitMultiplier = 16; break;  // $160 Parlay
        default: unitMultiplier = 1;
    }

    // Calculate final calculated bet value
    let currentBetAmount = baseOutsideUnit * unitMultiplier;

    // Adjust for increment modes if modified dynamically by simulator config inputs
    if (state.starProgressionLevel > 1) {
        let increment = config.incrementMode === 'base' ? baseOutsideUnit : (config.minIncrementalBet || 1);
        // Standard system handles its own structured jumps, logic aligns with base scale factor.
    }

    // 5. Enforce Table Outside Bet Limits Restrictions securely
    currentBetAmount = Math.max(currentBetAmount, config.betLimits.minOutside);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    // 6. Execution Selection Strategy: Follow the Winning Color
    let targetColor = 'red'; // Safe default for trigger state
    if (spinHistory.length > 0) {
        const lastSpinResult = spinHistory[spinHistory.length - 1];
        if (lastSpinResult.winningColor === 'red' || lastSpinResult.winningColor === 'black') {
            targetColor = lastSpinResult.winningColor;
        } else {
            // If green (0 / 00) hit, follow the preceding active tracking color or default safely
            targetColor = state.lastBetTarget || 'red';
        }
    } else {
        // First spin of the platform session: wait for a lookahead outcome trigger 
        state.lastBetTarget = null;
        return [];
    }

    // Save current active placement targeted position for evaluation next spin loop pass
    state.lastBetTarget = targetColor;

    // 7. Return configured bet schema item array array
    return [
        {
            type: targetColor,
            amount: currentBetAmount
        }
    ];
}