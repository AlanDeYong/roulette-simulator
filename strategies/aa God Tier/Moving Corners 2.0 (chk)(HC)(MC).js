/**
 * Modified Moving Corners 2.0 Roulette Strategy (Hot/Cold Optimization)
 * Source: Gamblers University - https://youtu.be/SaI1sOzOWpY
 *
 * The Full Logic in details:
 * - The strategy waits until at least 37 spins are available in `spinHistory` to track hot/cold numbers.
 * - Directional Trigger: The very first spin determines the starting side. If it's Small (1-18), we target the Right side (19-36). If Large (19-36), we target the Left side (1-18).
 * - Layout Selection: Instead of random selection, the 6 non-overlapping zones are scored based on the frequency of their numbers in the past 37 spins (Hot Numbers).
 * - The zones on the prioritized side are sorted by hotness (highest total frequency first).
 * - Within each chosen zone, the corner with the higher hotness score is selected.
 * - Within that corner, the split with the highest hotness score is selected.
 * - Once placements are selected, they remain locked until a win resets the session.
 *
 * The Full Bet Progression in details:
 * - Level 0: 3 Blocks are placed using the base unit.
 * - After a Win (Net Profit > 0): Progression resets. The strategy enters a 1-spin WAITING state, using the past 37 spins to recalculate hot zones and the next spin to determine the new side.
 * - After a Minor Loss: Stay at the current level with identical placements.
 * - After a Total Loss: Move up 1 level, keep existing placements, select the next hottest available zone, and double all bet amounts.
 *
 * The Goal:
 * Target session profit of $75. Once reached, betting stops.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;

    // 1. Initialize State
    if (state.status === undefined) {
        state.status = 'WAITING'; 
        state.level = 0;
        state.startingBankroll = bankroll;
        state.placements = [];
        state.zonePool = [];
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
    }

    // 2. Check Win Goal
    const winGoal = 75000;
    if (bankroll >= state.startingBankroll + winGoal) {
        return [];
    }

    // 3. Process Previous Spin Outcome
    if (state.status === 'BETTING' && spinHistory.length > 0 && state.lastTotalBet > 0) {
        const netWin = bankroll - state.lastBankroll;

        if (netWin > 0) {
            state.status = 'WAITING';
            state.level = 0;
            state.placements = [];
        } else if (netWin <= -state.lastTotalBet) {
            state.level++;
        }
    }

    // 4. Handle Waiting State & Hot/Cold Analysis
    if (state.status === 'WAITING') {
        // Must have at least 37 spins to track frequencies accurately
        if (spinHistory.length < 37) {
            state.lastBankroll = bankroll;
            return []; 
        }

        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        if (lastSpin === 0 || lastSpin === 37) {
            state.lastBankroll = bankroll;
            return [];
        }

        // Determine left/right priority based on the triggering spin
        const isSmall = lastSpin >= 1 && lastSpin <= 18;
        const prioritizedSide = isSmall ? 'right' : 'left';

        state.status = 'BETTING';
        state.level = 0;

        // Calculate frequency of each number in the last 37 spins
        const frequencies = Array(38).fill(0);
        const lookback = spinHistory.slice(-37);
        for (let spin of lookback) {
            frequencies[spin.winningNumber]++;
        }

        // Define Helper scoring functions
        const getNumScore = (num) => frequencies[num] || 0;
        const getArrayScore = (arr) => arr.reduce((sum, n) => sum + getNumScore(n), 0);

        // Define 6 non-overlapping 2x3 zones
        // Zone 0: 1-6, Zone 1: 7-12, Zone 2: 13-18, Zone 3: 19-24, Zone 4: 25-30, Zone 5: 31-36
        const zones = [
            { id: 0, side: 'left',  nums: [1,2,3,4,5,6] },
            { id: 1, side: 'left',  nums: [7,8,9,10,11,12] },
            { id: 2, side: 'left',  nums: [13,14,15,16,17,18] },
            { id: 3, side: 'right', nums: [19,20,21,22,23,24] },
            { id: 4, side: 'right', nums: [25,26,27,28,29,30] },
            { id: 5, side: 'right', nums: [31,32,33,34,35,36] }
        ];

        // Score all zones
        zones.forEach(z => z.score = getArrayScore(z.nums));

        // Separate and sort by hotness (descending order)
        const leftSorted = zones.filter(z => z.side === 'left').sort((a, b) => b.score - a.score);
        const rightSorted = zones.filter(z => z.side === 'right').sort((a, b) => b.score - a.score);

        // Build the zone queue prioritizing the chosen side
        const sortedZones = prioritizedSide === 'right' ? [...rightSorted, ...leftSorted] : [...leftSorted, ...rightSorted];
        
        // Save the ordered zone IDs into state pool
        state.zonePool = sortedZones.map(z => z.id);
        state.frequencies = frequencies; // Store frequencies to rank internal corners/splits dynamically
    }

    // 5. Generate Placements using Hot/Cold Data
    const maxBlocks = 6;
    let targetBlocks = 3 + state.level;
    if (targetBlocks > maxBlocks) targetBlocks = maxBlocks;

    const freqs = state.frequencies || Array(38).fill(0);
    const getNumScore = (num) => freqs[num] || 0;

    while (state.placements.length < targetBlocks && state.zonePool.length > 0) {
        const zoneIdx = state.zonePool.shift();
        const cornerStart = (zoneIdx * 6) + 1;

        // Form the 2 possible corners in this zone
        const corner1Nums = [cornerStart, cornerStart + 1, cornerStart + 3, cornerStart + 4];
        const corner2Nums = [cornerStart + 1, cornerStart + 2, cornerStart + 4, cornerStart + 5];

        const scoreC1 = corner1Nums.reduce((sum, n) => sum + getNumScore(n), 0);
        const scoreC2 = corner2Nums.reduce((sum, n) => sum + getNumScore(n), 0);

        // Select the hotter corner
        const selectedCorner = scoreC1 >= scoreC2 ? cornerStart : cornerStart + 1;
        const c = selectedCorner;

        // Form the 4 valid internal splits for the selected corner
        const splitOptions = [
            { val: [c, c + 1],     nums: [c, c + 1] },     // Horizontal Top
            { val: [c + 3, c + 4], nums: [c + 3, c + 4] }, // Horizontal Bottom
            { val: [c, c + 3],     nums: [c, c + 3] },     // Vertical Left
            { val: [c + 1, c + 4], nums: [c + 1, c + 4] }  // Vertical Right
        ];

        // Sort splits inside the corner by their hotness score
        splitOptions.forEach(s => s.score = s.nums.reduce((sum, n) => sum + getNumScore(n), 0));
        splitOptions.sort((a, b) => b.score - a.score);

        state.placements.push({
            corner: selectedCorner,
            split: splitOptions[0].val
        });
    }

    // 6. Calculate Bet Amount
    const multiplier = Math.pow(2, state.level);
    let amount = unit * multiplier;

    // Clamp limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 7. Construct Bet Array
    let bets = [];
    for (let p of state.placements) {
        bets.push({ type: 'corner', value: p.corner, amount: amount });
        bets.push({ type: 'split', value: p.split, amount: amount });
    }

    // 8. Track values for next progression evaluation
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    state.lastBankroll = bankroll;

    return bets;
}