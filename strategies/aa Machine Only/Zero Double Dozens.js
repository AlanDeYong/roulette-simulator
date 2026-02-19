
/**
 * STRATEGY: Zero Double Dozens
 * * SOURCE:
 * - Video: "10,000 ROULETTE SPINS WITH NO LOSSES!🔥🔥🔥🔥🔥🔥🔥"
 * - Channel: The Roulette Master
 * - URL: https://www.youtube.com/watch?v=6rtvQRt5iaw
 * * THE LOGIC:
 * - This is an "Anti-Follow" strategy betting on two Dozens at a time.
 * - Dozen Selection: Always bet on the two Dozens that did NOT hit on the previous spin.
 * (e.g., If spin was 15 [2nd Dozen], bet on 1st and 3rd Dozens).
 * - Zero Insurance: Always place a small covering bet on Zero (0).
 * - If Zero hits: Treat it as a Jackpot/Insurance win. Repeat the previous Dozen selection.
 * * THE PROGRESSION (Fibonacci-Hybrid):
 * - The bet unit multiplier follows a custom sequence: 1, 3, 5.
 * - If losses continue after step 5, it shifts to a Fibonacci logic: Sum of the previous two multipliers.
 * (Sequence: 1, 3, 5, 8, 13, 21, ...)
 * - Zero Bet Sizing: Approximately 1/5th of the Dozen bet value (or table minimum).
 * * RECOVERY & RESET:
 * - On Loss: Move one step forward in the progression sequence.
 * - On Win: "Peel back" one step (move one step backward in the sequence).
 * - Full Reset: If the current bankroll exceeds the session's highest recorded bankroll (New ATH), 
 * reset the progression entirely to step 1.
 * * THE GOAL:
 * - Generate consistent small profits using high coverage (approx 66% + Zero).
 * - Survive losing streaks by "peeling back" rather than resetting immediately, minimizing the impact of a single loss.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define base unit sizes based on table limits
    const unitDozen = config.betLimits.minOutside; 
    const unitZero = Math.max(config.betLimits.min, Math.floor(unitDozen / 5)); // Approx 1/5th ratio, bounded by min inside bet

    // Initialize State variables if they don't exist
    if (state.progressionIndex === undefined) state.progressionIndex = 0;
    if (!state.sequence) state.sequence = [1, 3, 5]; // Initial custom sequence from video
    if (state.highestBankroll === undefined) state.highestBankroll = bankroll;
    if (state.totalSpins === undefined) state.totalSpins = 0;
    if (!state.lastBetDozens) state.lastBetDozens = [1, 2]; // Default start

    state.totalSpins++;

    // --- 2. ANALYZE PREVIOUS SPIN (If available) ---
    
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Helper: Identify Dozen (1, 2, 3) or 0
        const getDozen = (num) => {
            if (num === 0) return 0;
            if (num <= 12) return 1;
            if (num <= 24) return 2;
            return 3;
        };

        const winningDozen = getDozen(lastNum);
        
        // Determine Win/Loss
        // We won if the number was in our bet dozens OR it was 0
        const isWin = state.lastBetDozens.includes(winningDozen) || lastNum === 0;

        // --- 3. MANAGE PROGRESSION ---
        
        if (isWin) {
            // Check for New All-Time High (ATH) to trigger full reset
            if (bankroll > state.highestBankroll) {
                state.highestBankroll = bankroll;
                state.progressionIndex = 0;
                state.sequence = [1, 3, 5]; // Reset sequence
            } else {
                // Standard Win: Peel back one layer
                state.progressionIndex = Math.max(0, state.progressionIndex - 1);
            }
        } else {
            // Loss: Move forward
            state.progressionIndex++;

            // Extend Sequence if needed (Fibonacci logic: Sum of last two)
            if (state.progressionIndex >= state.sequence.length) {
                const len = state.sequence.length;
                const nextVal = state.sequence[len - 1] + state.sequence[len - 2];
                state.sequence.push(nextVal);
            }
        }
    }

    // --- 4. LOGGING (Periodically) ---
    // Save log every 50 spins to avoid spamming I/O
    if (state.totalSpins % 50 === 0) {
        const logContent = `Spin: ${state.totalSpins} | Bankroll: ${bankroll} | Index: ${state.progressionIndex} | Seq: ${JSON.stringify(state.sequence)}\n`;
        // We catch the promise to prevent unhandled rejection, but we don't await it to block execution
        utils.saveFile("zero-double-dozens-log.txt", logContent).catch(err => console.error("Log save failed", err));
    }

    // --- 5. DETERMINE BET SELECTION ---
    
    let targetDozens = [];
    
    if (spinHistory.length === 0) {
        // First spin: Default to 1 and 2
        targetDozens = [1, 2];
    } else {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        
        if (lastNum === 0) {
            // If Zero hit, repeat the previous selection (Anti-follow logic doesn't apply to 0)
            targetDozens = state.lastBetDozens; 
        } else {
            // Anti-Follow: Bet on the two dozens that DID NOT hit
            if (lastNum <= 12) targetDozens = [2, 3];      // 1st hit -> Bet 2 & 3
            else if (lastNum <= 24) targetDozens = [1, 3]; // 2nd hit -> Bet 1 & 3
            else targetDozens = [1, 2];                    // 3rd hit -> Bet 1 & 2
        }
    }
    
    // Update state for next spin reference
    state.lastBetDozens = targetDozens;

    // --- 6. CALCULATE BET AMOUNTS ---
    
    const multiplier = state.sequence[state.progressionIndex];
    
    // Calculate Raw Amounts
    let dozenAmount = unitDozen * multiplier;
    let zeroAmount = unitZero * multiplier;

    // CLAMP to Config Limits
    dozenAmount = Math.max(config.betLimits.minOutside, Math.min(dozenAmount, config.betLimits.max));
    zeroAmount = Math.max(config.betLimits.min, Math.min(zeroAmount, config.betLimits.max));

    // Stop Check: If next bet exceeds bankroll, return null to stop or bet remainder (Safety)
    const totalReq = (dozenAmount * 2) + zeroAmount;
    if (totalReq > bankroll) {
        return []; // Stop betting if bankrupt
    }

    // --- 7. CONSTRUCT BETS ARRAY ---
    
    const bets = [];

    // Add Dozen Bets
    targetDozens.forEach(d => {
        bets.push({
            type: 'dozen',
            value: d,
            amount: dozenAmount
        });
    });

    // Add Zero Bet
    bets.push({
        type: 'number',
        value: 0,
        amount: zeroAmount
    });

    return bets;

}