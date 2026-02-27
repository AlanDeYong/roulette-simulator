/**
 * Strategy: Splitting Squares
 * Source: Strategy Description Provided in User Prompt
 * * The Logic:
 * 1. Warmup: Analyze the last 111 spins to rank numbers based on:
 * - Frequency (Higher weight)
 * - Recency (More recent = higher weight)
 * - Gap size (Smaller gap = higher weight)
 * - Gap Trend (Shrinking gaps = higher weight)
 * 2. Betting Zone: 
 * - Fixed bet on Zero.
 * - Covers all 6 Double Streets (1-6, 7-12, etc.).
 * - In each Double Street, bets on the best ranking "Square" (Corner).
 * 3. Dynamic Evolution:
 * - If a Square hits, it converts to a "Split" (2 numbers) within that Double Street to target higher ranks.
 * - Max 3 active Splits allowed across the board. If a 4th conversion is triggered, ALL bets reset back to Squares.
 * * The Progression:
 * - Base Unit: Defaults to $2 (or config.betLimits.min).
 * - Loss: Double the bet unit (Martingale).
 * - Win: Reset unit to base ONLY if current bankroll exceeds the previous Peak Bankroll (High Water Mark).
 * * The Goal:
 * - Accumulate profit by targeting "hot" sectors and condensing coverage (Squares -> Splits) when accuracy improves.
 * - Stop Loss: Bankroll depletion.
 */
/**
 * Source: Adapting https://www.youtube.com/watch?v=54Skimo6xW4 logic with Expanding Hot-Zone Tracking
 * Modifications: Added Hot-Split tracking. If a targeted straight ("square") hits, it is replaced by the hottest split.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Phase: Wait for 37 spins
    if (spinHistory.length < 37) {
        return []; 
    }

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.hotStreets = []; 
        state.hotSplits = []; // Added: Will store ranked splits
        state.lastBankroll = bankroll;
    }

    // 3. Evaluate previous spin & manage progression
    let triggerReset = false;
    
    if (state.hotStreets.length > 0) {
        const isWin = bankroll > state.lastBankroll;
        
        if (isWin) {
            state.level = 1;
            triggerReset = true; 
        } else {
            state.level++;
            if (state.level > 7) {
                state.level = 1;
                triggerReset = true; 
            }
        }
    }

    state.lastBankroll = bankroll;

    // 4. Rank Hot Zones & Hot Splits (Only on L1 / Reset)
    if (state.level === 1 || state.hotStreets.length === 0 || triggerReset) {
        const last37 = spinHistory.slice(-37);
        const lineCounts = { 1: 0, 7: 0, 13: 0, 19: 0, 25: 0, 31: 0 };
        
        // Setup all valid roulette splits
        const allSplits = [];
        for (let i = 1; i <= 36; i++) {
            if (i % 3 !== 0) allSplits.push(`${i}-${i + 1}`); // Horizontal splits
            if (i <= 33) allSplits.push(`${i}-${i + 3}`);     // Vertical splits
        }
        const splitCounts = {};
        allSplits.forEach(s => splitCounts[s] = 0);
        
        for (let spin of last37) {
            const num = spin.winningNumber;
            if (num === 0 || num === '00') continue; 
            
            // Tally streets
            const lineBase = Math.floor((num - 1) / 6) * 6 + 1;
            if (lineCounts[lineBase] !== undefined) {
                lineCounts[lineBase]++;
            }

            // Tally splits
            allSplits.forEach(s => {
                const parts = s.split('-').map(Number);
                if (parts.includes(num)) splitCounts[s]++;
            });
        }

        // Sort double streets
        state.hotStreets = Object.keys(lineCounts).map(Number).sort((a, b) => {
            if (lineCounts[b] !== lineCounts[a]) {
                return lineCounts[b] - lineCounts[a];
            }
            return a - b; 
        });

        // Sort splits from hottest to coldest
        state.hotSplits = allSplits.sort((a, b) => {
            if (splitCounts[b] !== splitCounts[a]) {
                return splitCounts[b] - splitCounts[a];
            }
            return 0; // Tie breaker not strictly necessary for splits
        });
    }

    // 5. Progression Array
    const progressionLevels = [
        { activeCount: 1, su: 3,  nu: 1 },  
        { activeCount: 2, su: 3,  nu: 1 },  
        { activeCount: 3, su: 6,  nu: 2 },  
        { activeCount: 4, su: 6,  nu: 2 },  
        { activeCount: 5, su: 6,  nu: 2 },  
        { activeCount: 5, su: 12, nu: 4 },  
        { activeCount: 5, su: 24, nu: 8 }   
    ];

    const currentLevelData = progressionLevels[state.level - 1];
    const unit = config.betLimits.min;
    
    let streetAmount = currentLevelData.su * unit;
    let str1Amount = currentLevelData.nu * unit;
    let str2Amount = currentLevelData.nu * unit;

    streetAmount = Math.max(config.betLimits.min, Math.min(streetAmount, config.betLimits.max));
    str1Amount = Math.max(config.betLimits.min, Math.min(str1Amount, config.betLimits.max));
    str2Amount = Math.max(config.betLimits.min, Math.min(str2Amount, config.betLimits.max));

    // 6. Generate Expanding Bets & Check Hit Substitution
    const betsToPlace = [];
    const lastHit = spinHistory[spinHistory.length - 1].winningNumber;
    let splitIndexUsed = 0; // Keep track so we don't bet the exact same split twice if multiple numbers hit
    
    for (let i = 0; i < currentLevelData.activeCount; i++) {
        const targetBase = state.hotStreets[i];
        const targetStraight1 = targetBase + 4;
        const targetStraight2 = targetBase + 5;

        // Push the main street base
        betsToPlace.push({ type: 'street', value: targetBase, amount: streetAmount });

        // Check straight 1
        if (targetStraight1 === lastHit) {
            const hotSplit = state.hotSplits[splitIndexUsed] || state.hotSplits[0];
            betsToPlace.push({ type: 'split', value: hotSplit, amount: str1Amount });
            splitIndexUsed++;
        } else {
            betsToPlace.push({ type: 'number', value: targetStraight1, amount: str1Amount });
        }

        // Check straight 2
        if (targetStraight2 === lastHit) {
            const hotSplit = state.hotSplits[splitIndexUsed] || state.hotSplits[0];
            betsToPlace.push({ type: 'split', value: hotSplit, amount: str2Amount });
            splitIndexUsed++;
        } else {
            betsToPlace.push({ type: 'number', value: targetStraight2, amount: str2Amount });
        }
    }

    return betsToPlace;
}