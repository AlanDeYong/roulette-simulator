<<<<<<< HEAD
/**
 * Strategy: Three Dog Roulette (Pattern & Recovery)
 * * Source: https://www.youtube.com/watch?v=5T15naHRh3U (Channel: CEG Dealer School)
 * * The Logic:
 * - Focus: High/Low (1-18 vs 19-36).
 * - Trigger: Analyze the last 3 spins. Look for a "2 vs 1" split (e.g., 2 Highs, 1 Low).
 * - Bet: Bet on the MINORITY outcome (the "Dog"). Example: If history is High, High, Low -> Bet Low.
 * - Lock: Once a bet sequence starts (progression), stick to the target until Win or Safety Brake.
 * * The Progression:
 * - On Loss: Martingale (Double the bet).
 * - Safety Brake: If the OPPOSITE outcome hits 3 times in a row while betting (e.g., betting Low, but High hits 3x consecutive), STOP immediately.
 * * The Goal:
 * - Target: Daily profit (break even + profit).
 * - Recovery: If "Safety Brake" triggers, accept the loss. INCREASE the Base Unit (e.g., $5 -> $10) and restart.
 * - Reset: When the total bankroll exceeds the original starting bankroll (Session Profit), reset Base Unit to minimum.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Setup
    const minBet = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;
    
    // Helper to determine High/Low
    // Returns: 'high', 'low', or 'zero'
    const getOutcome = (num) => {
        if (num === 0 || num === '00') return 'zero';
        return num <= 18 ? 'low' : 'high';
    };

    // 2. Initialize State (Runs once)
    if (!state.initialized) {
        state.baseUnit = minBet;            // Starts at table min
        state.currentBet = 0;               // Actual amount to bet next
        state.target = null;                // Current bet target ('high' or 'low')
        state.progressionLevel = 0;         // Tracks Martingale steps
        state.consecutiveLosses = 0;        // Tracks losses for Safety Brake
        state.startBankroll = bankroll;     // Snapshot for session profit check
        state.logs = [];                    // Logging buffer
        state.activeSequence = false;       // Are we in the middle of a martingale?
        state.initialized = true;
    }

    // 3. Process Last Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastResult = getOutcome(lastSpin.winningNumber);

        // Check if we had an active bet
        if (state.activeSequence && state.target) {
            const won = (state.target === lastResult);

            if (won) {
                // --- WIN CASE ---
                state.logs.push(`Win on ${state.target}. Resetting sequence.`);
                state.activeSequence = false;
                state.progressionLevel = 0;
                state.consecutiveLosses = 0;
                state.target = null;

                // CHECK SESSION RECOVERY
                // If we are profitable overall, reset the base unit size
                if (bankroll > state.startBankroll) {
                    if (state.baseUnit > minBet) {
                        state.logs.push(`Session Profit Reached ($${bankroll}). Resetting Base Unit to ${minBet}.`);
                        state.baseUnit = minBet;
                    }
                }
            } else {
                // --- LOSS CASE ---
                state.consecutiveLosses++;
                state.progressionLevel++;

                // SAFETY BRAKE CHECK
                // "Stop doubling immediately if the opposite outcome hits 3 times in a row"
                // If we lost 3 times in a row, it means the opposite hit 3 times in a row.
                if (state.consecutiveLosses >= 3) {
                    state.logs.push(`SAFETY BRAKE: Opposite hit 3x. Accepting loss.`);
                    
                    // Recovery Mechanism: Increase Base Unit
                    // We double the base unit to recover faster in the next sequence
                    const newBase = state.baseUnit * 2;
                    
                    // Clamp base unit increase to a reasonable safety limit (optional, but good practice)
                    // Let's cap it at 1/4 of max bet to prevent explosion
                    if (newBase < (maxBet / 4)) {
                        state.baseUnit = newBase;
                        state.logs.push(`Increasing Base Unit to ${state.baseUnit} for recovery.`);
                    } else {
                        state.logs.push(`Base Unit Maxed at ${state.baseUnit}. Maintaining.`);
                    }

                    // Reset Sequence
                    state.activeSequence = false;
                    state.progressionLevel = 0;
                    state.consecutiveLosses = 0;
                    state.target = null;
                } else {
                    state.logs.push(`Loss on ${state.target}. Martingale Level ${state.progressionLevel}.`);
                }
            }
        }
    }

    // 4. Determine Next Bet
    // Only look for a new target if we are NOT currently locked in a sequence
    if (!state.activeSequence) {
        // We need at least 3 spins to detect the "Three Dog" pattern
        if (spinHistory.length >= 3) {
            const last3 = spinHistory.slice(-3).map(s => getOutcome(s.winningNumber));
            
            // Filter out zeros for pattern recognition? 
            // The strategy usually relies on strict High/Low patterns. 
            // If there's a zero, the pattern is broken. We wait.
            if (!last3.includes('zero')) {
                const highs = last3.filter(r => r === 'high').length;
                const lows = last3.filter(r => r === 'low').length;

                // Logic: "2 vs 1 split... bet on the minority"
                if (highs === 2 && lows === 1) {
                    state.target = 'low';
                    state.activeSequence = true;
                    state.currentBet = state.baseUnit;
                    state.logs.push(`Pattern Found (2H/1L). Starting sequence on LOW.`);
                } else if (lows === 2 && highs === 1) {
                    state.target = 'high';
                    state.activeSequence = true;
                    state.currentBet = state.baseUnit;
                    state.logs.push(`Pattern Found (2L/1H). Starting sequence on HIGH.`);
                }
                // Note: If 3 Highs or 3 Lows, we do nothing (wait for chop/2v1)
            }
        }
    } else {
        // We are in an active sequence (Martingale)
        // Calculate Martingale amount: Base * 2^Level
        state.currentBet = state.baseUnit * Math.pow(2, state.progressionLevel);
    }

    // 5. Periodic Logging (Every 50 spins)
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        if (state.logs.length > 0) {
            utils.saveFile(`three_dog_log_${Date.now()}.txt`, state.logs.join('\n'))
                .catch(err => console.error("Log save failed", err));
            state.logs = [];
        }
    }

    // 6. Return Bet (Respecting Limits)
    if (state.activeSequence && state.target) {
        // Clamp amount
        let amount = state.currentBet;
        amount = Math.max(amount, minBet);
        amount = Math.min(amount, maxBet);

        return [{
            type: state.target, // 'high' or 'low'
            amount: amount
        }];
    }

    // No bet conditions met
    return [];
=======
/**
 * Strategy: Three Dog Roulette (Pattern & Recovery)
 * * Source: https://www.youtube.com/watch?v=5T15naHRh3U (Channel: CEG Dealer School)
 * * The Logic:
 * - Focus: High/Low (1-18 vs 19-36).
 * - Trigger: Analyze the last 3 spins. Look for a "2 vs 1" split (e.g., 2 Highs, 1 Low).
 * - Bet: Bet on the MINORITY outcome (the "Dog"). Example: If history is High, High, Low -> Bet Low.
 * - Lock: Once a bet sequence starts (progression), stick to the target until Win or Safety Brake.
 * * The Progression:
 * - On Loss: Martingale (Double the bet).
 * - Safety Brake: If the OPPOSITE outcome hits 3 times in a row while betting (e.g., betting Low, but High hits 3x consecutive), STOP immediately.
 * * The Goal:
 * - Target: Daily profit (break even + profit).
 * - Recovery: If "Safety Brake" triggers, accept the loss. INCREASE the Base Unit (e.g., $5 -> $10) and restart.
 * - Reset: When the total bankroll exceeds the original starting bankroll (Session Profit), reset Base Unit to minimum.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Setup
    const minBet = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;
    
    // Helper to determine High/Low
    // Returns: 'high', 'low', or 'zero'
    const getOutcome = (num) => {
        if (num === 0 || num === '00') return 'zero';
        return num <= 18 ? 'low' : 'high';
    };

    // 2. Initialize State (Runs once)
    if (!state.initialized) {
        state.baseUnit = minBet;            // Starts at table min
        state.currentBet = 0;               // Actual amount to bet next
        state.target = null;                // Current bet target ('high' or 'low')
        state.progressionLevel = 0;         // Tracks Martingale steps
        state.consecutiveLosses = 0;        // Tracks losses for Safety Brake
        state.startBankroll = bankroll;     // Snapshot for session profit check
        state.logs = [];                    // Logging buffer
        state.activeSequence = false;       // Are we in the middle of a martingale?
        state.initialized = true;
    }

    // 3. Process Last Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastResult = getOutcome(lastSpin.winningNumber);

        // Check if we had an active bet
        if (state.activeSequence && state.target) {
            const won = (state.target === lastResult);

            if (won) {
                // --- WIN CASE ---
                state.logs.push(`Win on ${state.target}. Resetting sequence.`);
                state.activeSequence = false;
                state.progressionLevel = 0;
                state.consecutiveLosses = 0;
                state.target = null;

                // CHECK SESSION RECOVERY
                // If we are profitable overall, reset the base unit size
                if (bankroll > state.startBankroll) {
                    if (state.baseUnit > minBet) {
                        state.logs.push(`Session Profit Reached ($${bankroll}). Resetting Base Unit to ${minBet}.`);
                        state.baseUnit = minBet;
                    }
                }
            } else {
                // --- LOSS CASE ---
                state.consecutiveLosses++;
                state.progressionLevel++;

                // SAFETY BRAKE CHECK
                // "Stop doubling immediately if the opposite outcome hits 3 times in a row"
                // If we lost 3 times in a row, it means the opposite hit 3 times in a row.
                if (state.consecutiveLosses >= 3) {
                    state.logs.push(`SAFETY BRAKE: Opposite hit 3x. Accepting loss.`);
                    
                    // Recovery Mechanism: Increase Base Unit
                    // We double the base unit to recover faster in the next sequence
                    const newBase = state.baseUnit * 2;
                    
                    // Clamp base unit increase to a reasonable safety limit (optional, but good practice)
                    // Let's cap it at 1/4 of max bet to prevent explosion
                    if (newBase < (maxBet / 4)) {
                        state.baseUnit = newBase;
                        state.logs.push(`Increasing Base Unit to ${state.baseUnit} for recovery.`);
                    } else {
                        state.logs.push(`Base Unit Maxed at ${state.baseUnit}. Maintaining.`);
                    }

                    // Reset Sequence
                    state.activeSequence = false;
                    state.progressionLevel = 0;
                    state.consecutiveLosses = 0;
                    state.target = null;
                } else {
                    state.logs.push(`Loss on ${state.target}. Martingale Level ${state.progressionLevel}.`);
                }
            }
        }
    }

    // 4. Determine Next Bet
    // Only look for a new target if we are NOT currently locked in a sequence
    if (!state.activeSequence) {
        // We need at least 3 spins to detect the "Three Dog" pattern
        if (spinHistory.length >= 3) {
            const last3 = spinHistory.slice(-3).map(s => getOutcome(s.winningNumber));
            
            // Filter out zeros for pattern recognition? 
            // The strategy usually relies on strict High/Low patterns. 
            // If there's a zero, the pattern is broken. We wait.
            if (!last3.includes('zero')) {
                const highs = last3.filter(r => r === 'high').length;
                const lows = last3.filter(r => r === 'low').length;

                // Logic: "2 vs 1 split... bet on the minority"
                if (highs === 2 && lows === 1) {
                    state.target = 'low';
                    state.activeSequence = true;
                    state.currentBet = state.baseUnit;
                    state.logs.push(`Pattern Found (2H/1L). Starting sequence on LOW.`);
                } else if (lows === 2 && highs === 1) {
                    state.target = 'high';
                    state.activeSequence = true;
                    state.currentBet = state.baseUnit;
                    state.logs.push(`Pattern Found (2L/1H). Starting sequence on HIGH.`);
                }
                // Note: If 3 Highs or 3 Lows, we do nothing (wait for chop/2v1)
            }
        }
    } else {
        // We are in an active sequence (Martingale)
        // Calculate Martingale amount: Base * 2^Level
        state.currentBet = state.baseUnit * Math.pow(2, state.progressionLevel);
    }

    // 5. Periodic Logging (Every 50 spins)
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        if (state.logs.length > 0) {
            utils.saveFile(`three_dog_log_${Date.now()}.txt`, state.logs.join('\n'))
                .catch(err => console.error("Log save failed", err));
            state.logs = [];
        }
    }

    // 6. Return Bet (Respecting Limits)
    if (state.activeSequence && state.target) {
        // Clamp amount
        let amount = state.currentBet;
        amount = Math.max(amount, minBet);
        amount = Math.min(amount, maxBet);

        return [{
            type: state.target, // 'high' or 'low'
            amount: amount
        }];
    }

    // No bet conditions met
    return [];
>>>>>>> origin/main
}