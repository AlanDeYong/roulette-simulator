/**
 * STRATEGY: Blowing Out the Candles (on the Upside Down Cake)
 * SOURCE: The Roulette Master (YouTube) - Strategy by Bill Busby
 * URL: https://www.youtube.com/watch?v=Pip7D7_BPJU
 *
 * THE LOGIC:
 * 1. The "Cake" (Bet Layout): We cover a significant portion of the board to ensure frequent wins. 
 * This implementation uses 5 Double Streets (Lines), covering 30 numbers. 
 * (Lines starting at 1, 7, 13, 19, 25).
 * This leaves 6 numbers (31-36) and Zero open.
 *
 * 2. The "Candles" (Progression):
 * - Base Unit: Starts at 1.
 * - Loss: If we lose, we add +1 to the Base Unit (adding a "candle").
 * - Win: We check if the current bankroll has exceeded the session High Watermark.
 * - If YES (Profit Target Reached): "Blow out the candles" -> Reset Unit to 1.
 * - If NO (Still recovering): We keep the unit the same (or reduce by 1 if you prefer a slower grind, 
 * but this version holds steady to recover faster as per the aggressive "candle" style).
 * * 3. THE GOAL:
 * - To reach a new session high (High Watermark) and reset.
 * - Once the "candles" (accumulated losses) are cleared, we return to minimum bets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---
    const BASE_CHIP = config.betLimits.min; // usually $1 or $2
    
    // The "Cake": 5 Double Streets (Lines) covering 1-30.
    // We bet on lines starting at: 1, 7, 13, 19, 25.
    const LINE_STARTS = [1, 7, 13, 19, 25]; 

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.unit = 1;                    // Current bet multiplier
        state.highWaterMark = bankroll;    // Highest bankroll achieved this session
        state.initialized = true;
        // Optional: Set a hard stop loss if desired
        state.stopLoss = bankroll * 0.5;   
    }

    // --- 3. PROCESS PREVIOUS SPIN ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Update High Watermark if we reached a new peak
        if (bankroll > state.highWaterMark) {
            state.highWaterMark = bankroll;
        }

        // Determine if we won the last round
        // We look at the change in bankroll since the last bet was placed.
        // However, since we don't have 'previousBankroll' easily available without storing it,
        // we can check if the winning number was in our "Cake".
        const winNum = lastSpin.winningNumber;
        const isWin = winNum >= 1 && winNum <= 30; // Our lines cover 1-30

        if (isWin) {
            // WIN SCENARIO
            // Logic: Have we blown out the candles? (Recovered all losses?)
            if (bankroll >= state.highWaterMark) {
                // Yes: Reset to base
                state.unit = 1;
            } else {
                // No: We are still recovering. 
                // Variation: Some play "reduce by 1", others "stay flat". 
                // We stay flat to ensure the next win recovers more chunks.
                // To be safe, we ensure we never go below 1.
                state.unit = Math.max(1, state.unit);
            }
        } else {
            // LOSS SCENARIO
            // Logic: Add a candle (Increase bet size)
            state.unit++;
        }
    }

    // --- 4. SAFETY CHECKS ---
    // Stop betting if bankroll is too low to sustain the strategy
    if (bankroll < state.stopLoss) {
        // console.log("Stop Loss hit. Stopping.");
        return [];
    }

    // --- 5. CALCULATE BET AMOUNT ---
    let betAmount = BASE_CHIP * state.unit;

    // Clamp to limits
    // Note: Double Streets are usually considered Inside bets, but sometimes have higher limits.
    // We use 'min' generally.
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // If we can't afford the full spread, stop or adjust. 
    // This strategy requires 5 bets.
    if (betAmount * 5 > bankroll) {
        // Not enough money to place the full pattern
        return [];
    }

    // --- 6. CONSTRUCT BETS ---
    const bets = LINE_STARTS.map(startNum => {
        return {
            type: 'line', // Double Street
            value: startNum,
            amount: betAmount
        };
    });

    return bets;
}