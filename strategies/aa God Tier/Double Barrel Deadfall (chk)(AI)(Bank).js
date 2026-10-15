/**
 * Strategy Name: The Double Barrel Deadfall (AI Optimized Version - Randomized & Peak Tracking)
 * Source: http://www.youtube.com/watch?v=SZib6ElUWOc (The Lucky Felt)
 *
 * The Logic:
 * This strategy constructs a 20-number trap covering over 52% of the roulette wheel.
 * It builds up a layout in 4 distinct steps when encountering consecutive losses.
 * To obscure patterns, board positions are randomized on every single spin.
 *
 * The Progression (AI Optimized Rotational Press):
 * Once all 8 base units are active on the board (Step 4), further losses enter an alternating 
 * rotational press progression targeting ONLY high-multiplier bets to recover ghost debt efficiently:
 * - Loss on Step 4: Add 1 unit to the Split positions.
 * - Subsequent Loss: Add 1 unit to the Zero positions.
 * - Alternate back and forth between splits and zeros on extended losing sequences.
 *
 * The Reset / Goal Condition:
 * - Reset when the current bankroll meets or exceeds the session's peak bankroll.
 * - If a win occurs but bankroll is below peak, keep playing with current progression levels.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const insideMin = config.betLimits.min || 2;
    const baseUnit = insideMin;

    // Session Tracking & Peak Bankroll Initialization
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.step = 1;                     
        state.splitPress = 0;               
        state.zeroPress = 0;                
        state.rotationalIndex = 0;          
        state.activeNumbers = []; 
    }

    // CRUCIAL MODIFICATION: Reset when current bankroll reaches or breaks the session peak bankroll
    if (bankroll >= state.peakBankroll) {
        state.step = 1;
        state.splitPress = 0;
        state.zeroPress = 0;
        state.rotationalIndex = 0;
        state.peakBankroll = bankroll; // Establish the new highest baseline
    }

    // Evaluate last spin result against dynamically covered positions
    if (spinHistory.length > 0 && state.activeNumbers.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        const wonLastRound = state.activeNumbers.includes(lastNumber);

        if (!wonLastRound) {
            if (state.step < 4) {
                state.step++;
            } else {
                if (state.rotationalIndex % 2 === 0) {
                    state.splitPress += config.minIncrementalBet || 1;
                } else {
                    state.zeroPress += config.minIncrementalBet || 1;
                }
                state.rotationalIndex++;
            }
        }
    }

    // Reset tracking array for the upcoming round
    state.activeNumbers = [];
    let bets = [];

    // Helper to extract a random unique element from an array
    function grabRandomUnique(arr, count) {
        let shuffled = arr.slice().sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // 1. Generate Randomized Step 1: 2 Corners
    const potentialCorners = [1, 2, 7, 8, 13, 14, 19, 20, 25, 26, 31, 32];
    const selectedCorners = grabRandomUnique(potentialCorners, 2);

    if (state.step >= 1) {
        let amt = Math.min(Math.max(baseUnit, insideMin), config.betLimits.max);
        selectedCorners.forEach(val => {
            bets.push({ type: 'corner', value: val, amount: amt });
            state.activeNumbers.push(val, val + 1, val + 3, val + 4);
        });
    }

    // 2. Generate Randomized Step 2: 2 Streets
    let potentialStreets = [];
    for (let i = 1; i <= 34; i += 3) {
        potentialStreets.push(i);
    }
    potentialStreets = potentialStreets.filter(st => !state.activeNumbers.includes(st));
    const selectedStreets = grabRandomUnique(potentialStreets.length >= 2 ? potentialStreets : [19, 28], 2);

    if (state.step >= 2) {
        let amt = Math.min(Math.max(baseUnit, insideMin), config.betLimits.max);
        selectedStreets.forEach(val => {
            bets.push({ type: 'street', value: val, amount: amt });
            state.activeNumbers.push(val, val + 1, val + 2);
        });
    }

    // 3. Generate Randomized Step 3: 2 Splits
    let potentialSplits = [];
    for (let i = 1; i <= 35; i++) {
        if (i % 3 !== 0) potentialSplits.push([i, i + 1]);
    }
    potentialSplits = potentialSplits.filter(sp => !state.activeNumbers.includes(sp[0]) && !state.activeNumbers.includes(sp[1]));
    const selectedSplits = grabRandomUnique(potentialSplits.length >= 2 ? potentialSplits : [[16, 17], [32, 35]], 2);

    if (state.step >= 3) {
        let amt = baseUnit + (state.splitPress * (config.minIncrementalBet || 1));
        amt = Math.min(Math.max(amt, insideMin), config.betLimits.max);
        selectedSplits.forEach(val => {
            bets.push({ type: 'split', value: val, amount: amt });
            state.activeNumbers.push(val[0], val[1]);
        });
    }

    // 4. Generate Step 4: Zeros (Static anchor)
    if (state.step >= 4) {
        let amt = baseUnit + (state.zeroPress * (config.minIncrementalBet || 1));
        amt = Math.min(Math.max(amt, insideMin), config.betLimits.max);
        
        bets.push({ type: 'number', value: 0, amount: amt });
        state.activeNumbers.push(0);
    }

    if (bets.length === 0) return null;
    return bets;
}