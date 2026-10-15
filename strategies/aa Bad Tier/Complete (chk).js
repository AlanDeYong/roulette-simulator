/**
 * Complete Roulette Strategy
 * 
 * Source: https://youtu.be/-2SNk23Y2Rk
 * Channel: The Roulette Master
 * 
 * FULL LOGIC DETAILS:
 * - Analyzes recent spin history to identify whether Red or Black appeared more often.
 * - Places 5 bets simultaneously on each spin:
 *     1. Dominant Opposing Color ('red' or 'black')
 *     2. Matching Parity ('odd' if Red dominant, 'even' if Black dominant)
 *     3. Low range ('low' / 1-18)
 *     4. First Dozen ('dozen', value: 1)
 *     5. Second Dozen ('dozen', value: 2)
 * 
 * FULL BET PROGRESSION DETAILS:
 * - Each of the 5 bet positions tracks its unit multiplier independently in state.
 * - Base unit size = config.betLimits.minOutside.
 * - When an individual bet position LOSES:
 *     - Dozen bets: increase by +1 unit (+minIncrementalBet or base unit).
 *     - Outside 1:1 bets: increase by +2 units.
 * - When an individual bet position WINS:
 *     - Its bet unit stays at its current level for the next spin.
 * - When the overall session reaches a NEW BANKROLL HIGH (Peak Profit):
 *     - ALL 5 bet positions reset back to 1 unit, and the dominant color is re-evaluated.
 * 
 * GOAL / STOP LOSS:
 * - Goal: Reach new session profit peaks and maintain steady progression recovery.
 * - Stop Loss: Protected by table bet limits and total bankroll capacity.
 * 
 * @param {Array} spinHistory - Array of past spin objects [{ winningNumber, winningColor }]
 * @param {number} bankroll - Current available bankroll
 * @param {Object} config - System and table limit configurations
 * @param {Object} state - Persistent state store across spins
 * @param {Object} utils - Helper utilities
 * @returns {Array} Array of bet objects
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;
    const incStep = config.minIncrementalBet || 1;

    // Helper to clamp bet amounts to allowed table limits
    function clampBet(amount) {
        return Math.min(Math.max(amount, minOutside), maxBet);
    }

    // 1. Initialize State Persistence
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.units = {
            dozen1: 1,
            dozen2: 1,
            low: 1,
            color: 1,
            parity: 1
        };
        state.colorChoice = 'black'; // Default initial target
        state.parityChoice = 'even';
        state.lastBets = null;
    }

    // 2. Evaluate Previous Spin Results & Progression
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];

        // Check for Session High / Target Profit Peak
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
            // Reset all progressions to 1 unit on new peak profit
            state.units.dozen1 = 1;
            state.units.dozen2 = 1;
            state.units.low = 1;
            state.units.color = 1;
            state.units.parity = 1;
        } else if (state.lastBets) {
            // Process individual win/loss progressions if not in reset state
            const num = lastSpin.winningNumber;
            const color = lastSpin.winningColor;

            // Helper to check if a specific bet type won
            function checkWin(betObj) {
                if (num === 0 || num === '00') return false;
                if (betObj.type === 'dozen') {
                    if (betObj.value === 1) return num >= 1 && num <= 12;
                    if (betObj.value === 2) return num >= 13 && num <= 24;
                    if (betObj.value === 3) return num >= 25 && num <= 36;
                }
                if (betObj.type === 'low') return num >= 1 && num <= 18;
                if (betObj.type === 'high') return num >= 19 && num <= 36;
                if (betObj.type === 'red') return color === 'red';
                if (betObj.type === 'black') return color === 'black';
                if (betObj.type === 'even') return num % 2 === 0;
                if (betObj.type === 'odd') return num % 2 !== 0;
                return false;
            }

            // Update individual unit progressions on loss
            if (!checkWin(state.lastBets.dozen1)) state.units.dozen1 += 1;
            if (!checkWin(state.lastBets.dozen2)) state.units.dozen2 += 1;
            if (!checkWin(state.lastBets.low)) state.units.low += 2;
            if (!checkWin(state.lastBets.color)) state.units.color += 2;
            if (!checkWin(state.lastBets.parity)) state.units.parity += 2;
        }

        // 3. Determine Color & Parity Target based on recent spin history
        let redCount = 0;
        let blackCount = 0;
        const recentSpins = spinHistory.slice(-10);
        recentSpins.forEach(spin => {
            if (spin.winningColor === 'red') redCount++;
            if (spin.winningColor === 'black') blackCount++;
        });

        if (redCount > blackCount) {
            state.colorChoice = 'black';
            state.parityChoice = 'even';
        } else {
            state.colorChoice = 'red';
            state.parityChoice = 'odd';
        }
    }

    // 4. Construct Current Spin Bets
    const dozen1Bet = {
        type: 'dozen',
        value: 1,
        amount: clampBet(minOutside + (state.units.dozen1 - 1) * incStep)
    };

    const dozen2Bet = {
        type: 'dozen',
        value: 2,
        amount: clampBet(minOutside + (state.units.dozen2 - 1) * incStep)
    };

    const lowBet = {
        type: 'low',
        amount: clampBet(minOutside + (state.units.low - 1) * incStep)
    };

    const colorBet = {
        type: state.colorChoice,
        amount: clampBet(minOutside + (state.units.color - 1) * incStep)
    };

    const parityBet = {
        type: state.parityChoice,
        amount: clampBet(minOutside + (state.units.parity - 1) * incStep)
    };

    // Save current active bets to state for evaluation on next turn
    state.lastBets = {
        dozen1: dozen1Bet,
        dozen2: dozen2Bet,
        low: lowBet,
        color: colorBet,
        parity: parityBet
    };

    return [dozen1Bet, dozen2Bet, lowBet, colorBet, parityBet];
}