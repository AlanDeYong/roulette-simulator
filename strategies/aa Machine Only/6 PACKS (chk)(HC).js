/**
 * Roulette Strategy: Alternating 6-Number Block Progression with Hot Number Targeting
 * Source URL: https://youtu.be/ayiKsgFeUVY
 * Source Channel: YouTube Channel name unavailable (Video ID: ayiKsgFeUVY)
 * 
 * The Logic:
 * - The table is divided into predefined 6-number blocks spanning 3 rows and 2 columns.
 * - The strategy initiates by selecting a random "corner" block from the top or bottom of the table.
 * - On a loss, it expands coverage by adding adjacent blocks in a vertical zig-zag pattern (alternating columns).
 * - Hot Number Targeting (New): After 37 spins are recorded, upon every reset, the strategy analyzes the last 37 spins. 
 *   It evaluates all 4 possible full paths (18 numbers each) and selects the path containing the highest count of "hot" 
 *   (frequently hit) numbers. If tied, or if under 37 spins, it defaults to a random selection.
 * - On a win: 
 *      - If at session profit (defined as reaching or exceeding the Peak Bankroll), the sequence resets completely to the optimal hot-number path.
 *      - If NOT at session profit (still below Peak Bankroll), the progression level (bet size and block coverage) is reduced by 1 level downwards.
 * 
 * The Progression:
 * - Loss 0: 1 block (6 numbers). Bet = 1x base unit.
 * - Loss 1: Add 2nd block (12 numbers). Bet = 1x base unit on all.
 * - Loss 2: Add 3rd block (18 numbers). Bet = 2x base unit on all (Double up).
 * - Loss 3: 3 blocks (18 numbers). Bet = 3x base unit on all (+1x base).
 * - Loss 4: 3 blocks (18 numbers). Bet = 4x base unit on all (+1x base).
 * - Loss 5: 3 blocks (18 numbers). Bet = 5x base unit on all (+1x base).
 * - Loss 6: 3 blocks (18 numbers). Bet = 10x base unit on all (double up).
 * - Loss 7+: 3 blocks (18 numbers). Bet = 15x base unit on all (+5x base). Continues adding +5x per subsequent loss.
 * 
 * The Goal:
 * - To hit a clustered straight-up number within a growing coverage area, utilizing an aggressive, staggered positive-loss progression targeting statistically hot zones.
 * - Stops or resets implicitly when a new peak bankroll is secured or bankroll is depleted.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the predefined 6-number paths based on the strategy rules
    const paths = [
        // Path 0: Top Left Start
        [[1, 2, 4, 5, 7, 8], [11, 12, 14, 15, 17, 18], [19, 20, 22, 23, 25, 26]],
        // Path 1: Top Right Start
        [[2, 3, 5, 6, 8, 9], [10, 11, 13, 14, 16, 17], [20, 21, 23, 24, 26, 27]],
        // Path 2: Bottom Left Start
        [[28, 29, 31, 32, 34, 35], [20, 21, 23, 24, 26, 27], [10, 11, 13, 14, 16, 17]],
        // Path 3: Bottom Right Start
        [[29, 30, 32, 33, 35, 36], [19, 20, 22, 23, 25, 26], [11, 12, 14, 15, 17, 18]]
    ];

    // Helper function to determine the best path based on the last 37 spins
    const getBestPathIndex = () => {
        if (spinHistory.length < 37) {
            return Math.floor(Math.random() * paths.length);
        }

        const last37Spins = spinHistory.slice(-37);
        const hitCounts = {};
        
        // Count frequencies of numbers in the last 37 spins
        last37Spins.forEach(spin => {
            hitCounts[spin.winningNumber] = (hitCounts[spin.winningNumber] || 0) + 1;
        });

        let maxHits = -1;
        let bestIndices = [];

        // Evaluate each path based on the sum of hits across its full 18-number coverage
        paths.forEach((path, index) => {
            const fullPathNumbers = [...path[0], ...path[1], ...path[2]];
            const totalHits = fullPathNumbers.reduce((sum, num) => sum + (hitCounts[num] || 0), 0);

            if (totalHits > maxHits) {
                maxHits = totalHits;
                bestIndices = [index];
            } else if (totalHits === maxHits) {
                bestIndices.push(index);
            }
        });

        // Return a random choice among tied best paths
        return bestIndices[Math.floor(Math.random() * bestIndices.length)];
    };

    // 2. Initialize or Update State
    if (typeof state.lossCount === 'undefined') {
        state.lossCount = 0;
        state.currentPathIndex = getBestPathIndex();
        state.activeNumbers = [];
        state.peakBankroll = bankroll; // Track peak bankroll for session profit calculation
    }

    // 3. Process Previous Spin Result
    if (spinHistory.length > 0 && state.activeNumbers.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1].winningNumber;
        const won = state.activeNumbers.includes(lastResult);

        if (won) {
            const isSessionProfit = bankroll >= state.peakBankroll;
            
            if (!isSessionProfit) {
                // On win, if not at peak bankroll: reduce 1 level downwards
                state.lossCount = Math.max(0, state.lossCount - 1);
            } else {
                // On win, if at peak bankroll: reset and pick optimal hot-number path
                state.lossCount = 0;
                state.currentPathIndex = getBestPathIndex();
            }
        } else {
            // On loss, increment sequence
            state.lossCount++;
        }
    }

    // Update peak bankroll tracking
    state.peakBankroll = Math.max(state.peakBankroll, bankroll);

    // 4. Determine Active Blocks
    const currentPath = paths[state.currentPathIndex];
    let numBlocks = 1;
    if (state.lossCount === 1) numBlocks = 2;
    if (state.lossCount >= 2) numBlocks = 3;

    state.activeNumbers = [];
    for (let i = 0; i < numBlocks; i++) {
        state.activeNumbers.push(...currentPath[i]);
    }

    // 5. Calculate Base Multiplier Progression
    let multiplier = 1;
    switch (state.lossCount) {
        case 0: multiplier = 1; break;
        case 1: multiplier = 1; break;
        case 2: multiplier = 2; break; // Double up
        case 3: multiplier = 3; break; // +1 base
        case 4: multiplier = 4; break; // +1 base
        case 5: multiplier = 5; break; // +1 base
        case 6: multiplier = 10; break; // Double up
        default:
            multiplier = 15 + ((state.lossCount - 7) * 5); // +5 base starting at 7th loss
            break;
    }

    // 6. Calculate and Clamp Bet Amount
    const baseUnit = config.betLimits.min; 
    let amount = baseUnit * multiplier;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 7. Construct Bets
    const bets = state.activeNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: amount
    }));

    // 8. Bankroll Management
    const totalCost = bets.reduce((sum, bet) => sum + bet.amount, 0);
    if (totalCost > bankroll) {
        // If insufficient funds for full spread, place what we can afford
        let safeBets = [];
        let spent = 0;
        for (let bet of bets) {
            if (spent + bet.amount <= bankroll) {
                safeBets.push(bet);
                spent += bet.amount;
            } else {
                break;
            }
        }
        return safeBets.length > 0 ? safeBets : [];
    }

    return bets;
}