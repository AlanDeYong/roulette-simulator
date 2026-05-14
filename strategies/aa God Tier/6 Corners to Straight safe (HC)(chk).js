/**
 * 6 Corners to Straight Roulette Strategy (D'Alembert Variant)
 * * Source: [User Provided Concept / Generic Strategy Adaptation]
 * * The Logic:
 * Wait for 37 spins to gather data. The board is divided into 6 mutually exclusive 2-row blocks. 
 * The single hottest corner from each of these 6 blocks is selected to guarantee exactly 6 non-overlapping 
 * corners. Initial bets are placed on these.
 * * The Progression:
 * - Corner base unit is exactly 4. Straight bet base unit is 1.
 * - On a net loss: Increase the base multiplier by 1 (e.g., Corner bet goes 4 -> 8 -> 12).
 * - On a net win (while in recovery): Reduce the base multiplier by 1 (minimum 0).
 * - On hitting a corner AFTER a loss: Convert that specific winning corner into 3 straight bets. 
 * The straight bet amount is the corner bet amount / 4. Maximum 3 corners converted.
 * * The Goal:
 * When in recovery mode, aim for a target bankroll of $20 more than the last peak bankroll.
 * Once reached, reset the progression, RE-ANALYZE the immediate past 37 spins, find the new 
 * hottest corners, and return to the base bet size.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for 37 spins to gather data
    if (spinHistory.length < 37) {
        return [];
    }

    // 2. Initialize State
    if (!state.initialized) {
        state.peakBankroll = bankroll;
        state.targetBankroll = bankroll;
        state.mode = 'base'; // 'base' or 'recovery'
        state.addedUnits = 0; // Tracks the progression increases/decreases
        state.activeCorners = []; 
        state.lastBankroll = bankroll;
        state.initialized = true;
    }

    // Helper: Get numbers in a corner given its top-left number
    const getCornerNumbers = (c) => [c, c + 1, c + 3, c + 4];

    // 3. Evaluate previous spin
    if (state.activeCorners.length > 0) {
        const netProfit = bankroll - state.lastBankroll;
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;

        if (netProfit < 0) {
            // Loss: Increase multiplier, enter recovery if not already
            if (state.mode === 'base') {
                state.mode = 'recovery';
                state.targetBankroll = state.peakBankroll + 20;
            }
            state.addedUnits += 1; 
        } else if (netProfit > 0) {
            // Win
            if (state.mode === 'recovery') {
                if (bankroll >= state.targetBankroll) {
                    // Reached recovery target! Reset strategy to trigger a fresh 37-spin analysis
                    state.activeCorners = []; 
                } else {
                    // Won, but still in recovery. 
                    
                    // NEW REQUIREMENT: Reduce bet level by 1, bottoming out at 0 (base level)
                    state.addedUnits = Math.max(0, state.addedUnits - 1);

                    // Check for corner conversion
                    const convertedCount = state.activeCorners.filter(c => c.isConverted).length;
                    
                    if (convertedCount < 3) {
                        for (let i = 0; i < state.activeCorners.length; i++) {
                            let corner = state.activeCorners[i];
                            if (!corner.isConverted) {
                                const cornerNums = getCornerNumbers(corner.topLeft);
                                if (cornerNums.includes(lastSpin)) {
                                    // Hit an unconverted corner! Convert it.
                                    corner.isConverted = true;
                                    corner.convertedNums = cornerNums.filter(n => n !== lastSpin);
                                    break; // Only convert the one that hit
                                }
                            }
                        }
                    }
                }
            } else {
                // Won in base mode. Update peak bankroll.
                state.peakBankroll = Math.max(state.peakBankroll, bankroll);
                state.targetBankroll = state.peakBankroll;
            }
        }
    }

    // Update Peak if in base mode just in case
    if (state.mode === 'base') {
        state.peakBankroll = Math.max(state.peakBankroll, bankroll);
    }

    // 4. Calculate Hottest Corners if a reset triggered
    if (state.activeCorners.length === 0) {
        state.mode = 'base';
        state.addedUnits = 0;
        state.targetBankroll = state.peakBankroll;

        // Immediately grab the latest 37 spins directly prior to placing the next bets.
        const last37 = spinHistory.slice(-37).map(s => s.winningNumber);
        
        // Count frequencies
        const freqs = {};
        for (let i = 0; i <= 36; i++) freqs[i] = 0;
        last37.forEach(num => freqs[num]++);

        // To GUARANTEE exactly 6 non-overlapping corners, they must exclusively occupy 
        // these 6 distinct row pairs on the board. (e.g. Block 1 is Rows 1-2).
        const blocks = [
            [1, 2],    // Rows 1-2
            [7, 8],    // Rows 3-4
            [13, 14],  // Rows 5-6
            [19, 20],  // Rows 7-8
            [25, 26],  // Rows 9-10
            [31, 32]   // Rows 11-12
        ];
        
        state.activeCorners = [];

        // Pick the single hottest corner from each block
        blocks.forEach(block => {
            const heat0 = getCornerNumbers(block[0]).reduce((sum, n) => sum + freqs[n], 0);
            const heat1 = getCornerNumbers(block[1]).reduce((sum, n) => sum + freqs[n], 0);
            
            const bestTopLeft = heat1 > heat0 ? block[1] : block[0];
            
            state.activeCorners.push({
                topLeft: bestTopLeft,
                isConverted: false,
                convertedNums: []
            });
        });
    }

    // 5. Generate Bets with Unit Logic: 4 -> 8 -> 12... (and 12 -> 8 -> 4 on win)
    const CORNER_BASE_UNIT = 4;
    
    // Calculates: 4 + (addedUnits * 4)
    let rawCornerBet = CORNER_BASE_UNIT + (state.addedUnits * CORNER_BASE_UNIT);
    // Calculates: rawCornerBet / 4
    let rawStraightBet = Math.floor(rawCornerBet / 4);

    // CLAMP TO LIMITS: Ensure the raw units do not violate simulator limits
    let finalCornerBet = Math.max(config.betLimits.min, Math.min(config.betLimits.max, rawCornerBet));
    let finalStraightBet = Math.max(config.betLimits.min, Math.min(config.betLimits.max, rawStraightBet));

    let bets = [];
    state.activeCorners.forEach(corner => {
        if (corner.isConverted) {
            // Place 3 straight bets
            corner.convertedNums.forEach(num => {
                bets.push({ type: 'number', value: num, amount: finalStraightBet });
            });
        } else {
            // Place standard corner bet
            bets.push({ type: 'corner', value: corner.topLeft, amount: finalCornerBet });
        }
    });

    // 6. Save bankroll for next turn evaluation
    state.lastBankroll = bankroll;

    return bets;
}