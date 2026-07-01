/**
 * Strategy: Custom Double Matrix Progression (5 Levels)
 *
 * The Full Logic in details:
 * - Focuses on straight numbers 17 and 20.
 * - On consecutive losses, it progressively covers splits, streets, corners, and lines, dynamically doubling bet sizes.
 * - This builds a "Double Matrix" sequence to force loss recovery.
 *
 * The Full Bet Progression in details:
 * - Level 1: 1 unit each on straight numbers 17, 20.
 * - Level 2 (Loss): Add 1 unit each on splits 16/19, 18/21.
 * - Level 3 (Loss): Add 1 unit each on streets 13/15, 22/24, THEN double up all bets.
 * - Level 4 (Loss): Add bet size equivalent to the last bet on straight number to each corners 7/11, 25/29, THEN double up all bets.
 * - Level 5 (Loss): Add bet size equivalent to the last bet on straight number to each double streets 1/6, 31/36, THEN double up all bets. (This is the last level).
 * - Level 6+ (Loss): Rebet (stay at current active bets and amounts).
 *
 * The Goal:
 * To achieve a new session peak profit. 
 * - On win, if at session's peak profit: reset completely to Level 1 at the base minimum unit.
 * - On win, if not at peak profit and not at the last level: rebet (stay at current level/amounts).
 * - On win, if not at peak profit and AT the last level: reset to Level 1, but increase the starting unit by 1 increment to systematically recover.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to determine if a bet covered the winning number
    function isCovered(betObj, num) {
        if (num === 0 || num === '00') return false; 
        const n = parseInt(num, 10);
        switch (betObj.type) {
            case 'number': return n === betObj.value;
            case 'split': return betObj.value.includes(n);
            case 'street': return n >= betObj.value && n <= betObj.value + 2;
            case 'corner': return [betObj.value, betObj.value + 1, betObj.value + 3, betObj.value + 4].includes(n);
            case 'line': return n >= betObj.value && n <= betObj.value + 5;
            default: return false;
        }
    }

    // Helper to add or aggregate identical bets in the state
    function addBetToState(type, value, amount) {
        let existing = state.currentBets.find(b => b.type === type && JSON.stringify(b.value) === JSON.stringify(value));
        if (existing) {
            existing.amount += amount;
        } else {
            state.currentBets.push({ type, value, amount });
        }
    }

    // Helper to double all currently placed bets
    function doubleAllBets() {
        for (let b of state.currentBets) {
            b.amount *= 2;
        }
    }

    // Helper to initialize or reset Level 1 bets
    function setupLevel1() {
        state.currentBets = [];
        addBetToState('number', 17, state.baseUnit);
        addBetToState('number', 20, state.baseUnit);
    }

    // 1. Process previous spin result if we are already initialized
    if (state.initialized && spinHistory.length > 0 && state.currentBets && state.currentBets.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1].winningNumber;
        
        let won = false;
        for (const b of state.currentBets) {
            if (isCovered(b, lastResult)) {
                won = true;
                break;
            }
        }

        if (won) {
            if (bankroll > state.baselineBankroll) {
                // At session's peak profit: Reset completely
                state.level = 1;
                state.baseUnit = config.betLimits ? config.betLimits.min : 1;
                state.baselineBankroll = bankroll; // Update peak
                setupLevel1();
            } else {
                // Not at peak profit
                if (state.level < 5) {
                    // Not at last progression level: Rebet (do nothing to state.level or state.currentBets)
                } else {
                    // At last progression level: Reset progression but increase base unit
                    state.level = 1;
                    let increment = 1; 
                    if (config && config.incrementMode === 'base') {
                        increment = (config.betLimits && config.betLimits.min) ? config.betLimits.min : 1;
                    } else if (config && config.minIncrementalBet !== undefined) {
                        increment = config.minIncrementalBet;
                    }
                    state.baseUnit += increment;
                    setupLevel1();
                }
            }
        } else {
            // Loss
            if (state.level < 5) {
                state.level += 1;
                let currentBase = state.baseUnit;

                if (state.level === 2) {
                    addBetToState('split', [16, 19], currentBase);
                    addBetToState('split', [18, 21], currentBase);
                } else if (state.level === 3) {
                    addBetToState('street', 13, currentBase); // 13-15
                    addBetToState('street', 22, currentBase); // 22-24
                    doubleAllBets();
                } else if (state.level === 4) {
                    let straightBet = state.currentBets.find(b => b.type === 'number');
                    let straightAmount = straightBet ? straightBet.amount : currentBase;
                    
                    addBetToState('corner', 7, straightAmount);  // Covers 7, 8, 10, 11
                    addBetToState('corner', 25, straightAmount); // Covers 25, 26, 28, 29
                    doubleAllBets();
                } else if (state.level === 5) {
                    let straightBet = state.currentBets.find(b => b.type === 'number');
                    let straightAmount = straightBet ? straightBet.amount : currentBase;
                    
                    addBetToState('line', 1, straightAmount);   // Covers 1-6
                    addBetToState('line', 31, straightAmount);  // Covers 31-36
                    doubleAllBets();
                }
            } else {
                // Loss beyond Level 5 (last level): Rebet (do nothing)
            }
        }
    }

    // 2. Initial Setup (First spin of the session)
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.baseUnit = config.betLimits ? config.betLimits.min : 1;
        state.baselineBankroll = bankroll;
        setupLevel1();
    }

    // 3. Format and clamp final bets to return
    const betsToReturn = state.currentBets.map(b => {
        let amt = b.amount;
        if (config && config.betLimits) {
            amt = Math.max(amt, config.betLimits.min);
            amt = Math.min(amt, config.betLimits.max);
        }
        return { type: b.type, value: b.value, amount: amt };
    });

    return betsToReturn;
}