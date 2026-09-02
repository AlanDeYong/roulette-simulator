/**
 * ============================================================================
 * ROULETTE STRATEGY: The Accordion (with Session Peak Profit Reset)
 * ============================================================================
 * @source  YouTube: "The Roulette Master" (https://youtu.be/mS3PIxsx3bw)
 * @author  System submitted by subscriber Jeff, coded for Simulator
 * 
 * ----------------------------------------------------------------------------
 * 1. THE FULL LOGIC IN DETAIL:
 * ----------------------------------------------------------------------------
 * - Board Coverage:
 *   - Uses Double Street (Six Line) bets (e.g., 1-6, 7-12, 13-18, 19-24, 25-30, 31-36).
 *   - Starts with 3 active double streets (covering 18 numbers) plus 1 hedge bet on 0.
 * - Dynamic Rotation (Base Level):
 *   - After a win at base level, remove the double street that just hit and replace 
 *     it with one of the idle double streets, keeping 3 lines active.
 * 
 * ----------------------------------------------------------------------------
 * 2. THE BET PROGRESSION (THE ACCORDION EXPANSION & CONTRACTION):
 * ----------------------------------------------------------------------------
 * - Peak Profit Reset (High-Water Mark):
 *   - Tracks the highest bankroll achieved during the session (`state.maxBankroll`).
 *   - Whenever bankroll reaches or exceeds a new session peak, immediately reset 
 *     all progression multipliers and contract back to 3 base double streets.
 * 
 * - On Loss (Miss):
 *   - If currently playing 3 double streets: Expand to 4 double streets and DOUBLE
 *     the bet amount on all active lines and the zero hedge.
 *   - If already playing 4 double streets: Double the bet amount on all 4 lines and zero.
 * 
 * - On Win During Progression (4 Double Streets):
 *   - If bankroll hits a new session peak: Full reset to base level.
 *   - Otherwise, Contract: Remove the line that just hit (dropping back to 3 lines) 
 *     and hold the current elevated bet amounts.
 * 
 * - On Spin After Contraction (3 Elevated Lines):
 *   - If WIN: Progression recovered -> Reset back to base level (3 lines @ base unit + 1 base hedge).
 *   - If LOSS: Re-expand back to 4 lines and DOUBLE all bet amounts again.
 * 
 * - Hedge Bet (0):
 *   - Starts at base unit and scales proportionally with the multiplier on each progression step.
 * 
 * ----------------------------------------------------------------------------
 * 3. THE GOAL:
 * ----------------------------------------------------------------------------
 * - Target Profit: +50 units (e.g., $250 on $5 base unit).
 * - Stop Loss: 50% of starting bankroll or when max bet limit is reached.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // All available 6-line start values on a roulette layout
    const ALL_DOUBLE_STREETS = [1, 7, 13, 19, 25, 31];

    // 1. Determine Unit Sizing based on table limits
    const baseLineUnit = Math.max(config.betLimits.min, 1);
    const hedgeUnit = Math.max(config.betLimits.min, 1);

    // 2. Initialize State Variables
    if (!state.initialized) {
        state.initialized = true;
        state.activeLines = [1, 7, 13]; // Start with 3 lines
        state.multiplier = 1;          // Base progression multiplier
        state.inRecovery = false;      // True when recovering with 3 elevated lines
        state.maxBankroll = config.startingBankroll || bankroll; // Track peak session bankroll
        state.targetProfit = (config.startingBankroll || bankroll) + (baseLineUnit * 50000);
        state.stopLoss = (config.startingBankroll || bankroll) * 0.5;
    }

    // Stop conditions: Target profit reached or stop-loss hit
    if (bankroll >= state.targetProfit || bankroll <= state.stopLoss) {
        return [];
    }

    // 3. Process Previous Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Determine if winning number was inside one of our active lines
        const hitLine = state.activeLines.find(start => winningNum >= start && winningNum <= start + 5);
        const hitHedge = (winningNum === 0 || winningNum === '0' || winningNum === '00');

        // Check if bankroll has reached or exceeded session's peak profit
        const reachedPeak = bankroll >= state.maxBankroll;

        if (hitHedge) {
            // Hedge hit (Zero): keep current state & rebet
            if (reachedPeak) {
                state.multiplier = 1;
                state.inRecovery = false;
                if (state.activeLines.length > 3) {
                    state.activeLines = [ALL_DOUBLE_STREETS[0], ALL_DOUBLE_STREETS[1], ALL_DOUBLE_STREETS[2]];
                }
            }
        } else if (hitLine !== undefined) {
            // WIN on a double street
            if (reachedPeak || state.inRecovery) {
                // Peak profit reached OR confirmation recovery win -> Full Reset to Base
                state.inRecovery = false;
                state.multiplier = 1;
                const available = ALL_DOUBLE_STREETS.filter(s => s !== hitLine);
                state.activeLines = [available[0], available[1], available[2]];
            } else if (state.activeLines.length === 4) {
                // Won with 4 lines without reaching peak -> Contract down to 3 lines
                state.activeLines = state.activeLines.filter(s => s !== hitLine);
                state.inRecovery = true; // Next spin tests confirmation win
            } else {
                // Won at base level (3 lines) -> Rotate winning line out
                const unused = ALL_DOUBLE_STREETS.filter(s => !state.activeLines.includes(s));
                state.activeLines = state.activeLines.filter(s => s !== hitLine);
                if (unused.length > 0) {
                    state.activeLines.push(unused[0]);
                }
            }
        } else {
            // LOSS (Missed all lines and zero)
            if (state.inRecovery) {
                // Lost during 3-line recovery attempt -> Re-expand to 4 lines and double
                state.inRecovery = false;
                const unused = ALL_DOUBLE_STREETS.filter(s => !state.activeLines.includes(s));
                if (unused.length > 0) {
                    state.activeLines.push(unused[0]);
                }
                state.multiplier *= 2;
            } else if (state.activeLines.length < 4) {
                // Expand from 3 lines to 4 lines and double
                const unused = ALL_DOUBLE_STREETS.filter(s => !state.activeLines.includes(s));
                if (unused.length > 0) {
                    state.activeLines.push(unused[0]);
                }
                state.multiplier *= 2;
            } else {
                // Already at 4 lines -> Double bet
                state.multiplier *= 2;
            }
        }

        // Update peak bankroll record
        if (bankroll > state.maxBankroll) {
            state.maxBankroll = bankroll;
        }
    }

    // 4. Calculate and Clamp Bet Amounts (Line Bets and Zero Hedge scale together)
    let lineBetAmount = baseLineUnit * state.multiplier;
    lineBetAmount = Math.max(lineBetAmount, config.betLimits.min);
    lineBetAmount = Math.min(lineBetAmount, config.betLimits.max);

    let hedgeBetAmount = hedgeUnit * state.multiplier;
    hedgeBetAmount = Math.max(hedgeBetAmount, config.betLimits.min);
    hedgeBetAmount = Math.min(hedgeBetAmount, config.betLimits.max);

    // 5. Construct Bets Array
    const bets = [];

    // Add Double Street (Six Line) bets
    for (const startNum of state.activeLines) {
        bets.push({
            type: 'line',
            value: startNum,
            amount: lineBetAmount
        });
    }

    // Add Hedge bet on Zero (scaled with multiplier)
    bets.push({
        type: 'number',
        value: 0,
        amount: hedgeBetAmount
    });

    return bets;
}