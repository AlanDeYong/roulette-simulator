/**
 * Strategy Name: Jack Your Stacks
 * Source: https://youtu.be/ClTocGGiEIU (CEG Dealer School)
 * 
 * Logic:
 * - This strategy dynamically targets one random dozen along with two random 
 *   overlapping corner bets completely enclosed within that designated dozen.
 * - To simulate the player "moving around", a new random dozen and corner set 
 *   are selected on every single spin.
 * 
 * Progression:
 * - Level 1: Dozen (2x base), Corner 1 (1x base), Corner 2 (1x base). Triggers Level 2 after 3 losses.
 * - Level 2: Dozen (4x base), Corner 1 (2x base), Corner 2 (2x base). Triggers Level 3 after 2 losses.
 * - Level 3: Dozen (6x base), Corner 1 (3x base), Corner 2 (3x base). This is the absolute ceiling.
 * - On any win that brings the session bankroll to or above its historical peak, the progression resets to Level 1.
 * 
 * Goal:
 * - Target profit of +$300 to $400 or until bankroll is depleted.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Session Peak and State Variables
    if (state.peakProfit === undefined) {
        state.peakProfit = config.startingBankroll;
        state.currentLevel = 1;
        state.lossCount = 0;
    }

    // 2. Track Session Profit Peak & Handle Reset Logic
    if (bankroll > state.peakProfit) {
        state.peakProfit = bankroll;
        state.currentLevel = 1;
        state.lossCount = 0;
    }

    // 3. Process Last Spin Result to Update Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Determine if the last spin was a win for our specific placements
        let wonDozen = false;
        let wonCorner = false;

        if (state.lastDozen === 1 && lastNumber >= 1 && lastNumber <= 12) wonDozen = true;
        if (state.lastDozen === 2 && lastNumber >= 13 && lastNumber <= 24) wonDozen = true;
        if (state.lastDozen === 3 && lastNumber >= 25 && lastNumber <= 36) wonDozen = true;

        if (state.lastCorners && state.lastCorners.length === 2) {
            state.lastCorners.forEach(cornerRowStart => {
                // A corner covers: n, n+1, n+3, n+4
                const covered = [cornerRowStart, cornerRowStart + 1, cornerRowStart + 3, cornerRowStart + 4];
                if (covered.includes(lastNumber)) wonCorner = true;
            });
        }

        if (wonDozen || wonCorner) {
            // Check if we recovered back to profit territory
            if (bankroll >= state.peakProfit) {
                state.currentLevel = 1;
                state.lossCount = 0;
            }
        } else {
            // Lost the round
            state.lossCount++;
            if (state.currentLevel === 1 && state.lossCount >= 3) {
                state.currentLevel = 2;
                state.lossCount = 0;
            } else if (state.currentLevel === 2 && state.lossCount >= 2) {
                state.currentLevel = 3;
                state.lossCount = 0;
            }
        }
    }

    // 4. Set Base Units and Progression Multipliers
    const baseInside = config.betLimits.min;
    const baseOutside = config.betLimits.minOutside;

    let levelMultiplier = 1;
    if (state.currentLevel === 2) levelMultiplier = 2;
    if (state.currentLevel === 3) levelMultiplier = 3;

    // Calculate amounts ensuring table limit compatibility
    let dozenAmount = Math.min(Math.max(baseOutside * 2 * levelMultiplier, config.betLimits.minOutside), config.betLimits.max);
    let cornerAmount = Math.min(Math.max(baseInside * levelMultiplier, config.betLimits.min), config.betLimits.max);

    // Stop placing bets if target profit reached
    if (bankroll >= config.startingBankroll + 400) {
        return [];
    }

    // 5. Select a Random Dozen and Two Valid Internal Corners
    const dozenChoice = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    let validCornerLefts = [];

    if (dozenChoice === 1) {
        validCornerLefts = [1, 2, 4, 5, 7, 8];
    } else if (dozenChoice === 2) {
        validCornerLefts = [13, 14, 16, 17, 19, 20];
    } else {
        validCornerLefts = [25, 26, 28, 29, 31, 32];
    }

    // Shuffle and pick 2 distinct corner origins
    validCornerLefts.sort(() => Math.random() - 0.5);
    const selectedCorners = [validCornerLefts[0], validCornerLefts[1]];

    // Persist current selections to state for the next spin evaluation
    state.lastDozen = dozenChoice;
    state.lastCorners = selectedCorners;

    // 6. Build and Return the Final Bet Payload
    return [
        { type: 'dozen', value: dozenChoice, amount: dozenAmount },
        { type: 'corner', value: selectedCorners[0], amount: cornerAmount },
        { type: 'corner', value: selectedCorners[1], amount: cornerAmount }
    ];
}