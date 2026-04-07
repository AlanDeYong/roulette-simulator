/**
 * Street Smart Roulette Strategy
 * * Source: https://www.youtube.com/watch?v=MrvIyguKhCw (The Roulette Master)
 * * The Logic:
 * - The strategy uses "Double Street" (Line) bets, which cover 6 numbers each.
 * - There are 6 line bets on the board (starting at 1, 7, 13, 19, 25, 31).
 * - You always start a cycle by observing one spin and betting on the 5 double streets
 * that DO NOT contain the last hit number.
 * * The Progression:
 * - Level 1 (5 Double Streets active): 
 * - WIN: Remove the winning double street (leaving 4 active) and proceed to Level 2.
 * - LOSE: Triple the bet amount. You must win 2 consecutive times to recover and reset back to base Level 1.
 * - Level 2 (4 Double Streets active):
 * - WIN: Remove the winning double street (leaving 3 active) and proceed to Level 3.
 * - LOSE: Double the bet amount. You must win 2 consecutive times to recover and reset back to base Level 1.
 * - Level 3 (3 Double Streets active):
 * - WIN: Cycle complete. Reset back to base Level 1 (pick 5 streets excluding the last hit).
 * - LOSE: Double the bet amount. You must win 1 time to recover and reset back to base Level 1.
 * * The Goal:
 * - Target profit is 20 base units (equivalent to $200 with $10 units as shown in the video). 
 * - Stop betting once the target profit is reached to lock in the session win.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Base Unit and Target Profit
    const unit = config.betLimits.min; 
    const targetProfitAmount = 20000 * unit; 
    const allLines = [1, 7, 13, 19, 25, 31];

    // Helper: Find which line a number belongs to (returns start number of the line)
    function getLineForNumber(num) {
        if (num === 0 || num === '00' || num === 37) return null;
        return Math.floor((num - 1) / 6) * 6 + 1;
    }

    // Helper: Reset progression back to Level 1
    function resetProgression(excludedLine) {
        // If the last spin was 0/00, we don't have a valid line to exclude, so default to excluding the first line
        const exclude = excludedLine !== null ? excludedLine : 1; 
        state.activeStreets = allLines.filter(line => line !== exclude);
        state.level = 1;
        state.multiplier = 1;
        state.winsNeeded = 0;
    }

    // 2. Initialize State on first run
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.isActive = true;
        state.activeStreets = [];
        state.level = 1;
        state.multiplier = 1;
        state.winsNeeded = 0;
    }

    // 3. Check Stop-Win Goal
    if (bankroll >= state.initialBankroll + targetProfitAmount) {
        state.isActive = false; // Goal reached, declare victory
    }

    if (!state.isActive) {
        return []; // Stop betting
    }

    // 4. Wait for first spin if we don't have active streets yet
    if (state.activeStreets.length === 0) {
        if (spinHistory.length === 0) {
            return []; // Need at least one spin to know what to exclude
        }
        
        let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        let excludedLine = getLineForNumber(lastNum);
        
        if (excludedLine === null) {
            return []; // If 0 hit on the very first spin, wait for a valid 1-36 number
        }
        
        resetProgression(excludedLine);
    } 
    // 5. Process the outcome of the previous spin
    else if (spinHistory.length > 0) {
        let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        let winningLine = getLineForNumber(lastNum);
        let isWin = winningLine !== null && state.activeStreets.includes(winningLine);

        if (isWin) {
            // We are in recovery mode and won
            if (state.winsNeeded > 0) {
                state.winsNeeded--;
                if (state.winsNeeded === 0) {
                    // Recovery successful, reset back to base Level 1
                    resetProgression(winningLine);
                }
            } 
            // Normal progression win
            else {
                if (state.level === 1) {
                    // Remove winning street, move to Level 2
                    state.activeStreets = state.activeStreets.filter(line => line !== winningLine);
                    state.level = 2;
                } else if (state.level === 2) {
                    // Remove winning street, move to Level 3
                    state.activeStreets = state.activeStreets.filter(line => line !== winningLine);
                    state.level = 3;
                } else if (state.level === 3) {
                    // Cycle complete, reset back to base Level 1
                    resetProgression(winningLine);
                }
            }
        } 
        else {
            // Loss occurred
            if (state.level === 1) {
                state.multiplier *= 3;
                state.winsNeeded = 2;
            } else if (state.level === 2) {
                state.multiplier *= 2;
                state.winsNeeded = 2;
            } else if (state.level === 3) {
                state.multiplier *= 2;
                state.winsNeeded = 1;
            }
        }
    }

    // 6. Calculate and Clamp Bet Amount
    let currentBetAmount = unit * state.multiplier;
    currentBetAmount = Math.max(currentBetAmount, config.betLimits.min);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    // 7. Generate Bet Array
    let bets = [];
    for (let lineStartNumber of state.activeStreets) {
        bets.push({
            type: 'line',
            value: lineStartNumber,
            amount: currentBetAmount
        });
    }

    return bets;
}