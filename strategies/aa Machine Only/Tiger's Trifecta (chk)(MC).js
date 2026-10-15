/**
 * @file roulette_strategy.js
 * @description Implementation of "Tiger's Trifecta" Roulette Strategy with isolated positional shifting.
 * ============================================================================
 * STRATEGY DOCUMENTATION
 * ============================================================================
 * - Source: https://youtu.be/AvLaNTHSahc
 * - Channel Name: The Roulette Master
 * * THE FULL LOGIC:
 * 1. Base Setup:
 * - Inside Zone: 3 double street (six-line) bets covering 18 total numbers, initialized at 1 unit each.
 * - Starting Positions: 4 (covers 4-9), 16 (covers 16-21), and 28 (covers 28-33).
 * - Outside Zone: 1 static bet placed on the Second Column (2to1), initialized at 2 units.
 * 2. Position Shifting:
 * - If an active double street wins, that specific winning bet is immediately moved to a different 
 * double street *within the same winning dozen* for the next spin. This position modification 
 * is persistent and is never overridden by a bankroll reset.
 * 3. Reset Condition:
 * - Whenever the bankroll hits a new net session profit, only the bet sizes drop back to base units. 
 * The current double street positions are preserved.
 * * THE FULL BET PROGRESSION:
 * - On Wins: Maintain current tier level or flat-bet the current progression size.
 * - On Losses:
 * - Losses 1 & 2: Increase bets linearly by adding the base units (+1 unit to double streets, +2 units to column).
 * - Loss 3+: Follow a Fibonacci escalation where the next bet equals the sum of the two previous bet tiers.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const baseStreetUnit = config.betLimits.min; 
    const baseColumnUnit = config.betLimits.minOutside >= baseStreetUnit * 2 
        ? config.betLimits.minOutside 
        : baseStreetUnit * 2;

    function getDozen(number) {
        if (number >= 1 && number <= 12) return 1;
        if (number >= 13 && number <= 24) return 2;
        if (number >= 25 && number <= 36) return 3;
        return 0;
    }

    function getStreetsInDozen(dozen) {
        if (dozen === 1) return [1, 7];
        if (dozen === 2) return [13, 19];
        if (dozen === 3) return [25, 31];
        return [];
    }

    // Initialize state mapping
    if (!state.isInitialized) {
        state.isInitialized = true;
        state.lossCount = 0;
        state.currentStreetLevel = baseStreetUnit;
        state.currentColumnLevel = baseColumnUnit;
        state.prevStreetLevel = 0;
        state.prevColumnLevel = 0;
        state.initialBankroll = bankroll;
        state.activeStreets = [4, 16, 28]; 
    }

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // 1. Position Shift Check (Executes unconditionally on a double street win)
        let streetHitIndex = -1;
        for (let i = 0; i < state.activeStreets.length; i++) {
            const start = state.activeStreets[i];
            if (lastNum >= start && lastNum <= start + 5) {
                streetHitIndex = i;
                break;
            }
        }

        if (streetHitIndex !== -1) {
            const winningDozen = getDozen(lastNum);
            const possibleStreets = getStreetsInDozen(winningDozen);
            
            if (possibleStreets.length > 0) {
                const currentStreet = state.activeStreets[streetHitIndex];
                const choices = possibleStreets.filter(s => s !== currentStreet);
                const finalSelection = choices.length > 0 ? choices : possibleStreets;
                const randomStreet = finalSelection[Math.floor(Math.random() * finalSelection.length)];
                
                state.activeStreets[streetHitIndex] = randomStreet;
            }
        }

        // 2. Sizing Progression & Reset Check (Affects bet amounts ONLY)
        if (bankroll > state.initialBankroll) {
            state.lossCount = 0;
            state.currentStreetLevel = baseStreetUnit;
            state.currentColumnLevel = baseColumnUnit;
            state.prevStreetLevel = 0;
            state.prevColumnLevel = 0;
            state.initialBankroll = bankroll;
            // state.activeStreets is deliberately left unaltered here to retain positions
        } else {
            const columnHit = (lastNum > 0 && lastNum % 3 === 2);
            
            if (columnHit || streetHitIndex !== -1) {
                // Flat bet progression tiers during ongoing mid-recovery round hits
            } else {
                // Complete loss: Advance progression sizing tiers
                state.lossCount++;
                
                if (state.lossCount === 1 || state.lossCount === 2) {
                    state.prevStreetLevel = state.currentStreetLevel;
                    state.prevColumnLevel = state.currentColumnLevel;
                    
                    state.currentStreetLevel += baseStreetUnit;
                    state.currentColumnLevel += baseColumnUnit;
                } else {
                    const nextStreet = state.currentStreetLevel + state.prevStreetLevel;
                    const nextColumn = state.currentColumnLevel + state.prevColumnLevel;
                    
                    state.prevStreetLevel = state.currentStreetLevel;
                    state.prevColumnLevel = state.currentColumnLevel;
                    
                    state.currentStreetLevel = nextStreet;
                    state.currentColumnLevel = nextColumn;
                }
            }
        }
    }

    let finalStreetAmount = Math.max(state.currentStreetLevel, config.betLimits.min);
    finalStreetAmount = Math.min(finalStreetAmount, config.betLimits.max);

    let finalColumnAmount = Math.max(state.currentColumnLevel, config.betLimits.minOutside);
    finalColumnAmount = Math.min(finalColumnAmount, config.betLimits.max);

    const currentBets = [];

    for (let streetStart of state.activeStreets) {
        currentBets.push({
            type: 'line',
            value: streetStart,
            amount: finalStreetAmount
        });
    }

    currentBets.push({
        type: 'column',
        value: 2,
        amount: finalColumnAmount
    });

    return currentBets;
}