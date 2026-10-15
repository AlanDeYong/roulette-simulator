/**
 * Roulette Strategy: The Dynamic Trio
 * 
 * Source:
 * - YouTube Video: TAKE ADVANTAGE OF THE COLUMN LAYOUT! (http://www.youtube.com/watch?v=BdQnbT9pHLs)
 * - Channel: The Roulette Master
 * 
 * Strategy Overview:
 * "The Dynamic Trio" exploits the layout distribution of colors across columns by pairing
 * an even-money color bet with two columns that heavily concentrate that color:
 *   - Black Mode: Bets on Black + 1st Column + 2nd Column (2nd column has 8 black numbers).
 *   - Red Mode: Bets on Red + 1st Column + 3rd Column (3rd column has 8 red numbers).
 * 
 * Bet Placement:
 * - 3 equal bets per spin:
 *   1. Outside Color bet (Red or Black).
 *   2. First Column bet.
 *   3. Second Column bet (if Black mode) OR Third Column bet (if Red mode).
 * 
 * Progression Logic:
 * - Base Bet: 1 unit on each of the 3 bets (3 units total).
 * - On Net Loss: Increase bet sizing by +1 base unit on all 3 bets.
 * - On Push / Break-Even (Net Change === 0): Keep current bet sizing unchanged.
 * - On Net Win:
 *     - If session profit exceeds the session target/high-water mark:
 *       Reset bet sizing to 1 base unit and switch color modes (Black -> Red or Red -> Black).
 *     - If still in deficit relative to the session target:
 *       Maintain current bet sizing to continue the recovery.
 * 
 * Goal:
 * - Safely recover drawdowns through jackpot hits (hitting both color and covered column),
 *   locking in profit targets at each reset cycle.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize persistent state
    if (!state.initialized) {
        state.initialized = true;
        state.mode = 'black'; // 'black' or 'red'
        state.multiplier = 1;
        state.lastBankroll = bankroll;
        state.sessionTarget = bankroll;
        state.lastBets = null;
    }

    const minOutside = config.betLimits.minOutside || 10;
    const maxLimit = config.betLimits.max || 1000;

    // 2. Process outcome of previous spin if bets were placed
    if (state.lastBets && spinHistory.length > 0) {
        const delta = bankroll - state.lastBankroll;

        if (delta > 0) {
            // Net Win
            if (bankroll > state.sessionTarget) {
                // Reached new profit milestone: reset and switch side
                state.sessionTarget = bankroll;
                state.multiplier = 1;
                state.mode = state.mode === 'black' ? 'red' : 'black';
            }
            // If still below target, maintain multiplier for recovery
        } else if (delta < 0) {
            // Net Loss: Step up progression ladder by +1 unit
            state.multiplier += 1;
        }
        // If delta === 0 (Push/Break-Even): Keep multiplier unchanged
    }

    state.lastBankroll = bankroll;

    // 3. Calculate clamped bet amount per position
    let unitBet = minOutside * state.multiplier;
    unitBet = Math.max(unitBet, minOutside);
    unitBet = Math.min(unitBet, maxLimit);

    // 4. Check bankroll availability for 3 equal bets
    const totalRequired = unitBet * 3;
    if (bankroll < totalRequired) {
        // Fall back to table minimum if affordable, otherwise stop
        if (bankroll >= minOutside * 3) {
            unitBet = minOutside;
        } else {
            return [];
        }
    }

    // 5. Construct bet placements based on active color focus
    const bets = [];

    if (state.mode === 'black') {
        // Black Mode: Black + 1st Column + 2nd Column
        bets.push({ type: 'black', amount: unitBet });
        bets.push({ type: 'column', value: 1, amount: unitBet });
        bets.push({ type: 'column', value: 2, amount: unitBet });
    } else {
        // Red Mode: Red + 1st Column + 3rd Column
        bets.push({ type: 'red', amount: unitBet });
        bets.push({ type: 'column', value: 1, amount: unitBet });
        bets.push({ type: 'column', value: 3, amount: unitBet });
    }

    state.lastBets = bets;
    return bets;
}