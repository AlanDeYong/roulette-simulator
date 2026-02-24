/**
 * Source: Variation of "Number One Secret" (Roulette Strategy Lab) 
 * Strategy: Dynamic Hot/Cold Corner Selection + Negative Progression
 * * The Logic: 
 * 1. Waits for 37 spins to gather data.
 * 2. Analyzes the last 37 spins to find hot/cold numbers.
 * 3. Evaluates all corners in Columns 1 & 2 (to prevent overlap with the Col 3 bet).
 * 4. Scores corners: +points for hit frequency, -points for containing "cold" (0 hit) numbers.
 * 5. Places 4 units on the top 4 dynamic corners, and 2 units on the 3rd Column.
 * * The Progression: Negative progression. If spin profit is < 0, increase progression level.
 * * The Goal: Continue until current bankroll exceeds the session starting bankroll (captured after spin 37).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Period Guard
    if (spinHistory.length < 37) {
        state.prevBankroll = bankroll; // Keep tracking, but do not bet
        return [];
    }

    // 2. Initialize Session State (Only triggers on Spin 38)
    if (state.sessionStartingBankroll === undefined) {
        state.sessionStartingBankroll = bankroll;
        state.progressionLevel = 1;
    } else {
        // Calculate net profit of the previous spin
        let spinProfit = bankroll - state.prevBankroll;
        
        if (spinProfit < 0) {
            state.progressionLevel++;
        }
        
        if (bankroll > state.sessionStartingBankroll) {
            state.sessionStartingBankroll = bankroll;
            state.progressionLevel = 1;
        }
    }
    state.prevBankroll = bankroll;

    // 3. Hot/Cold Analysis (Last 37 Spins)
    const last37 = spinHistory.slice(-37);
    const frequencies = {};
    for (let i = 0; i <= 36; i++) frequencies[i] = 0;
    
    last37.forEach(spin => {
        if (spin.winningNumber !== undefined && spin.winningNumber !== null) {
            frequencies[spin.winningNumber]++;
        }
    });

    // 4. Dynamic Corner Selection (Restricted to Cols 1 & 2 to avoid Col 3 overlap)
    // Valid top-left numbers for these specific corners:
    const validCornerStarts = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31];
    let cornerScores = [];

    validCornerStarts.forEach(startNum => {
        // A corner starting at 'n' covers n, n+1, n+3, n+4
        const cornerNums = [startNum, startNum + 1, startNum + 3, startNum + 4];
        let score = 0;
        let coldCount = 0;

        cornerNums.forEach(num => {
            const freq = frequencies[num];
            if (freq === 0) coldCount++;
            score += freq; // Add standard frequency to score
        });

        // Heavily penalize the corner if it contains cold numbers
        score -= (coldCount * 5); 
        
        cornerScores.push({ value: startNum, score: score });
    });

    // Sort descending by score and slice the top 4
    cornerScores.sort((a, b) => b.score - a.score);
    const selectedCorners = cornerScores.slice(0, 4);

    // 5. Calculate Base Units & Increments
    const cornerBaseBet = config.betLimits.min;
    const columnBaseBet = Math.max(config.betLimits.minOutside, cornerBaseBet * 2);
    
    let cornerBetAmount, columnBetAmount;
    
    if (config.incrementMode === 'fixed') {
        cornerBetAmount = cornerBaseBet + (config.minIncrementalBet * (state.progressionLevel - 1));
        columnBetAmount = columnBaseBet + (config.minIncrementalBet * (state.progressionLevel - 1));
    } else {
        cornerBetAmount = cornerBaseBet * state.progressionLevel;
        columnBetAmount = columnBaseBet * state.progressionLevel;
    }

    // 6. Clamp to Limits
    cornerBetAmount = Math.max(cornerBetAmount, config.betLimits.min);
    cornerBetAmount = Math.min(cornerBetAmount, config.betLimits.max);
    columnBetAmount = Math.max(columnBetAmount, config.betLimits.minOutside);
    columnBetAmount = Math.min(columnBetAmount, config.betLimits.max);

    // 7. Construct Bet Array
    const bets = [];
    
    // Add the 4 dynamically selected corners
    selectedCorners.forEach(corner => {
        bets.push({ type: 'corner', value: corner.value, amount: cornerBetAmount });
    });
    
    // Add the static 3rd Column bet
    bets.push({ type: 'column', value: 3, amount: columnBetAmount });

    return bets;
}