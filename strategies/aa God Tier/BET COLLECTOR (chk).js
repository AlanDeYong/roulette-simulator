/**
 * ROULETTE STRATEGY: Bet Collector (Updated with Session High Tracking)
 * * Source: "Bet With Mo" YouTube Channel (https://youtu.be/a2OzGAGhr_E?si=v7Gvw7YcJtshktPV)
 * * The Logic: 
 * This strategy balances a heavy outside bet with targeted inside bets.
 * - Randomly selects a primary bet of either "High" (19-36) or "Low" (1-18) at the start of a cycle.
 * - Places straight-up bets on 8 random numbers within the opposite section of the primary bet.
 * * The Progression:
 * - On a Win (with no prior losses): Do not change bets. Bets remain at base amounts.
 * - On a Loss: 
 * - Increase the primary bet by its base unit (12 units) each time.
 * - Increase the remaining active straight-up inside bets based on config increment logic.
 * - "Bet Collector" Move: If a straight-up number hits AFTER a loss has occurred, remove the 
 * winning straight-up number from the active bets, and take its accumulated wager amount 
 * and add it directly to the primary bet.
 * * The Goal:
 * Achieve a new Session High. The strategy tracks the highest bankroll achieved before a loss.
 * When a win happens during a progression, it resets ONLY if the current bankroll strictly 
 * exceeds the highest recorded peak.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnitInside = config.betLimits.min;
    const primaryBaseAmount = Math.max(12 * baseUnitInside, config.betLimits.minOutside);

    function initState() {
        // Track the target bankroll to beat (starts at current bankroll)
        state.sessionHigh = bankroll; 
        
        state.primaryType = Math.random() < 0.5 ? 'high' : 'low';
        state.primaryBetBase = primaryBaseAmount;
        state.primaryBetAmount = state.primaryBetBase;
        
        state.insideBetBase = baseUnitInside;
        state.activeNumbers = [];
        state.insideBets = {};
        
        state.hasLost = false;

        let pool = [];
        if (state.primaryType === 'high') {
            pool = Array.from({length: 18}, (_, i) => i + 1); // 1-18
        } else {
            pool = Array.from({length: 18}, (_, i) => i + 19); // 19-36
        }

        for(let i = 0; i < 8; i++) {
            let idx = Math.floor(Math.random() * pool.length);
            let num = pool.splice(idx, 1)[0];
            state.activeNumbers.push(num);
            state.insideBets[num] = state.insideBetBase;
        }

        state.initialized = true;
    }

    if (!state.initialized) {
        initState();
    } 
    else if (spinHistory.length > 0) {
        let lastSpin = spinHistory[spinHistory.length - 1];
        let num = lastSpin.winningNumber;

        // Update session high BEFORE evaluating the spin, IF we haven't hit a loss yet
        if (!state.hasLost) {
            state.sessionHigh = Math.max(state.sessionHigh, bankroll);
        }

        let wonPrimary = false;
        if (num !== 0 && num !== 37) { 
            wonPrimary = (state.primaryType === 'high' && num >= 19 && num <= 36) || 
                         (state.primaryType === 'low' && num >= 1 && num <= 18);
        }
        
        let wonInside = state.activeNumbers.includes(num);
        let isWin = wonPrimary || wonInside;

        if (!state.hasLost) {
            // No losses yet in this cycle
            if (!isWin) {
                // First loss occurs, lock in the current sessionHigh as the target to beat
                state.hasLost = true;
                
                state.primaryBetAmount += state.primaryBetBase; 

                let incMode = config.incrementMode || 'fixed';
                let minInc = config.minIncrementalBet || 1;
                let insideInc = incMode === 'base' ? state.insideBetBase : minInc;

                state.activeNumbers.forEach(n => {
                    state.insideBets[n] += insideInc;
                });
            }
        } else {
            // We are in a progression (losses have occurred)
            if (isWin) {
                if (wonInside) {
                    // BET COLLECTOR MOVE
                    let collectedAmount = state.insideBets[num];
                    state.primaryBetAmount += collectedAmount;
                    state.activeNumbers = state.activeNumbers.filter(n => n !== num);
                    delete state.insideBets[num];
                }
                
                // FIXED: Reset only if current bankroll surpasses the recorded session peak
                if (bankroll > state.sessionHigh || state.activeNumbers.length === 0) {
                    initState();
                }
            } else {
                // Another loss
                state.primaryBetAmount += state.primaryBetBase; 

                let incMode = config.incrementMode || 'fixed';
                let minInc = config.minIncrementalBet || 1;
                let insideInc = incMode === 'base' ? state.insideBetBase : minInc;

                state.activeNumbers.forEach(n => {
                    state.insideBets[n] += insideInc;
                });
            }
        }
    }

    let bets = [];

    // Clamp and push Primary bet
    let finalPrimaryBet = Math.max(state.primaryBetAmount, config.betLimits.minOutside);
    finalPrimaryBet = Math.min(finalPrimaryBet, config.betLimits.max);
    bets.push({ type: state.primaryType, amount: finalPrimaryBet });

    // Clamp and push active Inside bets
    state.activeNumbers.forEach(n => {
        let finalInsideBet = Math.max(state.insideBets[n], config.betLimits.min);
        finalInsideBet = Math.min(finalInsideBet, config.betLimits.max);
        bets.push({ type: 'number', value: n, amount: finalInsideBet });
    });

    return bets;
}