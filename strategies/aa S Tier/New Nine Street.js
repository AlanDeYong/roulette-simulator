
/**
 * Strategy: The "New" Nine Street System (Roulette Master TV)
 * * Source: https://www.youtube.com/watch?v=DVOhb_zrnXo
 * Channel: THEROULETTEMASTERTV
 * * THE LOGIC:
 * 1. Coverage: This strategy bets on 9 specific Streets (covering 27 numbers) plus the Zero (0).
 * - Total Coverage: ~28 numbers (approx 74-76% of the wheel).
 * 2. Setup: 
 * - Place 1 unit on 9 different streets (defaulting to 1-27 for simplicity in code).
 * - Place 1 unit on Zero (0).
 * * THE PROGRESSION:
 * This system uses a hybrid progression: Positive for base play, Negative (Martingale-style) for recovery.
 * * Phase 1: Base Game (Positive Progression)
 * - Start with 1 unit per bet.
 * - If WIN: Increase bet by 1 unit per position (1 -> 2 -> 3 -> 4 -> 5).
 * - Goal: Reach 5 wins in a row.
 * - Reset: After the 5th consecutive win, reset to 1 unit and bank the profit.
 * - Trigger: If LOSS at any point in Base Game, switch to Recovery Mode immediately.
 * * Phase 2: Recovery Mode (Negative Progression)
 * - Triggered by a loss in Base Game.
 * - Action: Double the previous total bet unit.
 * - Goal: Achieve 3 WINS at this recovery level to clear the loss.
 * - If WIN: Increment recovery win counter. If counter == 3, Reset to Base Game (Level 1).
 * - If LOSS: Double the bet units AGAIN. Reset recovery win counter to 0 (still need 3 wins at new high level).
 * * NOTE on Caveats:
 * - This strategy is high coverage/high frequency win, but a string of losses causes bets to escalate rapidly (1 -> 2 -> 4 -> 8 -> 16...).
 * - The 'Zero' bet acts as a "Jackpot" due to higher payout (35:1) vs Streets (11:1), but is treated as a standard win for progression logic.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Initialization
    const minBet = config.betLimits.min || 1;
    const maxBet = config.betLimits.max || 500;
    
    // Define the 9 streets we will cover (covering numbers 1 through 27)
    // Street value is the starting number of the row (1, 4, 7...)
    const targetStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25];
    const zeroBet = 0; // The extra coverage number

    // Initialize Persistent State
    if (!state.initialized) {
        state.phase = 'BASE';       // 'BASE' or 'RECOVERY'
        state.baseLevel = 1;        // Level 1-5 for Base Game
        state.currentUnit = 1;      // Current multiplier for minBet
        state.recoveryWins = 0;     // Counter for wins needed in recovery
        state.initialized = true;
    }

    // 2. Process Previous Spin (if exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        // Determine if we won the last spin
        let isWin = false;
        
        // Check Zero
        if (winningNum === zeroBet) isWin = true;
        
        // Check Streets
        if (!isWin) {
            for (let s of targetStreets) {
                // A street covers start num, start+1, start+2
                if (winningNum >= s && winningNum <= s + 2) {
                    isWin = true;
                    break;
                }
            }
        }

        // 3. Apply Progression Logic
        if (state.phase === 'BASE') {
            if (isWin) {
                // Positive Progression: Increase unit by 1
                state.baseLevel++;
                if (state.baseLevel > 5) {
                    // Goal Reached: Reset to start
                    state.baseLevel = 1;
                }
                state.currentUnit = state.baseLevel;
            } else {
                // Loss in Base: Trigger Recovery
                state.phase = 'RECOVERY';
                state.currentUnit = state.baseLevel * 2; // Initial double
                state.recoveryWins = 0; // Reset win counter
            }
        } else if (state.phase === 'RECOVERY') {
            if (isWin) {
                state.recoveryWins++;
                // Check if we hit the recovery target (3 wins)
                if (state.recoveryWins >= 3) {
                    // Recovery Complete: Reset to Base
                    state.phase = 'BASE';
                    state.baseLevel = 1;
                    state.currentUnit = 1;
                    state.recoveryWins = 0;
                }
                // If < 3 wins, stay at current unit size
            } else {
                // Loss in Recovery: Double Down
                state.currentUnit = state.currentUnit * 2;
                state.recoveryWins = 0; // Reset counter (need 3 fresh wins at new level)
            }
        }
    }

    // 4. Calculate Bet Amounts
    // Ensure we don't exceed table limits or bankroll
    // We strictly use the calculated unit size relative to the minimum table bet
    let betAmount = minBet * state.currentUnit;

    // Safety Clamp: Ensure bet is within config limits
    betAmount = Math.max(betAmount, minBet);
    betAmount = Math.min(betAmount, maxBet);

    // Stop Loss / Bankroll Check
    // Total cost = 10 bets (9 streets + 1 zero)
    const totalCost = betAmount * 10;
    
    if (totalCost > bankroll) {
        // Not enough money to place the full spread
        console.log("Not enough bankroll to continue strategy. Stopping.");
        return [];
    }

    // 5. Construct Bet Objects
    const bets = [];

    // Add Street Bets
    targetStreets.forEach(streetStart => {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: betAmount
        });
    });

    // Add Zero Bet (Treating '0' as a straight up number bet)
    bets.push({
        type: 'number',
        value: 0,
        amount: betAmount
    });

    return bets;

}