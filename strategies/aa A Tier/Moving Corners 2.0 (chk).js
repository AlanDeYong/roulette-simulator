/**
 * Modified Moving Corners 2.0 Roulette Strategy
 * Source: Gamblers University - https://youtu.be/SaI1sOzOWpY
 * Modified by User Request: Dynamic tracking, random non-overlapping placements, specific split selection.
 *
 * The Full Logic in details:
 * - The strategy waits out the very first spin (or first spin after a win/reset) to determine board direction.
 * - If the waiting spin is a small number (1-18), it targets the Right side of the board (19-36).
 * - If the waiting spin is a large number (19-36), it targets the Left side of the board (1-18).
 * - The board is divided into 6 non-overlapping 2x3 zones. Placements are randomly pulled from the prioritized side first.
 * - Each placement consists of exactly 1 Corner bet and 1 randomly selected Split bet *inside* that specific corner (horizontal or vertical).
 * - Once randomly generated and placed, these specific corner and split combinations remain locked in place until a reset.
 *
 * The Full Bet Progression in details:
 * - Level 0: 3 Blocks are placed (3 corners, 3 splits) on the target side. Base unit used.
 * - After a Win (Net Profit > 0): Progression and placements reset. Strategy waits 1 spin to re-establish direction.
 * - After a Minor Loss (Hit corner, Net Profit < 0 but > -TotalBet): Stay at the current level, keep identical placements.
 * - After a Total Loss: Increase level by 1. Keep previous placements, randomly add 1 NEW block (up to 6 max), and double the bet size on everything.
 *
 * The Goal:
 * Target session profit of $75. Once reached, betting stops.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit & Initialize State
    const unit = config.betLimits.min;

    if (state.status === undefined) {
        state.status = 'WAITING'; // States: 'WAITING' or 'BETTING'
        state.level = 0;
        state.startingBankroll = bankroll;
        state.placements = [];
        state.zonePool = [];
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
    }

    // 2. Check Goal
    const winGoal = 75000;
    if (bankroll >= state.startingBankroll + winGoal) {
        return []; // Target profit reached
    }

    // 3. Process Previous Spin Outcome (If we were betting)
    if (state.status === 'BETTING' && spinHistory.length > 0 && state.lastTotalBet > 0) {
        const netWin = bankroll - state.lastBankroll;

        if (netWin > 0) {
            // Win - Reset progression and return to waiting state for new direction
            state.status = 'WAITING';
            state.level = 0;
            state.placements = [];
        } else if (netWin <= -state.lastTotalBet) {
            // Total Loss - Move up progression
            state.level++;
        }
        // Minor Loss (netWin < 0 but > -lastTotalBet) -> do nothing, level stays the same
    }

    // 4. Handle Waiting State (Skip first spin or spin after reset)
    if (state.status === 'WAITING') {
        if (spinHistory.length === 0) {
            state.lastBankroll = bankroll;
            return []; // Skip the very first spin of the session
        }

        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // If 0 hits while waiting, keep waiting to get a clear 1-18 or 19-36 signal
        if (lastSpin === 0 || lastSpin === 37) {
            state.lastBankroll = bankroll;
            return [];
        }

        // Determine Direction
        const isSmall = lastSpin >= 1 && lastSpin <= 18;
        const direction = isSmall ? 'right' : 'left';
        
        state.status = 'BETTING';
        state.level = 0;

        // Define the 6 non-overlapping 2x3 zones on the board (0 to 5)
        // Left Zones: 0 (1-6), 1 (7-12), 2 (13-18)
        // Right Zones: 3 (19-24), 4 (25-30), 5 (31-36)
        const leftZones = [0, 1, 2];
        const rightZones = [3, 4, 5];

        // Helper to shuffle an array
        const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

        // Prioritize zones based on the direction. If we need more than 3 blocks later, 
        // we pull from the opposite side.
        if (direction === 'right') {
            state.zonePool = [...shuffle(rightZones), ...shuffle(leftZones)];
        } else {
            state.zonePool = [...shuffle(leftZones), ...shuffle(rightZones)];
        }
    }

    // 5. Generate Placements (Locks in randomly selected blocks)
    const maxBlocks = 6;
    let targetBlocks = 3 + state.level;
    if (targetBlocks > maxBlocks) targetBlocks = maxBlocks;

    // Add new non-overlapping placements if we leveled up (or initialization)
    while (state.placements.length < targetBlocks && state.zonePool.length > 0) {
        const zoneIdx = state.zonePool.shift(); 
        
        // Each zone has 2 possible top-left corners to choose from
        // Example: Zone 0 (nums 1-6) has Corner 1 and Corner 2
        const cornerStart = (zoneIdx * 6) + 1;
        const cornerOptions = [cornerStart, cornerStart + 1];
        const selectedCorner = cornerOptions[Math.floor(Math.random() * 2)];
        
        // Determine the 4 internal split combinations for the chosen corner
        const c = selectedCorner;
        const splitOptions = [
            [c, c + 1],     // Horizontal Top
            [c + 3, c + 4], // Horizontal Bottom
            [c, c + 3],     // Vertical Left
            [c + 1, c + 4]  // Vertical Right
        ];
        const selectedSplit = splitOptions[Math.floor(Math.random() * 4)];
        
        state.placements.push({
            corner: selectedCorner,
            split: selectedSplit
        });
    }

    // 6. Calculate Bet Amount
    const multiplier = Math.pow(2, state.level);
    let amount = unit * multiplier;

    // CLAMP TO LIMITS
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 7. Place the Bets
    let bets = [];
    for (let p of state.placements) {
        bets.push({ type: 'corner', value: p.corner, amount: amount });
        bets.push({ type: 'split', value: p.split, amount: amount });
    }

    // 8. Update state for the next spin evaluation
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    state.lastBankroll = bankroll;

    return bets;
}