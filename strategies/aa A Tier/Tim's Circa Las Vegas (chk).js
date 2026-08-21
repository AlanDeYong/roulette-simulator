/**
 * ============================================================================
 * ROULETTE STRATEGY: Tim's Circa Las Vegas Outside Progression System
 * ============================================================================
 * Source: https://youtu.be/FXk4qRzDtag
 * Channel: The Roulette Master
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. Bet Placement:
 *    - Places bets exclusively on Outside Even-Money positions (e.g., 'red', 'black',
 *      'high', 'low', 'even', or 'odd').
 * 
 * 2. Progression Phases:
 *    - Initial Phase (Martingale):
 *      - Starts with a base unit bet (minOutside).
 *      - Follows a 3-step Martingale progression on consecutive losses: 1x -> 2x -> 4x base unit.
 *      - If a win occurs during this 3-step phase, reset immediately back to 1x base unit.
 *    
 *    - Recovery Phase (Up/Down by $50 / 5 units):
 *      - Triggered after losing the 4x Martingale bet.
 *      - Increases bet size by 5 units ($50 equivalent) after each loss.
 *      - Decreases bet size by 5 units ($50 equivalent) after each win.
 * 
 * 3. The Goal / Reset Condition:
 *    - Once net profit becomes positive (bankroll recovers above initial/target level),
 *      reset the system back to Phase 1 (1x base unit bet).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Initialize state on first run
    if (!state.initialized) {
        state.startingBankroll = bankroll;
        state.phase = 'initial'; // 'initial' or 'recovery'
        state.martingaleStep = 0; // 0: 1x, 1: 2x, 2: 4x
        state.recoveryBet = 0;
        state.targetBetType = 'red'; // Default outside bet type
        state.initialized = true;
    }

    // Evaluate last spin result if history exists
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWon = (lastSpin.winningColor === state.targetBetType); // e.g. for color bets

        // Check if overall bankroll recovered to reset
        if (bankroll >= state.startingBankroll) {
            state.phase = 'initial';
            state.martingaleStep = 0;
            state.recoveryBet = 0;
        } else if (state.phase === 'initial') {
            if (lastWon) {
                state.martingaleStep = 0;
            } else {
                state.martingaleStep += 1;
                if (state.martingaleStep > 2) {
                    // Lost the 4x bet -> Enter Recovery Phase starting at $90 (40 + 50)
                    state.phase = 'recovery';
                    state.recoveryBet = (minOutside * 4) + 50; 
                }
            }
        } else if (state.phase === 'recovery') {
            if (lastWon) {
                state.recoveryBet = Math.max(minOutside, state.recoveryBet - 50);
            } else {
                state.recoveryBet += 50;
            }
        }
    }

    // Calculate current bet amount
    let betAmount = 0;
    if (state.phase === 'initial') {
        const multiplier = Math.pow(2, state.martingaleStep);
        betAmount = minOutside * multiplier;
    } else {
        betAmount = state.recoveryBet;
    }

    // Clamp bet amount to configured table limits
    betAmount = Math.max(betAmount, minOutside);
    betAmount = Math.min(betAmount, maxBet);

    return [
        {
            type: state.targetBetType,
            amount: betAmount
        }
    ];
}