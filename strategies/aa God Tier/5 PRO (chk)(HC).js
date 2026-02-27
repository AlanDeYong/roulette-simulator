/**
 * Source: Adapting https://www.youtube.com/watch?v=54Skimo6xW4 logic with Expanding Hot-Zone Tracking
 * * * The Logic:
 * - Observation Phase: Waits for 37 spins. Ranks all 6 double streets from hottest to coldest based on hit frequency.
 * - Pattern Placement & Expansion: Places the base pattern (1 street, 2 straights) on the #1 hottest double street. 
 * - On a loss, it "places additional bets" by adding the next hottest double street from the ranked list to the board, accumulating coverage.
 * - Locking: The ranking of the hot streets is locked. It does not change or re-sort until a full reset is triggered.
 * * * The Progression:
 * - L1: Bet on Hottest #1 (3u street, 1u straight, 1u straight)
 * - L2: Bet on Hottest #1, #2 (3u, 1u, 1u each)
 * - L3: Bet on Hottest #1, #2, #3 (6u, 2u, 2u each - "double up all bets")
 * - L4: Bet on Hottest #1, #2, #3, #4 (6u, 2u, 2u each)
 * - L5: Bet on Hottest #1, #2, #3, #4, #5 (6u, 2u, 2u each)
 * - L6: Keep 5 Active Streets, double amounts (12u, 4u, 4u each)
 * - L7: Keep 5 Active Streets, double amounts (24u, 8u, 8u each)
 * - A "Reset" is triggered on ANY win, OR a loss at Level 7.
 * * * The Goal:
 * - Accumulate board coverage by specifically targeting the most frequent sectors to break a losing streak.
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
        state.hotStreets = []; // Will store ranked double streets [hottest, 2nd, 3rd...]
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

    // 4. Rank Hot Zones (Only on L1 / Reset)
    if (state.level === 1 || state.hotStreets.length === 0 || triggerReset) {
        const last37 = spinHistory.slice(-37);
        const lineCounts = { 1: 0, 7: 0, 13: 0, 19: 0, 25: 0, 31: 0 };
        
        for (let spin of last37) {
            const num = spin.winningNumber;
            if (num === 0 || num === '00') continue; 
            
            const lineBase = Math.floor((num - 1) / 6) * 6 + 1;
            if (lineCounts[lineBase] !== undefined) {
                lineCounts[lineBase]++;
            }
        }

        // Sort the double streets from hottest to coldest
        state.hotStreets = Object.keys(lineCounts).map(Number).sort((a, b) => {
            if (lineCounts[b] !== lineCounts[a]) {
                return lineCounts[b] - lineCounts[a]; // Sort by hit count (descending)
            }
            return a - b; // Tie breaker: lower number street first
        });
    }

    // 5. Progression Array (Maps active zones and bet multipliers per level)
    const progressionLevels = [
        { activeCount: 1, su: 3,  nu: 1 },  // Level 1: 1 Zone
        { activeCount: 2, su: 3,  nu: 1 },  // Level 2: 2 Zones
        { activeCount: 3, su: 6,  nu: 2 },  // Level 3: 3 Zones (Double up)
        { activeCount: 4, su: 6,  nu: 2 },  // Level 4: 4 Zones
        { activeCount: 5, su: 6,  nu: 2 },  // Level 5: 5 Zones
        { activeCount: 5, su: 12, nu: 4 },  // Level 6: 5 Zones (Double up)
        { activeCount: 5, su: 24, nu: 8 }   // Level 7: 5 Zones (Double up)
    ];

    const currentLevelData = progressionLevels[state.level - 1];
    const unit = config.betLimits.min;
    
    // Calculate base amounts per zone and strictly apply table limits
    let streetAmount = currentLevelData.su * unit;
    let str1Amount = currentLevelData.nu * unit;
    let str2Amount = currentLevelData.nu * unit;

    streetAmount = Math.max(config.betLimits.min, Math.min(streetAmount, config.betLimits.max));
    str1Amount = Math.max(config.betLimits.min, Math.min(str1Amount, config.betLimits.max));
    str2Amount = Math.max(config.betLimits.min, Math.min(str2Amount, config.betLimits.max));

    // 6. Generate Expanding Bets
    const betsToPlace = [];
    
    for (let i = 0; i < currentLevelData.activeCount; i++) {
        const targetBase = state.hotStreets[i];
        const targetStraight1 = targetBase + 4;
        const targetStraight2 = targetBase + 5;

        betsToPlace.push({ type: 'street', value: targetBase, amount: streetAmount });
        betsToPlace.push({ type: 'number', value: targetStraight1, amount: str1Amount });
        betsToPlace.push({ type: 'number', value: targetStraight2, amount: str2Amount });
    }

    return betsToPlace;
}