
/**
 * STRATEGY: "The Best Roulette Strategy Ever" (Casino Matchmaker)
 * * SOURCE: 
 * Video: https://www.youtube.com/watch?v=miCmHMAhVBo
 * Channel: Casino Matchmaker
 * * THE LOGIC:
 * 1. BASE MODE (The Grind):
 * - Bet on '1-18' (Low) and '3rd Dozen' (25-36).
 * - Ratio: 3 units on Low, 2 units on Dozen.
 * - Coverage: 30 numbers (81%). Losing numbers: 0, 19, 20, 21, 22, 23, 24.
 * - Goal: Grind small profits with high probability.
 * * 2. RECOVERY MODE (The Pivot):
 * - Triggered immediately upon a Loss in Base Mode.
 * - Action: 
 * 1. Increase betting stakes (Add 1 base unit set to previous).
 * 2. MOVE the Dozen bet from 3rd Dozen to 1st Dozen (1-12).
 * - New Coverage: 1-18 (Low) and 1-12 (1st Dozen).
 * - Logic: This creates an "Overlap Zone" (1-12). If hit, both bets win (Jackpot recovery).
 * * THE PROGRESSION:
 * - Arithmetic progression (Level 1, Level 2, Level 3...).
 * - On Loss: Increase Level +1.
 * - On Win (in Recovery): 
 * - If Session Bankroll >= Starting Bankroll (Profit realized), RESET to Base Mode Level 1.
 * - If Partial Win (13-18) but still negative: Maintain current level (Repeat bet).
 * * BET SIZING:
 * - Unit calculation based on config.betLimits.minOutside.
 * - Low Bet = Level * 3 * Unit.
 * - Dozen Bet = Level * 2 * Unit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & UNIT SETUP ---
    // The video uses $15 (Low) and $10 (Dozen). Ratio is 3:2.
    // We derive the base unit from the table minimum.
    const baseUnit = config.betLimits.minOutside || 5;
    
    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.mode = 'BASE'; // 'BASE' or 'RECOVERY'
        state.level = 1;     // Progression level (Multiplier for units)
        state.startBankroll = bankroll; // Track session start to know when we are profitable
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS RESULT ---
    // We need to determine if we won or lost the previous spin to adjust the strategy.
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Define winning conditions based on what mode we WERE in
        let wonSpin = false;
        let isZero = (lastNum === 0 || lastNum === '00'); // Handle US roulette if needed

        if (state.mode === 'BASE') {
            // Base Mode: Winners are 1-18 OR 25-36
            if (!isZero && ((lastNum >= 1 && lastNum <= 18) || (lastNum >= 25 && lastNum <= 36))) {
                wonSpin = true;
            }
        } else {
            // Recovery Mode: Winners are 1-18 (which covers the 1-12 overlap too)
            // Note: In recovery, 19-36 are losers because we moved the dozen to 1-12.
            if (!isZero && (lastNum >= 1 && lastNum <= 18)) {
                wonSpin = true;
            }
        }

        // --- 4. STRATEGY LOGIC UPDATES ---
        
        if (state.mode === 'BASE') {
            if (wonSpin) {
                // Keep grinding Base mode, reset level just in case
                state.level = 1;
            } else {
                // LOST in Base Mode -> Trigger RECOVERY
                state.mode = 'RECOVERY';
                state.level = 2; // Jump to Level 2 immediately per video logic (Add 15/10 to original)
            }
        } 
        else if (state.mode === 'RECOVERY') {
            if (wonSpin) {
                // Check if we have recovered our losses
                if (bankroll >= state.startBankroll) {
                    // Full recovery -> Reset to Base
                    state.mode = 'BASE';
                    state.level = 1;
                } else {
                    // Partial win (e.g. hit 13-18) but still in hole?
                    // Video implies aggression, but mathematically safer to hold level or repeat.
                    // We will maintain current level until positive.
                }
            } else {
                // Lost in Recovery -> Escalate
                state.level++;
            }
        }
    }

    // --- 5. CALCULATE BET AMOUNTS ---
    // Formula: Level * BaseUnit * Ratio
    // Ratio is 3 for Low, 2 for Dozen
    let rawLowBet = state.level * 3 * baseUnit;
    let rawDozenBet = state.level * 2 * baseUnit;

    // --- 6. CLAMP TO LIMITS (CRITICAL) ---
    // Ensure we don't bet below min (unlikely given formula) or above max
    const lowBetAmount = Math.min(Math.max(rawLowBet, config.betLimits.minOutside), config.betLimits.max);
    const dozenBetAmount = Math.min(Math.max(rawDozenBet, config.betLimits.minOutside), config.betLimits.max);

    // --- 7. CONSTRUCT BETS ---
    const bets = [];

    // Common Bet: Always High/Low (1-18)
    bets.push({
        type: 'low', // Covers 1-18
        amount: lowBetAmount
    });

    // Dynamic Bet: Dozen location depends on Mode
    if (state.mode === 'BASE') {
        // Base Mode: Bet 3rd Dozen (25-36)
        bets.push({
            type: 'dozen',
            value: 3, 
            amount: dozenBetAmount
        });
    } else {
        // Recovery Mode: Bet 1st Dozen (1-12) to create overlap with Low
        bets.push({
            type: 'dozen',
            value: 1, 
            amount: dozenBetAmount
        });
    }

    return bets;

}