/**
 * Strategy: Blackout (European Wheel Adaptation) + Dynamic Hot/Cold
 * Source: Roulette Strategy Lab (https://www.youtube.com/watch?v=RXZfzatwRzc) & Custom Logic
 * * The Logic: 
 * A high-coverage strategy that places bets across the board.
 * Adapted for European Roulette with Dynamic Hot/Cold Tracking:
 * - Waits for an initial 37 spins to build a frequency profile.
 * - Hottest Column (Base 5x unit)
 * - Straight Up on Zero (Base 2x unit) 
 * - 5 Hottest Non-Overlapping Corners (Base 2x unit each)
 * - 4 Streets total (Base 1x unit each): 
 * - 2 placed on the absolute hottest streets (overlap allowed).
 * - 2 placed on the hottest streets not covered by any corners.
 * * The Progression:
 * The progression ONLY applies to the Column bet. The inside bets remain static.
 * - Total Loss (Spin misses all covered numbers): Add 2 base units to the Column bet.
 * - Partial Loss (Spin hits, but payout is less than total bet): Add 1 base unit to the Column bet.
 * - Win (Net positive for the spin but NOT session profit): Keep column bet at current level.
 * * The Goal:
 * Achieve a new high-water mark for the session (Session Profit). 
 * Once the bankroll exceeds the session's starting bankroll, all bets are cleared and reset to base levels.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for 37 spins to gather initial Hot/Cold data
    if (spinHistory.length < 37) {
        return [];
    }

    // 2. Establish Base Units
    const baseMultiplier = Math.max(1, Math.ceil(config.betLimits.min / 5));
    const streetBetAmount = 1 * baseMultiplier;
    const cornerBetAmount = 2 * baseMultiplier; // Also used for the Zero bet
    const baseColBetAmount = Math.max(5 * baseMultiplier, config.betLimits.minOutside);

    // 3. Initialize State on First Active Spin
    if (typeof state.sessionStartBankroll === 'undefined') {
        state.sessionStartBankroll = bankroll;
        state.currentColBet = baseColBetAmount;
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
    }

    // 4. Evaluate Previous Spin Results & Apply Progression
    // Only evaluate if we actually placed a bet on the previous spin
    if (state.lastTotalBet > 0) { 
        const netChange = Math.round(bankroll - state.lastBankroll);

        // Goal Check: Did we achieve session profit?
        if (bankroll > state.sessionStartBankroll) {
            state.sessionStartBankroll = bankroll;
            state.currentColBet = baseColBetAmount;
        } 
        // Progression Trigger: Did we lose money on the last spin?
        else if (netChange < 0) {
            const increment = config.incrementMode === 'base' ? baseColBetAmount : config.minIncrementalBet;
            const isTotalLoss = (netChange <= -state.lastTotalBet);

            if (isTotalLoss) {
                state.currentColBet += (increment * 2);
            } else {
                state.currentColBet += increment; 
            }
        }
    }

    // 5. Clamp the progressing bet to table limits
    state.currentColBet = Math.max(state.currentColBet, config.betLimits.minOutside);
    state.currentColBet = Math.min(state.currentColBet, config.betLimits.max);

    const safeStreetBet = Math.min(streetBetAmount, config.betLimits.max);
    const safeInsideBet = Math.min(cornerBetAmount, config.betLimits.max);

    // --- HOT/COLD DYNAMIC PLACEMENT LOGIC ---
    
    // Extract the last 37 spins and calculate frequencies
    const recentSpins = spinHistory.slice(-37).map(s => s.winningNumber);
    const frequencies = {};
    for (let i = 0; i <= 36; i++) frequencies[i] = 0;
    recentSpins.forEach(num => frequencies[num]++);

    const coveredNumbers = new Set();
    const getCornerNumbers = (tl) => [tl, tl + 1, tl + 3, tl + 4];

    // Find the Hottest Column
    const colScores = { 1: 0, 2: 0, 3: 0 };
    recentSpins.forEach(num => {
        if (num !== 0) colScores[num % 3 === 0 ? 3 : num % 3]++;
    });
    const bestCol = parseInt(Object.keys(colScores).reduce((a, b) => colScores[a] > colScores[b] ? a : b));

    // Get sorted array of hot numbers (excluding Zero)
    const hotNumbers = Object.keys(frequencies)
        .filter(n => parseInt(n) !== 0)
        .sort((a, b) => frequencies[b] - frequencies[a])
        .map(n => parseInt(n));

    // Find 5 non-overlapping Corners based on hottest numbers
    const cornerPlacements = [];
    for (let num of hotNumbers) {
        if (cornerPlacements.length >= 5) break; // Target: 5 Corners
        
        const possibleCorners = [num, num - 1, num - 3, num - 4]
            .filter(tl => tl >= 1 && tl <= 32 && tl % 3 !== 0);

        for (let tl of possibleCorners) {
            const cornerNums = getCornerNumbers(tl);
            const hasOverlap = cornerNums.some(n => coveredNumbers.has(n));
            
            if (!hasOverlap) {
                cornerPlacements.push(tl);
                cornerNums.forEach(n => coveredNumbers.add(n));
                break;
            }
        }
    }

    // --- NEW STREET LOGIC: 2 Hottest (Overlap Allowed) + 2 Non-Overlapping ---
    
    // Calculate heat scores for all 12 streets
    const allStreets = [];
    for (let i = 0; i < 12; i++) {
        const startNum = i * 3 + 1;
        const streetNums = [startNum, startNum + 1, startNum + 2];
        const heatScore = frequencies[streetNums[0]] + frequencies[streetNums[1]] + frequencies[streetNums[2]];
        allStreets.push({ value: startNum, nums: streetNums, score: heatScore });
    }
    
    // Sort all streets by heat score descending
    allStreets.sort((a, b) => b.score - a.score);
    
    const streetPlacements = [];
    
    // 1. Pick the 2 absolute hottest streets (overlap allowed)
    streetPlacements.push(allStreets[0].value);
    streetPlacements.push(allStreets[1].value);
    
    // 2. Find the 2 hottest streets that have ZERO overlap with the corners
    let nonOverlappingFound = 0;
    for (let i = 2; i < allStreets.length; i++) {
        if (nonOverlappingFound >= 2) break; // We only need 2
        
        const hasOverlapWithCorners = allStreets[i].nums.some(n => coveredNumbers.has(n));
        
        if (!hasOverlapWithCorners) {
            streetPlacements.push(allStreets[i].value);
            nonOverlappingFound++;
        }
    }

    // --- CONSTRUCT THE BET ARRAY ---
    const bets = [];

    // Outside Bet: Hottest Column 
    bets.push({ type: 'column', value: bestCol, amount: state.currentColBet });

    // Inside Bet: Straight up on Zero (European Adaptation remains fixed)
    bets.push({ type: 'number', value: 0, amount: safeInsideBet });

    // Inside Bets: 5 Dynamic Corners
    cornerPlacements.forEach(val => {
        bets.push({ type: 'corner', value: val, amount: safeInsideBet });
    });

    // Inside Bets: 4 Dynamic Streets (2 Hottest + 2 Non-Overlapping)
    streetPlacements.forEach(val => {
        bets.push({ type: 'street', value: val, amount: safeStreetBet });
    });

    // Update state for the next spin's evaluation
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    state.lastBankroll = bankroll;

    return bets;
}