/**
 * Strategy: The Winning Formula (Modified Peak-Profit Variant)
 * Source: User Customization based on The Roulette Master
 * * * The Full Logic in details:
 * - Tracking: The strategy scans past spins to identify the Most Recent, Middle, 
 * and Oldest dozens.
 * - Delayed Start: NO bets are placed until all 3 dozens have hit at least once.
 * - Initial Bets: 
 * - Oldest Dozen: 2 units each on its 2 non-overlapping double streets.
 * - Middle Dozen: 1 unit each on its 2 non-overlapping double streets.
 * - Most Recent Dozen: No bets.
 * * * The Full Bet Progression in details:
 * - Target dozens are LOCKED IN as long as a progression sequence is active.
 * - On Loss: Double the progression multiplier (Martingale). DO NOT restore removed lines. 
 * Rebet on the active lines within the locked dozens.
 * - On Win (Larger Bet / Oldest Dozen): Reset progression, clear removed bets, and select new dozens based on history.
 * - On Win (Smaller Bet / Middle Dozen):
 * - If at Session Peak Profit: Reset progression, clear removed bets, and select new dozens.
 * - If NOT at Session Peak Profit: Remove the specific winning line bet, maintain current bet sizes, 
 * keep the dozens locked, and spin again.
 * * * The Goal:
 * - Secure progressive profits by utilizing session peak logic to determine recovery depth.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = Math.max(config.betLimits.min, 1);

    // 2. Initialize State
    if (!state.progression) state.progression = 1;
    if (!state.removedLines) state.removedLines = [];
    if (state.selectNewDozens === undefined) state.selectNewDozens = true;
    
    // Initialize or Update Peak Bankroll
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
    }

    // 3. Evaluate previous spin outcome
    if (spinHistory.length > 0 && state.lastBets && state.lastBets.length > 0) {
        let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        let wonBig = false;
        let wonSmall = false;
        let winningLine = null;

        for (let bet of state.lastBets) {
            if (lastNum >= bet.value && lastNum <= bet.value + 5) {
                winningLine = bet.value;
                if (state.lastBetsInfo.bigLines.includes(winningLine)) {
                    wonBig = true;
                } else if (state.lastBetsInfo.smallLines.includes(winningLine)) {
                    wonSmall = true;
                }
                break;
            }
        }

        if (wonBig) {
            state.progression = 1;
            state.removedLines = [];
            state.selectNewDozens = true;
        } else if (wonSmall) {
            // Custom Logic: Check Session Peak Profit
            if (bankroll >= state.peakBankroll) {
                state.progression = 1;
                state.removedLines = [];
                state.selectNewDozens = true;
            } else {
                // Recovery: Remove winning bet, do NOT double, keep dozens locked
                state.removedLines.push(winningLine);
                state.selectNewDozens = false;
            }
        } else {
            // Loss: Double all bets, DO NOT restore removed lines, keep dozens locked
            state.progression *= 2;
            state.selectNewDozens = false;
        }
    }

    // Update peak bankroll for future evaluations
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 4. Determine Dozen Order
    let currentDozens = [];
    
    if (!state.selectNewDozens && state.lockedDozens) {
        // Reuse previously established order during active progression
        currentDozens = state.lockedDozens;
    } else {
        // Scan backwards to find the order of the 3 dozens
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            let num = spinHistory[i].winningNumber;
            if (num === 0) continue;
            let d = Math.ceil(num / 12);
            
            if (!currentDozens.includes(d)) {
                currentDozens.push(d);
            }
            if (currentDozens.length === 3) break;
        }

        // DELAYED START: If we haven't seen all 3 dozens yet, wait.
        if (currentDozens.length < 3) {
            return [];
        }
        
        state.lockedDozens = currentDozens; // Cache for the duration of this progression cycle
    }

    // currentDozens[0] = Most Recent, [1] = Middle, [2] = Oldest
    let middleDozen = currentDozens[1];
    let oldestDozen = currentDozens[2];

    let getLinesForDozen = (dozen) => {
        if (dozen === 1) return [1, 7];
        if (dozen === 2) return [13, 19];
        if (dozen === 3) return [25, 31];
        return [];
    };

    let oldestLines = getLinesForDozen(oldestDozen);
    let middleLines = getLinesForDozen(middleDozen);

    // 5. Calculate Bet Amounts (Clamp to limits)
    let smallAmount = unit * state.progression;
    let bigAmount = 2 * unit * state.progression;

    smallAmount = Math.max(smallAmount, config.betLimits.min);
    smallAmount = Math.min(smallAmount, config.betLimits.max);

    bigAmount = Math.max(bigAmount, config.betLimits.min);
    bigAmount = Math.min(bigAmount, config.betLimits.max);

    // 6. Place Bets
    let betsToPlace = [];

    // Big Bets -> Oldest Dozen
    for (let line of oldestLines) {
        if (!state.removedLines.includes(line)) {
            betsToPlace.push({ type: 'line', value: line, amount: bigAmount });
        }
    }

    // Small Bets -> Middle Dozen
    for (let line of middleLines) {
        if (!state.removedLines.includes(line)) {
            betsToPlace.push({ type: 'line', value: line, amount: smallAmount });
        }
    }

    // Persist evaluation state
    state.lastBets = betsToPlace;
    state.lastBetsInfo = {
        bigLines: oldestLines,
        smallLines: middleLines
    };

    return betsToPlace;
}