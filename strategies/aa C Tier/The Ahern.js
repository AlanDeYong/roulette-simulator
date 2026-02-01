/**
 * STRATEGY: The Ahern System
 * SOURCE: "AMAZING NEW ROULETTE SYSTEM CONSISTENTLY WINS MONEY" by The Roulette Master
 * URL: https://www.youtube.com/watch?v=LTVcZvPSKD0
 * * THE LOGIC:
 * 1. Coverage: Always bet on two out of the three Dozens (approx. 66% coverage).
 * 2. Cycles: The strategy is played in batches of 4 spins.
 * 3. Base Bet: Start with 1 unit on each of the two chosen Dozens.
 * 4. Evaluation (After 4 spins or early exit):
 * - 4 Wins: Profit. Reset to Base Bet. Pick new Dozens.
 * - 3 Wins (1 Loss): Profit. Reset to Base Bet. Pick new Dozens.
 * - 2 Wins (2 Losses): Loss. Triple the bet amount for the next cycle.
 * - 1 Win (3 Losses): Loss. Triple the bet amount for the next cycle.
 * - 0 Wins (4 Losses): Loss. Triple the bet amount for the next cycle.
 * 5. Recovery Rule (The "Safety Valve"):
 * - If you are in a recovery cycle (tripled bets) and you win the FIRST 2 spins of the new batch, 
 * IMMEDIATELY stop the batch and Reset to Base Bet (or step down).
 * - This locks in the recovery profit without risking the next 2 spins.
 * * THE PROGRESSION (Tripling):
 * - Loss Cycle -> Next Bet = Previous Bet * 3.
 * - Win Cycle -> Reset to Base Unit (or config.betLimits.minOutside).
 * * NOTE: This implementation assumes "Reset to Base" after a successful recovery to prioritize bankroll preservation.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the base unit size. We use the table minimum for Outside bets.
    const baseUnit = config.betLimits.minOutside;

    // Initialize state on the very first spin
    if (!state.initialized) {
        state.initialized = true;
        state.currentBetAmount = baseUnit;      // Start at table minimum
        state.cycleSpinCount = 0;               // Tracks position in the 4-spin batch (0-3)
        state.cycleWins = 0;                    // Tracks wins in the current batch
        state.activeDozens = [1, 2];            // Default start: 1st and 2nd Dozen
        state.inRecovery = false;               // Flag: Are we in a tripled betting mode?
        state.totalProfit = 0;                  // Track session profit for logging
        state.startBankroll = bankroll;         // Snapshot starting bankroll
    }

    // --- 2. PROCESS LAST SPIN RESULT (If not the first spin) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Determine if we won the last bet
        // A number pays out on Dozen 1 (1-12), Dozen 2 (13-24), or Dozen 3 (25-36)
        let won = false;
        
        // Helper: Check which dozen the winning number belongs to
        let winningDozen = 0;
        if (lastNum >= 1 && lastNum <= 12) winningDozen = 1;
        else if (lastNum >= 13 && lastNum <= 24) winningDozen = 2;
        else if (lastNum >= 25 && lastNum <= 36) winningDozen = 3;

        // Did our active dozens cover the winning number?
        if (state.activeDozens.includes(winningDozen)) {
            won = true;
            state.cycleWins++;
        }

        state.cycleSpinCount++;

        // --- 3. EVALUATION LOGIC ---

        let resetCycle = false;
        let tripleBet = false;

        // RULE: Early Exit in Recovery
        // If we are recovering (high bets) and win the first 2 spins, RESET immediately.
        if (state.inRecovery && state.cycleSpinCount === 2 && state.cycleWins === 2) {
            resetCycle = true;
            state.inRecovery = false; // Recovery successful
        }
        // RULE: End of 4-Spin Batch
        else if (state.cycleSpinCount >= 4) {
            // Analyze the batch result
            if (state.cycleWins >= 3) {
                // 3 or 4 wins = Profit. Reset.
                resetCycle = true;
                state.inRecovery = false; // We are back in safe territory
            } else {
                // 0, 1, or 2 wins = Net Loss for the batch. Triple the bet.
                tripleBet = true;
                state.inRecovery = true; // Mark as recovery mode
            }
        }
        
        // Apply Logic based on evaluation
        if (resetCycle) {
            state.currentBetAmount = baseUnit;
            state.cycleSpinCount = 0;
            state.cycleWins = 0;
            // Rotate Dozens for randomness (optional, but mimics the video)
            // Example: Move from [1,2] to [2,3] -> [3,1] -> [1,2]
            if (state.activeDozens[0] === 1 && state.activeDozens[1] === 2) state.activeDozens = [2, 3];
            else if (state.activeDozens[0] === 2 && state.activeDozens[1] === 3) state.activeDozens = [1, 3]; // Using 1 & 3
            else state.activeDozens = [1, 2];
        } else if (tripleBet) {
            // Triple the bet
            state.currentBetAmount = state.currentBetAmount * 3;
            state.cycleSpinCount = 0;
            state.cycleWins = 0;
            
            // On a loss, stick to the same dozens or change? Video suggests finding "new bet".
            // We will rotate to try and catch a streak.
            if (state.activeDozens[0] === 1) state.activeDozens = [2, 3];
            else if (state.activeDozens[0] === 2) state.activeDozens = [1, 3];
            else state.activeDozens = [1, 2];
        }
    }

    // --- 4. SAFETY & LOGGING ---

    // Clamp bet amount to Table Limits
    // Ensure we don't bet less than minOutside or more than max
    state.currentBetAmount = Math.max(state.currentBetAmount, config.betLimits.minOutside);
    state.currentBetAmount = Math.min(state.currentBetAmount, config.betLimits.max);

    // Logging (Every 50 spins)
    if (spinHistory.length % 50 === 0 && spinHistory.length > 0) {
        const logEntry = `Spin: ${spinHistory.length} | Bankroll: ${bankroll} | Bet: ${state.currentBetAmount} | InRecovery: ${state.inRecovery}\n`;
        // Append to a rolling log string in state, then save
        state.logs = (state.logs || "") + logEntry;
        
        // Use utils.saveFile (returns a Promise, but we don't await it here to avoid blocking)
        utils.saveFile("ahern-strategy-log.txt", state.logs).catch(err => console.error("Log save failed", err));
    }

    // Stop Loss / Profit Stop checks can be added here.
    // E.g., if bankroll < unit * 10, stop betting.
    if (bankroll < state.currentBetAmount * 2) {
        return []; // Not enough funds to cover the double dozen bet
    }

    // --- 5. CONSTRUCT BET OBJECTS ---
    
    // We bet on the two active dozens
    const bets = state.activeDozens.map(dozenVal => {
        return {
            type: 'dozen',
            value: dozenVal,
            amount: state.currentBetAmount
        };
    });

    return bets;
}