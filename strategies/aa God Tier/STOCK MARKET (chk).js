/**
 * STOCK MARKET STRATEGY (Amended - Strict Street Separation)
 * 
 * Source: "STOP GAMBLING. START TRADING. (The Stock Market Strategy)" by The Lucky Felt 
 * URL: https://youtu.be/tUksXa0-IZA?si=g08FZvUynu9Lt8kp
 * 
 * The Logic: 
 * The table is divided into 6 double streets (Block 1: 1-6, Block 2: 7-12, etc.).
 * Within the current double street, we place one split bet (adjacent numbers in the same street, e.g., 1/2 or 2/3) 
 * and one single number. The single number MUST be in the opposite street from the split bet 
 * (e.g., if split is in Street 1 [1-3], the single number must be in Street 2 [4-6]).
 * 
 * The Progression:
 * 1. Base bet is 1 unit on the single number, 2 units on the vertical split.
 * 2. On a loss, we REBET all previous active positions AND place a new single/split on the next double street.
 * 3. On reaching the last block (Block 6: streets 31-36), we trigger a "Merger" and double the current bet amounts for all active positions.
 * 4. If we lose on the final block, we restart the positional sequence at Block 1, clear all accumulated bets, but increase the base bet multiplier by 5x.
 * 
 * The Goal (Reset Protocol):
 * The goal is to achieve a new high watermark in the overall session bankroll. 
 * If a spin results in the bankroll exceeding the previously recorded high watermark, 
 * the entire progression resets: clear accumulated bets, drop to Block 1, return to 1x multiplier.
 * If we win but do not break the high watermark, we restart the positional sequence at Block 1, clear the board, but keep the current multiplier.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    if (!state.initialized) {
        state.initialized = true;
        state.highWatermark = bankroll;
        state.currentBlock = 1;     
        state.baseMultiplier = 1;   
        state.lastBankroll = bankroll;
        state.activePositions = []; 
    }

    // 2. Process the Result of the Last Spin
    if (spinHistory.length > 0) {
        if (bankroll > state.highWatermark) {
            // New Session High! Full Reset Protocol.
            state.highWatermark = bankroll;
            state.currentBlock = 1;
            state.baseMultiplier = 1;
            state.activePositions = []; 
        } else if (bankroll < state.lastBankroll) {
            // Loss Protocol
            if (state.currentBlock === 6) {
                // Lost on the last double street. 
                state.baseMultiplier *= 5;
                state.currentBlock = 1;
                state.activePositions = [];
            } else {
                // Shift to the next double street, accumulating bets.
                state.currentBlock++;
            }
        } else {
            // Win, but no new high watermark (grinding out of a hole).
            state.currentBlock = 1;
            state.activePositions = [];
        }
    }

    state.lastBankroll = bankroll;

    // 3. Determine the NEW Bet Numbers for the Current Block
    // Block 1: 1-6 | Block 2: 7-12 | Block 3: 13-18 | Block 4: 19-24 | Block 5: 25-30 | Block 6: 31-36
    const startNum = (state.currentBlock - 1) * 6 + 1;
    
    // Define the two individual streets within this double street block
    const street1 = [startNum, startNum + 1, startNum + 2];
    const street2 = [startNum + 3, startNum + 4, startNum + 5];

    // Allowed "vertical" splits (adjacent numbers within the same street)
    const splitsStreet1 = [ [street1[0], street1[1]], [street1[1], street1[2]] ];
    const splitsStreet2 = [ [street2[0], street2[1]], [street2[1], street2[2]] ];

    let selectedSplit;
    let selectedSingle;

    // Randomly decide which street gets the split bet
    if (Math.random() < 0.5) {
        // Put the split in Street 1, which means the single MUST go in Street 2
        selectedSplit = splitsStreet1[Math.floor(Math.random() * splitsStreet1.length)];
        selectedSingle = street2[Math.floor(Math.random() * street2.length)];
    } else {
        // Put the split in Street 2, which means the single MUST go in Street 1
        selectedSplit = splitsStreet2[Math.floor(Math.random() * splitsStreet2.length)];
        selectedSingle = street1[Math.floor(Math.random() * street1.length)];
    }

    // Add the newly selected positions for this block to our running list
    state.activePositions.push({ type: 'number', value: selectedSingle, baseUnits: 1 });
    state.activePositions.push({ type: 'split', value: selectedSplit, baseUnits: 2 });

    // 4. Calculate Final Bet Amounts for ALL active positions
    const baseUnit = config.betLimits.min;
    const finalBets = [];

    for (let pos of state.activePositions) {
        let amount = pos.baseUnits * baseUnit * state.baseMultiplier;

        // "on placing bets on the last 2 adjacent streets, double up all bets"
        if (state.currentBlock === 6) {
            amount *= 2;
        }

        // 5. Clamp to Table Limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        finalBets.push({
            type: pos.type,
            value: pos.value,
            amount: amount
        });
    }

    // 6. Return the accumulated Bets
    return finalBets;
}