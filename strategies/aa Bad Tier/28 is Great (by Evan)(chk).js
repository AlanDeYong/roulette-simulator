/*
 * Strategy Name: 28 is Great (by Evan)
 * Source: The Roulette Master - https://youtu.be/k8HjNANG0h0
 *
 * The Full Logic in details:
 * This strategy covers 28 numbers on the roulette wheel (creating two blocks of 14 continuous 
 * numbers on an American wheel). It places Dozen bets on the 1st and 3rd Dozens, and straight-up 
 * bets on the 0, 00, and a specific cluster of 2nd Dozen numbers: 13, 14, 17, 18, 19, and 20.
 * 
 * The Full Bet Progression in details:
 * 1. Base Bets: The Dozen bets use 12x the base unit of the inside numbers to maintain balance 
 *    (e.g., $60 Dozens, $5 inside numbers in the video).
 * 2. On a Win:
 *    - If the current bankroll reaches or exceeds the highest recorded session bankroll 
 *      (Target Bankroll), the progression completely resets to base level, and all numbers are bet.
 *    - If the bankroll increases but is STILL below the Target Bankroll (Recovery Mode), the 
 *      progression level does not increase. However, if the winning number was one of our inside 
 *      bets (0, 00, or the 2nd Dozen cluster), we REMOVE that specific number from our active bets
 *      for the rest of the recovery sequence to maximize payout on remaining hits.
 * 3. On a Loss:
 *    - Increase the bet amounts by the original starting base unit (Progression Level + 1).
 *    - Example: Dozens go 60 -> 120 -> 180. Inside numbers go 5 -> 10 -> 15.
 *
 * The Goal: 
 * Continually reach new peak bankroll targets. The system runs continuously to grind new high 
 * watermarks while utilizing targeted number removal during drawdown recoveries.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State variables on first run
    if (!state.initialized) {
        state.targetBankroll = bankroll;
        state.progressionLevel = 1;
        
        // Base numbers targeted in the 2nd Dozen + Zero(s)
        state.initialNumbers = [0, 13, 14, 17, 18, 19, 20];
        if (config.tableType === 'american') {
            state.initialNumbers.push('00');
        }
        
        state.activeNumbers = [...state.initialNumbers];
        state.initialized = true;
    } 
    // 2. Evaluate previous spin result to update progression and state
    else if (spinHistory.length > 0) {
        let lastSpin = spinHistory[spinHistory.length - 1];
        let netWin = bankroll - state.lastBankroll;
        
        // Condition A: We reached or exceeded our target session high bankroll
        if (bankroll >= state.targetBankroll) {
            state.progressionLevel = 1;                     // Reset progression
            state.activeNumbers = [...state.initialNumbers]; // Restore all numbers
            state.targetBankroll = bankroll;                // Set new high watermark
        } 
        // Condition B: We are in a drawdown / recovery phase
        else {
            if (netWin > 0) {
                // We won the spin, but are still below target bankroll.
                let num = lastSpin.winningNumber;
                let hitVal = (num === 37 || num === '00') ? '00' : num;
                
                // If the hit was one of our inside numbers, we REMOVE it from active bets
                let hitIndex = state.activeNumbers.indexOf(hitVal);
                if (hitIndex !== -1) {
                    state.activeNumbers.splice(hitIndex, 1);
                }
            } else if (netWin < 0) {
                // We lost the spin. Increase progression step.
                state.progressionLevel++;
            }
        }
    }

    // 3. Determine Base Bet amounts
    let insideBase = config.betLimits.min;
    // Dozens need to be large enough to balance the inside bets, using a 12:1 ratio, while respecting minOutside limits
    let dozenBase = Math.max(config.betLimits.minOutside, insideBase * 12);
    
    let insideAmount = insideBase;
    let dozenAmount = dozenBase;

    // 4. Calculate Current Bet Amount based on Progression Level
    if (state.progressionLevel > 1) {
        let multiplier = state.progressionLevel - 1;
        let incMode = config.incrementMode || 'base';
        
        if (incMode === 'fixed') {
            let increment = config.minIncrementalBet || 1;
            insideAmount += increment * multiplier;
            dozenAmount += increment * multiplier;
        } else {
            // 'base' increment mode (Strategy default behavior)
            insideAmount += insideBase * multiplier;
            dozenAmount += dozenBase * multiplier;
        }
    }
    
    // 5. CLAMP to strict table limits
    insideAmount = Math.max(insideAmount, config.betLimits.min);
    insideAmount = Math.min(insideAmount, config.betLimits.max);
    
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    // 6. Build the array of bet objects
    let bets = [];
    
    // Always place the 1st and 3rd Dozen bets
    bets.push({ type: 'dozen', value: 1, amount: dozenAmount });
    bets.push({ type: 'dozen', value: 3, amount: dozenAmount });
    
    // Place straight-up bets for all currently active inside numbers
    for (let num of state.activeNumbers) {
        bets.push({ type: 'number', value: num, amount: insideAmount });
    }
    
    // 7. Store current bankroll to calculate net win/loss on the next call
    state.lastBankroll = bankroll;
    
    return bets;
}