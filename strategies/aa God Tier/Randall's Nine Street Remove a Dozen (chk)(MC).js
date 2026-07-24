/**
 * Strategy: Randall's Nine Street Remove a Dozen
 * Source: https://youtu.be/kIyZqnEkC_E (Roulette Strategy)
 *
 * The Full Logic in details:
 * - START PHASE: Place bets on 9 specific streets: 4, 7, 10 (Dozen 1); 16, 19, 22 (Dozen 2); 28, 31, 34 (Dozen 3).
 * - On a win during START: Identify which dozen won. Remove all bets from that dozen. 
 *   For the remaining two dozens (Dozens B and C), bet ALL of their streets (8 streets total).
 * - On a win during the 8-street phase: Go back to the starting 9 streets. 
 * - On a loss during the 8-street phase: Stop betting (VIRTUAL mode). Wait until a number in Dozen B or C hits. 
 *   Once it does, resume betting the 8 streets.
 * 
 * The Full Bet Progression in details:
 * - Start with the base unit (minimum bet limit).
 * - On ANY loss (either on the 9 streets or when a bet is placed on the 8 streets), increase the bet amount 
 *   for all active streets by 1 base unit (or configured increment).
 * - When returning to the starting 9 streets after an 8-street win, check the bankroll.
 * - If the current bankroll has reached or exceeded the session's peak bankroll, reset the bet amount back to the base unit.
 *   Otherwise, retain the elevated bet amount.
 * 
 * The Goal:
 * - Capitalize on streaks within pairs of dozens while recovering losses systematically, taking advantage of virtual 
 *   waiting to avoid extended bad variance. Goal is continuous new session highs.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and increment size
    const baseUnit = config.betLimits.min;
    let increment = baseUnit;
    if (config.incrementMode === 'fixed') {
        increment = config.minIncrementalBet || 1;
    } else if (config.incrementMode === 'base') {
        increment = baseUnit;
    }

    // 2. Initialize State
    if (!state.initialized) {
        state.mode = 'START'; // 'START' | 'TWO_DOZENS' | 'VIRTUAL'
        state.betAmount = baseUnit;
        state.peakBankroll = bankroll;
        state.targetDozens = []; // Tracks the 2 active dozens during TWO_DOZENS and VIRTUAL
        state.initialized = true;
    }

    // 3. Evaluate previous spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozen = lastNum === 0 ? 0 : Math.ceil(lastNum / 12);

        if (state.mode === 'START') {
            const startStreets = [4, 7, 10, 16, 19, 22, 28, 31, 34];
            let won = false;
            
            if (lastNum !== 0) {
                // Check if the winning number falls within any of our 9 starting streets
                for (let s of startStreets) {
                    if (lastNum >= s && lastNum <= s + 2) {
                        won = true;
                        break;
                    }
                }
            }

            if (won) {
                // Set target dozens to the two dozens that DID NOT win
                state.targetDozens = [1, 2, 3].filter(d => d !== lastDozen);
                state.mode = 'TWO_DOZENS';
            } else {
                // Loss on starting streets: increase bets
                state.betAmount += increment;
            }
        } 
        else if (state.mode === 'TWO_DOZENS') {
            // A win occurs if the last dozen matches one of our two target dozens
            const won = (lastDozen === state.targetDozens[0] || lastDozen === state.targetDozens[1]);

            if (won) {
                state.mode = 'START';
                // Reset bet amount ONLY if we are at or above session's peak profit
                if (bankroll >= state.peakBankroll) {
                    state.betAmount = baseUnit;
                }
            } else {
                // Loss on 8 streets: transition to virtual waiting
                state.mode = 'VIRTUAL';
            }
        } 
        else if (state.mode === 'VIRTUAL') {
            const virtualWon = (lastDozen === state.targetDozens[0] || lastDozen === state.targetDozens[1]);
            
            if (virtualWon) {
                // The waiting condition is met; resume betting and increase bets for the loss that put us here
                state.mode = 'TWO_DOZENS';
                state.betAmount += increment;
            }
        }

        // Update peak bankroll tracker AFTER win checks
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }
    }

    // 4. Calculate clamped bet amount
    let currentBetAmount = Math.max(state.betAmount, config.betLimits.min);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    // 5. Generate Bets
    let bets = [];

    if (state.mode === 'START') {
        const startStreets = [4, 7, 10, 16, 19, 22, 28, 31, 34];
        for (let s of startStreets) {
            bets.push({ type: 'street', value: s, amount: currentBetAmount });
        }
    } 
    else if (state.mode === 'TWO_DOZENS') {
        // Map of all streets within each dozen
        const allStreets = {
            1: [1, 4, 7, 10],
            2: [13, 16, 19, 22],
            3: [25, 28, 31, 34]
        };
        
        for (let d of state.targetDozens) {
            for (let s of allStreets[d]) {
                bets.push({ type: 'street', value: s, amount: currentBetAmount });
            }
        }
    }
    // If state.mode === 'VIRTUAL', bets array remains empty (returns [])

    return bets;
}