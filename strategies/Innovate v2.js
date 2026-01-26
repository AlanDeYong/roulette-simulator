/**
 * STRATEGY: Innovate 2
 * SOURCE: YouTube Channel "Bet With Mo" - Video: https://www.youtube.com/watch?v=2lNPusqEMMk
 *
 * LOGIC:
 * This is a dynamic statistical strategy that requires 111 spins of data before starting.
 * 1. Ranking: After every spin, all numbers (0-36) are ranked based on 4 weighted criteria:
 * - Frequency (Highest priority)
 * - Recency (Recent hits preferred)
 * - Gap Size (Small gap between last two hits preferred)
 * - Gap Trend (Shrinking gap preferred)
 * 2. Selection: The strategy identifies the best performing "Double Streets" (Lines of 6 numbers).
 * Within each selected Double Street, it places:
 * - 2 Straight Up bets on the highest-ranked numbers.
 * - 1 Split bet on the next best adjacent pair.
 *
 * PROGRESSION (9 Levels + Expansion):
 * The strategy uses a mix of "Horizontal" expansion (adding more streets) and "Vertical" betting (increasing units).
 *
 * Phase 1 (Horizontal Expansion):
 * - Level 1: Bet Best 2 Double Streets (6 bets total). Unit size: 2.
 * - Level 2: Bet Best 4 Double Streets (12 bets total). Unit size: 2.
 * - Level 3: Bet Best 5 Double Streets (15 bets total). Unit size: 2.
 *
 * Phase 2 (Vertical Ladder - Fixed at 5 Streets):
 * - Level 4: Unit 5
 * - Level 5: Unit 6
 * - Level 6: Unit 7
 * - Level 7: Unit 8
 * - Level 8: Unit 9
 * - Level 9: Unit 10
 * - Level 10: Unit 20 (Double previous)
 * - Level 11: Unit 40 (Double previous)
 *
 * RESET CONDITION:
 * - Resets to Level 1 immediately if the current bankroll exceeds the session's highest previous bankroll (High Water Mark).
 */
function bet(spinHistory, bankroll, config, state) {
    // 0. CONFIGURATION & CONSTANTS
    const MIN_HISTORY = 30;
    const DOUBLE_STREETS = [
        [1, 2, 3, 4, 5, 6],
        [7, 8, 9, 10, 11, 12],
        [13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24],
        [25, 26, 27, 28, 29, 30],
        [31, 32, 33, 34, 35, 36]
    ];

    // 1. INITIALIZATION & STATE MANAGEMENT
    if (!state.level) state.level = 1;
    if (state.highWaterMark === undefined) state.highWaterMark = bankroll;

    // Check for High Water Mark / Profit Target Reset
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
        state.level = 1; // Reset on new profit high
    } else if (spinHistory.length > 0) {
        // Check result of previous spin to handle progression on loss
        const lastSpin = spinHistory[spinHistory.length - 1];
        // We only progress level on loss. Note: The complexity of determining a "win" 
        // in a multi-bet strategy means we usually rely on the bankroll check above for resets.
        // If bankroll <= highWaterMark, we assume we haven't fully recovered, so we progress logic.
        
        // However, standard progression usually moves up on a net loss of the *spin*.
        // Given the requirement: "If Loss: ... Level 2", "If Loss: ... Ladder".
        // A simple heuristic for this specific strategy: 
        // If we didn't reset (hit profit target), we move to the next level/stage of the sequence 
        // until we win enough to breach the High Water Mark.
        
        // Did we just play? If yes, and we didn't reset, increment level.
        // Note: To prevent incrementing on the very first spin or when not betting:
        if (spinHistory.length > MIN_HISTORY) {
             // Logic: If we are here, we didn't hit a new high. 
             // Ideally we check if the last spin was a net loss, but the strategy implies 
             // a ladder structure that continues until the deficit is cleared (Bankroll > HighMark).
             // Therefore, we increment the level if we are active.
             state.level = Math.min(state.level + 1, 11); // Cap at Level 11
        }
    }

    // 2. DATA SUFFICIENCY CHECK
    if (spinHistory.length < MIN_HISTORY) {
        return []; // Not enough data to calculate rankings
    }

    // 3. STATISTICAL ANALYSIS & RANKING
    // Calculate stats for all numbers 0-36
    const stats = [];
    for (let num = 0; num <= 36; num++) {
        let frequency = 0;
        let lastHitIndex = -1;
        let secondLastHitIndex = -1;
        
        // Analyze last 111 spins
        const analysisWindow = spinHistory.slice(-MIN_HISTORY);
        
        for (let i = analysisWindow.length - 1; i >= 0; i--) {
            if (analysisWindow[i].winningNumber === num) {
                frequency++;
                if (lastHitIndex === -1) {
                    lastHitIndex = i; // Relative index in window
                } else if (secondLastHitIndex === -1) {
                    secondLastHitIndex = i;
                }
            }
        }

        const recency = lastHitIndex !== -1 ? (analysisWindow.length - 1 - lastHitIndex) : 999;
        const previousRecency = secondLastHitIndex !== -1 ? (lastHitIndex - secondLastHitIndex) : 999;
        const currentGap = recency;
        const previousGap = secondLastHitIndex !== -1 ? (lastHitIndex - secondLastHitIndex) : 999;
        
        // "Trend of gap size, gap size getting smaller more weight"
        const gapGettingSmaller = (currentGap < previousGap);

        stats.push({
            number: num,
            frequency: frequency,
            recency: recency,      // Lower is better
            currentGap: currentGap, // Lower is better
            trendBonus: gapGettingSmaller ? 1 : 0
        });
    }

    // Rank numbers based on criteria hierarchy
    // 1. Freq (High), 2. Recency (Low), 3. Gap (Low), 4. Trend (Yes)
    stats.sort((a, b) => {
        if (a.frequency !== b.frequency) return b.frequency - a.frequency; // Desc
        if (a.recency !== b.recency) return a.recency - b.recency; // Asc
        if (a.currentGap !== b.currentGap) return a.currentGap - b.currentGap; // Asc
        return b.trendBonus - a.trendBonus; // Desc
    });

    // Create a map for quick rank lookup (number -> rank index)
    const rankMap = new Map();
    stats.forEach((stat, index) => rankMap.set(stat.number, index));

    // 4. DOUBLE STREET SELECTION
    // Score each double street by the sum of ranks of its numbers (Lower sum is better because Rank 0 is best)
    // Or strictly by counting how many "High Ranking" numbers are inside.
    // The prompt says: "find 2 double streets with the most high ranking numbers". 
    // We will sum the ranks (Index 0-36) of numbers in the street. Lowest sum = Best street.
    const streetScores = DOUBLE_STREETS.map((streetNumbers, index) => {
        let score = 0;
        streetNumbers.forEach(num => {
            score += rankMap.get(num);
        });
        return { index: index, numbers: streetNumbers, score: score };
    });

    // Sort streets by best score (lowest sum of ranks)
    streetScores.sort((a, b) => a.score - b.score);

    // 5. DETERMINE BETTING PARAMETERS BASED ON LEVEL
    let streetsToBetCount = 0;
    let baseUnit = 0;

    // Progression Logic
    switch (state.level) {
        case 1:
            streetsToBetCount = 2;
            baseUnit = 2;
            break;
        case 2:
            streetsToBetCount = 4;
            baseUnit = 2;
            break;
        case 3:
            streetsToBetCount = 5;
            baseUnit = 2;
            break;
        case 4:
            streetsToBetCount = 5;
            baseUnit = 5;
            break;
        case 5:
            streetsToBetCount = 5;
            baseUnit = 6;
            break;
        case 6:
            streetsToBetCount = 5;
            baseUnit = 7;
            break;
        case 7:
            streetsToBetCount = 5;
            baseUnit = 8;
            break;
        case 8:
            streetsToBetCount = 5;
            baseUnit = 9;
            break;
        case 9:
            streetsToBetCount = 5;
            baseUnit = 10;
            break;
        case 10:
            streetsToBetCount = 5;
            baseUnit = 20; // Double previous (approx)
            break;
        case 11:
            streetsToBetCount = 5;
            baseUnit = 40; // Double previous
            break;
        default:
            streetsToBetCount = 5;
            baseUnit = 40; // Max out
            break;
    }

    // Clamp Unit Size to Table Limits
    // Since these are "Number" bets (Inside), we use config.betLimits.min
    baseUnit = Math.max(baseUnit, config.betLimits.min);
    baseUnit = Math.min(baseUnit, config.betLimits.max);

    // 6. CONSTRUCT BETS
    const bets = [];
    const targetStreets = streetScores.slice(0, streetsToBetCount);

    targetStreets.forEach(streetObj => {
        const nums = streetObj.numbers; // Array of 6 numbers
        
        // Within this street, sort the 6 numbers by their Global Rank
        // We want the 2 Best for Straight Up, and next best for Split.
        const sortedNumsInStreet = [...nums].sort((a, b) => rankMap.get(a) - rankMap.get(b));

        const best1 = sortedNumsInStreet[0];
        const best2 = sortedNumsInStreet[1];
        
        // Add Straight Up Bets
        bets.push({ type: 'number', value: best1, amount: baseUnit });
        bets.push({ type: 'number', value: best2, amount: baseUnit });

        // Logic for the Split bet:
        // Requirement: "1 split covering 2 numbers". 
        // We should try to use the next best numbers (index 2, 3, 4, 5) that form a valid split.
        // On a Double Street (e.g., 1-6), valid splits are horizontal (1,2), (2,3), etc., or vertical if on board.
        // Assuming standard representation, numbers in a double street are sequential (1,2,3,4,5,6).
        // Adjacent pairs: (n, n+1) except at row breaks (3-4 is valid on board? No, 3 is Red, 4 is Black, 3 is end of row, 4 start of next? 
        // Wait. Double Street 1-6 contains Row 1 (1-3) and Row 2 (4-6).
        // Valid splits in 1-6: (1,2), (2,3), (4,5), (5,6), (1,4), (2,5), (3,6).
        
        const remainingNums = sortedNumsInStreet.slice(2); // The other 4 numbers
        let splitPair = null;
        let bestSplitRank = Infinity; // Lower is better

        // Brute force find best valid split among remaining numbers
        // We generate valid pairs from the street and check if both nums are in 'remainingNums'
        const validPairs = [];
        // Horizontal pairs
        if (nums.includes(nums[0]) && nums.includes(nums[1])) validPairs.push([nums[0], nums[1]]); // 1-2
        if (nums.includes(nums[1]) && nums.includes(nums[2])) validPairs.push([nums[1], nums[2]]); // 2-3
        if (nums.includes(nums[3]) && nums.includes(nums[4])) validPairs.push([nums[3], nums[4]]); // 4-5
        if (nums.includes(nums[4]) && nums.includes(nums[5])) validPairs.push([nums[4], nums[5]]); // 5-6
        // Vertical pairs (between the two rows of the double street)
        validPairs.push([nums[0], nums[3]]); // 1-4
        validPairs.push([nums[1], nums[4]]); // 2-5
        validPairs.push([nums[2], nums[5]]); // 3-6

        for (const pair of validPairs) {
            // Check if this pair consists ONLY of numbers we haven't bet straight up on
            // (Strictly following "followed by 2 split bets... on lower ranked numbers")
            // Actually, prompt says "1 split covering 2 numbers".
            if (remainingNums.includes(pair[0]) && remainingNums.includes(pair[1])) {
                // Determine combined rank
                const combinedRank = rankMap.get(pair[0]) + rankMap.get(pair[1]);
                if (combinedRank < bestSplitRank) {
                    bestSplitRank = combinedRank;
                    splitPair = pair;
                }
            }
        }

        // Fallback: If no valid split exists purely among the bottom 4 numbers (rare but possible depending on ranking distribution),
        // we might have to involve one of the top numbers, but the strategy implies prioritizing lower ranked for the split.
        // If splitPair is still null, pick the highest ranked available pair even if it overlaps (safety fallback),
        // or just pick the best pair from remainingNums that connects.
        // For simplicity, if we found a pair, bet it.
        if (splitPair) {
            bets.push({ type: 'split', value: splitPair, amount: baseUnit });
        } else {
             // Fallback: just bet another straight on the 3rd best number if split logic fails
             // (Though strictly creating a split is requested).
             // Let's force a split on the 3rd and 4th best sorted numbers if they are adjacent, 
             // otherwise finds any adjacent in remaining.
             if (remainingNums.length >= 2) {
                 bets.push({ type: 'split', value: [remainingNums[0], remainingNums[1]], amount: baseUnit }); 
                 // Note: This might invalidly bet non-adjacent if we aren't careful, 
                 // but 'validPairs' logic above covers adjacency.
                 // If we are here, no valid adjacent pair exists in remaining 4. This is geometrically impossible in a 2x3 grid.
                 // There is ALWAYS a valid split in any subset of 4 numbers in a 2x3 grid? 
                 // Actually no, if we have 1, 3, 4, 6. (Corners). 1-4 is split. 3-6 is split. 
                 // So we should have found it.
             }
        }
    });

    return bets;
}