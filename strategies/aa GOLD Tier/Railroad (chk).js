/**
 * Railroad Roulette Strategy (Corrected: Partner Corner Progression)
 * 
 * Source: The Roulette Master (https://youtu.be/XPTFXpAIQqA)
 * 
 * The Full Logic in details:
 * - Covers 30 numbers using 5 Double Streets.
 * - The Double Street containing the last hit number is left out.
 * - Each covered Double Street uses TWO overlapping corner bets.
 *   (e.g., Double Street 1-6 uses Corner 1 and Corner 2).
 * - This creates a total of 10 active corner bets initially.
 * 
 * The Full Bet Progression in details:
 * - Base Bet: 1 unit per corner.
 * - On a Hit (a corner wins):
 *   - If session peak profit is not reached, the winning corner is removed.
 *   - If the other corner in that same Double Street (its "partner") is still 
 *     active on the board, that partner corner's bet is increased by its base bet amount.
 * - On a Total Loss (no corners win):
 *   - 1 unit is added to ALL currently active corners on the board.
 * 
 * The Goal:
 * - Whenever the bankroll hits a new peak (session profit), or all bets are 
 *   cleared, the entire progression resets back to the base setup of 5 Double 
 *   Streets (10 corners).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.minIncrementalBet || config.betLimits.min;

    // 2. Initialize State & High Watermark
    if (!state.initialized) {
        state.highestBankroll = bankroll;
        state.initialized = true;
        state.reset = true;
    }

    // 3. Check for Session Profit (Reset Condition)
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
        state.reset = true;
    }

    // 4. Helper to determine if a specific corner was hit
    // A corner with top-left value 'v' covers [v, v+1, v+3, v+4]
    const isCornerHit = (cornerValue, num) => {
        if (num === 0) return false; // Zero doesn't hit standard corners
        return num === cornerValue || 
               num === cornerValue + 1 || 
               num === cornerValue + 3 || 
               num === cornerValue + 4;
    };

    // 5. Process Previous Spin (Progression logic)
    if (!state.reset && state.activeCorners && spinHistory.length > 0) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        
        let winningCorners = [];
        let losingCorners = [];

        // Identify which corners won and which lost
        for (let betObj of state.activeCorners) {
            if (isCornerHit(betObj.value, lastNum)) {
                winningCorners.push(betObj);
            } else {
                losingCorners.push(betObj);
            }
        }

        if (winningCorners.length > 0) {
            // HIT: Remove winning corners (they aren't added back to state)
            state.activeCorners = losingCorners;
            
            // For each winning corner, check if its partner (same dsBase) remained
            for (let wonBet of winningCorners) {
                let partner = state.activeCorners.find(b => b.dsBase === wonBet.dsBase);
                if (partner) {
                    partner.units += 1; // Increase partner by base bet amount (1 unit)
                }
            }

            // If all corners are cleared, reset
            if (state.activeCorners.length === 0) {
                state.reset = true;
            }
        } else {
            // TOTAL LOSS: Increase all active corners by 1 unit
            for (let betObj of state.activeCorners) {
                betObj.units += 1;
            }
        }
    }

    // 6. Setup New Board if Resetting
    if (state.reset) {
        state.reset = false;
        
        // Determine which Double Street base to leave out
        let leaveOutBase = 31; // Default to 6th double street if no history
        if (spinHistory.length > 0) {
            const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            if (lastNum !== 0) {
                // Calculate the starting number of the double street (1, 7, 13, 19, 25, or 31)
                leaveOutBase = Math.floor((lastNum - 1) / 6) * 6 + 1;
            }
        }
        
        state.activeCorners = [];
        const allBases = [1, 7, 13, 19, 25, 31];
        
        // Create the 10 active corners
        for (let dsBase of allBases) {
            if (dsBase !== leaveOutBase) {
                // Track both the specific corner value and the double street it belongs to (dsBase)
                state.activeCorners.push({ value: dsBase, dsBase: dsBase, units: 1 });
                state.activeCorners.push({ value: dsBase + 1, dsBase: dsBase, units: 1 });
            }
        }
    }

    // 7. Generate Bets & Clamp to Limits
    let betsToPlace = [];
    
    for (let betObj of state.activeCorners) {
        let amount = betObj.units * unit;
        
        // Clamp to min/max
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        betsToPlace.push({ type: 'corner', value: betObj.value, amount: amount });
        
        // Sync internal state to clamped values to prevent runaway math
        betObj.units = amount / unit;
    }

    return betsToPlace;
}