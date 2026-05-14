/**
 * Dynamic "Hot Table" Always Black Strategy (ABS)
 * Source: CEG Dealer School - https://www.youtube.com/watch?v=dIohEVZznf4 (Modified per user constraints)
 * * * The Logic: 
 * This strategy adapts the core ABS framework to follow table trends. It observes 
 * the wheel for 37 spins without betting to build a statistical baseline. Once 37 
 * spins are recorded, it analyzes the rolling 37-spin window to determine the 
 * hottest Color, hottest Dozen, and hottest Inside areas (Corners/Splits) based 
 * on hit frequencies, and directs the ABS bets to those locations dynamically.
 * * * The Progression:
 * - Step 0 (Observation): Wait until 37 spins are recorded.
 * - Step 1 (The Foundation): Bet 3 units on the Hottest Color.
 * -> Win (Net Profit > 0): Move to Step 2. 
 * -> Loss: Reset to Step 1.
 * - Step 2 (The Hedge): Bet 3 units on Hottest Color + 3 units on Hottest Dozen.
 * -> Dozen hits (Net Win): Move to Step 3. 
 * -> Only Color hits (Net Push): Repeat Step 2. 
 * -> Both miss (Net Loss): Reset to Step 1.
 * - Step 3 (The Inside Attack): Bet 3u Hottest Color, 3u Hottest Dozen, 
 * 1u on Top Hot Corner, 1u on 2nd Hot Corner, 1u on Top Hot Split.
 * -> Net Profit > 0 (Win): Reset to Step 1 (Take profits).
 * -> Net Profit == 0 (Push): Repeat Step 3.
 * -> Net Profit < 0 (Loss): Reset to Step 1.
 * * * The Goal: 
 * Maximize strike rate by following the hottest parts of the table, while utilizing 
 * the conservative step-by-step bankroll protection and overlapping wins of the ABS.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Phase: Wait for 37 spins to determine hot numbers
    if (spinHistory.length < 37) {
        state.lastBets = [];
        return [];
    }

    // 2. Initialize state variables
    if (!state.step) state.step = 1;
    if (!state.lastBets) state.lastBets = [];

    // 3. Evaluate the previous spin's result against last bets to dictate progression
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastColor = lastSpin.winningColor;
        
        let netProfit = 0;

        // Generic profit calculator based on whatever dynamic bets were placed
        state.lastBets.forEach(b => {
            if (b.type === 'red' || b.type === 'black') {
                netProfit += (lastColor === b.type) ? b.amount : -b.amount;
            } else if (b.type === 'dozen') {
                let win = false;
                if (b.value === 1 && lastNum >= 1 && lastNum <= 12) win = true;
                if (b.value === 2 && lastNum >= 13 && lastNum <= 24) win = true;
                if (b.value === 3 && lastNum >= 25 && lastNum <= 36) win = true;
                netProfit += win ? (b.amount * 2) : -b.amount;
            } else if (b.type === 'corner') {
                const tl = b.value;
                const targets = [tl, tl + 1, tl + 3, tl + 4];
                netProfit += targets.includes(lastNum) ? (b.amount * 8) : -b.amount;
            } else if (b.type === 'split') {
                const targets = Array.isArray(b.value) ? b.value : [];
                netProfit += targets.includes(lastNum) ? (b.amount * 17) : -b.amount;
            }
        });

        // Step Evaluation based on Profit
        if (state.step === 1) {
            state.step = (netProfit > 0) ? 2 : 1;
        } else if (state.step === 2) {
            if (netProfit > 0) state.step = 3;       
            else if (netProfit === 0) state.step = 2; 
            else state.step = 1;                     
        } else if (state.step === 3) {
            if (netProfit > 0) state.step = 1;       
            else if (netProfit === 0) state.step = 3; 
            else state.step = 1;                     
        }
    }

    // 4. Heat Analysis: Analyze the last 37 spins
    const last37 = spinHistory.slice(-37);
    const freqs = { colors: { red: 0, black: 0 }, dozens: { 1: 0, 2: 0, 3: 0 }, numbers: {} };
    for (let i = 0; i <= 36; i++) freqs.numbers[i] = 0;

    last37.forEach(spin => {
        if (spin.winningColor === 'red') freqs.colors.red++;
        if (spin.winningColor === 'black') freqs.colors.black++;
        
        if (spin.winningNumber >= 1 && spin.winningNumber <= 12) freqs.dozens[1]++;
        else if (spin.winningNumber >= 13 && spin.winningNumber <= 24) freqs.dozens[2]++;
        else if (spin.winningNumber >= 25 && spin.winningNumber <= 36) freqs.dozens[3]++;
        
        freqs.numbers[spin.winningNumber]++;
    });

    // Find hot color and hot dozen
    const hotColor = freqs.colors.red >= freqs.colors.black ? 'red' : 'black';
    const hotDozen = Number(Object.keys(freqs.dozens).reduce((a, b) => freqs.dozens[a] > freqs.dozens[b] ? a : b));

    // Calculate Heat for all Corners (Top-Left number defines a corner)
    let corners = [];
    for (let i = 1; i <= 32; i++) {
        if (i % 3 !== 0) { // Exclude right-column numbers as they can't be top-left of a corner
            let heat = freqs.numbers[i] + freqs.numbers[i+1] + freqs.numbers[i+3] + freqs.numbers[i+4];
            corners.push({ val: i, heat: heat });
        }
    }
    corners.sort((a, b) => b.heat - a.heat); // Sort highest heat first
    
    // Calculate Heat for all Splits
    let splits = [];
    for (let i = 1; i <= 36; i++) {
        if (i % 3 !== 0) { // Horizontal split
            splits.push({ val: [i, i+1], heat: freqs.numbers[i] + freqs.numbers[i+1] });
        }
        if (i <= 33) { // Vertical split
            splits.push({ val: [i, i+3], heat: freqs.numbers[i] + freqs.numbers[i+3] });
        }
    }
    splits.sort((a, b) => b.heat - a.heat);

    // 5. Calculate Base Units respecting Config Limits
    const insideMin = config.betLimits.min;
    const outsideMin = config.betLimits.minOutside;
    
    // Ensure the 3:1 ratio satisfies minimums
    let baseUnit = Math.max(insideMin, Math.ceil(outsideMin / 3));
    let outBet = Math.min(baseUnit * 3, config.betLimits.max);
    let inBet = Math.min(baseUnit, config.betLimits.max);

    // 6. Construct dynamic bet array based on the calculated Hot Spots
    let currentBets = [];

    if (state.step === 1) {
        currentBets.push({ type: hotColor, amount: outBet });
    } 
    else if (state.step === 2) {
        currentBets.push({ type: hotColor, amount: outBet });
        currentBets.push({ type: 'dozen', value: hotDozen, amount: outBet });
    } 
    else if (state.step === 3) {
        currentBets.push({ type: hotColor, amount: outBet });
        currentBets.push({ type: 'dozen', value: hotDozen, amount: outBet });
        
        // Target the hottest two corners and the hottest split
        currentBets.push({ type: 'corner', value: corners[0].val, amount: inBet });
        currentBets.push({ type: 'corner', value: corners[1].val, amount: inBet });
        currentBets.push({ type: 'split', value: splits[0].val, amount: inBet });
    }

    state.lastBets = currentBets;
    return currentBets;
}