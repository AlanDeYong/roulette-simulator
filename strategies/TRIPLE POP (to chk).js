/**
 * TRIPLE POP ROULETTE STRATEGY
 * * Source: The Roulette Master (https://www.youtube.com/watch?v=EW7yDVDCLZc)
 * * The Logic: 
 * - The strategy monitors the three 1:1 outside bet categories (Red/Black, Even/Odd, Low/High).
 * - On every spin, it scans the history to find the one option from each category that has 
 * "slept" (not hit) the longest.
 * - It places equal bets on all three of these identified sleeping outside bets.
 * * The Progression:
 * - If 0 out of 3 bets win (all lose): Increase the bet size by 3 units.
 * - If 1 out of 3 bets win (lose 2): Increase the bet size by 2 units.
 * - If 2 out of 3 bets win (lose 1): Increase the bet size by 1 unit.
 * - If 3 out of 3 bets win (Triple Pop!): Reset the bet size back to the base unit.
 * * The Goal:
 * - To hit a "Triple Pop" (all 3 bets win simultaneously) while scaling bets upward 
 * during partial losses to cover the deficit, ultimately securing a profit when the pop occurs.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish Base Unit and Increment Logic
    const baseUnit = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

    // 2. Initialize State
    if (!state.currentBetAmount) {
        state.currentBetAmount = baseUnit;
    }
    if (!state.currentTargets) {
        state.currentTargets = [];
    }

    // Helper: Determine if a specific number wins a specific outside bet
    const isWin = (num, target) => {
        if (num === 0 || num === 37) return false; // 0 or 00 always lose 1:1 outside bets
        const redNums = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
        
        if (target === 'red') return redNums.includes(num);
        if (target === 'black') return !redNums.includes(num);
        if (target === 'even') return num % 2 === 0;
        if (target === 'odd') return num % 2 !== 0;
        if (target === 'low') return num >= 1 && num <= 18;
        if (target === 'high') return num >= 19 && num <= 36;
        
        return false;
    };

    // 3. Evaluate Previous Spin & Apply Progression
    if (spinHistory.length > 0 && state.currentTargets.length === 3) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        let wins = 0;

        // Count how many of our 3 targets hit
        state.currentTargets.forEach(target => {
            if (isWin(lastNum, target)) wins++;
        });

        // Apply Triple Pop progression rules
        if (wins === 3) {
            state.currentBetAmount = baseUnit; // Triple Pop! Reset.
        } else if (wins === 2) {
            state.currentBetAmount += (increment * 1);
        } else if (wins === 1) {
            state.currentBetAmount += (increment * 2);
        } else if (wins === 0) {
            state.currentBetAmount += (increment * 3);
        }
    }

    // 4. Identify the "Sleeping" Targets
    let sleeps = { red: 0, black: 0, even: 0, odd: 0, low: 0, high: 0 };
    let found = { red: false, black: false, even: false, odd: false, low: false, high: false };

    // Scan backward through history to calculate sleep duration
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        let n = spinHistory[i].winningNumber;
        
        if (n !== 0 && n !== 37) {
            let isRedHit = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n);
            let isEvenHit = (n % 2 === 0);
            let isLowHit = (n >= 1 && n <= 18);

            if (isRedHit) found.red = true; else found.black = true;
            if (isEvenHit) found.even = true; else found.odd = true;
            if (isLowHit) found.low = true; else found.high = true;
        }

        // Increment sleep counters for anything not yet found
        Object.keys(sleeps).forEach(k => {
            if (!found[k]) sleeps[k]++;
        });

        // Optimization: Stop scanning if we've seen at least one of every outcome
        if (Object.values(found).every(v => v === true)) break;
    }

    // Select the longest sleeper from each category pair
    const targetColor = sleeps.red > sleeps.black ? 'red' : 'black';
    const targetParity = sleeps.even > sleeps.odd ? 'even' : 'odd';
    const targetHalf = sleeps.low > sleeps.high ? 'low' : 'high';

    state.currentTargets = [targetColor, targetParity, targetHalf];

    // 5. Clamp Bets to Config Limits
    let finalAmount = Math.max(state.currentBetAmount, config.betLimits.minOutside);
    finalAmount = Math.min(finalAmount, config.betLimits.max);
    
    // Update state to reflect clamped amount so progression doesn't falsely inflate beyond max
    state.currentBetAmount = finalAmount;

    // 6. Return Bet Array
    return state.currentTargets.map(target => ({
        type: target,
        amount: finalAmount
    }));
}