/**
 * Modified Street Smart Roulette Strategy (Hot/Cold Numbers - Locked Cycle)
 * * Source: Custom Modification of The Roulette Master's Street Smart
 * * The Logic:
 * - Requires a history of 37 spins before betting begins.
 * - ON RESET (Base Level): Analyzes the last 37 spins to determine the "hotness" of numbers and double streets.
 * These targets are LOCKED IN for the duration of the current cycle.
 * - Identifies the "Hottest 5" double streets and the 1 "Uncovered" double street.
 * - Base Bet: Places 10 base units on the 5 hottest double streets.
 * * The Progression & Win Condition:
 * - If the previous spin was a WIN on one of the 5 base double streets:
 * - Moves to "Modifier" state.
 * - The bet on the winning double street is REPLACED with straight bets on its 4 hottest individual numbers (1 unit each, based on locked data).
 * - Straight bets are ADDED on the 4 hottest individual numbers of the "uncovered" double street (1 unit each, based on locked data).
 * - The remaining 4 hottest double streets continue to get their 10 unit line bets.
 * - If the previous spin was a LOSS (or a win on straight numbers during the modified state):
 * - RESETS the cycle. Recalculates the hot/cold data using the last 37 spins and reverts to the Base Bet.
 * * The Goal:
 * - Stop betting once a target profit is reached to lock in the session win.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Base Unit and Target Profit
    const unit = config.betLimits.min; 
    const targetProfitAmount = 100000 * unit; 
    const allLines = [1, 7, 13, 19, 25, 31];

    // 2. Initialize State on first run
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.isActive = true;
        state.lastBetType = 'none';
        state.lastBaseLines = [];
        state.savedNumFreq = {};
        state.savedHottest5 = [];
        state.savedUncovered = null;
    }

    // 3. Check Stop-Win Goal
    if (bankroll >= state.initialBankroll + targetProfitAmount) {
        state.isActive = false; // Goal reached, declare victory
    }

    if (!state.isActive) {
        return []; // Stop betting
    }

    // 4. Wait for 37 spins to gather Hot/Cold data
    if (spinHistory.length < 37) {
        return []; 
    }

    // 5. Process the outcome of the previous spin
    let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    let lastNumLine = null;
    if (lastNum >= 1 && lastNum <= 36) {
        lastNumLine = Math.floor((lastNum - 1) / 6) * 6 + 1;
    }

    // Determine if we just won on a base double street bet
    let wonOnBaseDoubleStreet = false;
    let winningLine = null;
    
    if (state.lastBetType === 'base' && state.lastBaseLines.includes(lastNumLine)) {
        wonOnBaseDoubleStreet = true;
        winningLine = lastNumLine;
    }

    // 6. Recalculate Hot/Cold Targets ONLY ON RESET
    if (!wonOnBaseDoubleStreet) {
        // We are at a reset point (first bet, loss on base, or post-modifier). 
        // Calculate frequencies over the last 37 spins.
        const recentSpins = spinHistory.slice(-37);
        const numFreq = {};
        for (let i = 1; i <= 36; i++) numFreq[i] = 0;
        
        recentSpins.forEach(spin => {
            let n = spin.winningNumber;
            if (n >= 1 && n <= 36) numFreq[n]++;
        });

        const lineFreq = {};
        allLines.forEach(lineStart => {
            let sum = 0;
            for (let i = lineStart; i < lineStart + 6; i++) {
                sum += numFreq[i];
            }
            lineFreq[lineStart] = sum;
        });

        const sortedLines = [...allLines].sort((a, b) => {
            if (lineFreq[b] !== lineFreq[a]) return lineFreq[b] - lineFreq[a];
            return a - b; 
        });

        // Save targets to state to lock them in for the cycle
        state.savedNumFreq = numFreq;
        state.savedHottest5 = sortedLines.slice(0, 5);
        state.savedUncovered = sortedLines[5];
    }

    // Helper: Get the 4 hottest straight numbers within a specific double street using SAVED state
    function getTop4NumbersInLine(lineStart) {
        let nums = [];
        for (let i = lineStart; i < lineStart + 6; i++) nums.push(i);
        nums.sort((a, b) => {
            if (state.savedNumFreq[b] !== state.savedNumFreq[a]) return state.savedNumFreq[b] - state.savedNumFreq[a];
            return a - b;
        });
        return nums.slice(0, 4);
    }

    // 7. Calculate and Clamp Bet Amounts
    let baseBetAmount = 10 * unit; 
    baseBetAmount = Math.max(baseBetAmount, config.betLimits.min);
    baseBetAmount = Math.min(baseBetAmount, config.betLimits.max);

    let straightBetAmount = 1 * unit; 
    straightBetAmount = Math.max(straightBetAmount, config.betLimits.min);
    straightBetAmount = Math.min(straightBetAmount, config.betLimits.max);

    let bets = [];

    // 8. Generate Bets based on State
    if (wonOnBaseDoubleStreet) {
        // STATE: Modified Win Spin
        state.lastBetType = 'modifier'; 
        
        let activeLines = state.savedHottest5.filter(line => line !== winningLine);
        if (activeLines.length === 5) activeLines.pop(); // Fallback

        // A. Bet on the remaining 4 hottest double streets
        activeLines.forEach(line => {
            bets.push({ type: 'line', value: line, amount: baseBetAmount });
        });

        // B. Replace winning line with its 4 hottest straight numbers
        let top4WinLine = getTop4NumbersInLine(winningLine);
        top4WinLine.forEach(num => {
            bets.push({ type: 'number', value: num, amount: straightBetAmount });
        });

        // C. Add bets on 4 hottest straight numbers in the uncovered double street
        let top4Uncovered = getTop4NumbersInLine(state.savedUncovered);
        top4Uncovered.forEach(num => {
            bets.push({ type: 'number', value: num, amount: straightBetAmount });
        });

        // Track these so we don't accidentally trigger a double street win on the next spin
        state.lastBaseLines = []; 
    } 
    else {
        // STATE: Base Bet (Reset)
        state.lastBetType = 'base';
        state.lastBaseLines = state.savedHottest5;

        // Bet 10 units on the 5 hottest double streets locked in state
        state.savedHottest5.forEach(line => {
            bets.push({ type: 'line', value: line, amount: baseBetAmount });
        });
    }

    return bets;
}