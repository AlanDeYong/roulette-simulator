/**
 * Source: https://youtu.be/xG4LhnsODcA
 * Channel Name: WillVegas
 * * * Modified Logic of the 3-1-1 Roulette Strategy (Base Incremental Progression):
 * ---------------------------------------------------------------------------
 * - Every spin, the player places three bets:
 * 1. Red (Outside Bet): Base weight of 3 units.
 * 2. Line 16 (Double Street covering 16-21): Base weight of 1 unit. Permanent anchor placement.
 * 3. Dynamic Line (Double Street): Base weight of 1 unit. Placed on the double street of the last winning number.
 * * * Dynamic Placement Rules:
 * - One double street remains permanently fixed on the 16-21 line (value: 16).
 * - The other double street tracks the last winning double street (value: 1, 4, 7, 10, 13, 22, 25, 28, 31, or 34).
 * - EXCEPTION: If the winning number lands inside the permanent 16-21 double street, or lands on 0, the dynamic bet placement does not change and stays on its previous position.
 * * * Bet Progression:
 * - On loss (complete miss), all bets increase by their respective base bet amounts.
 * - Red increases by 3 units (using config.betLimits.minOutside) per level.
 * - Each Double Street increases by 1 unit (using config.betLimits.min) per level.
 * - The system stays at the elevated layer until the session is back in net profit relative to its current cycle baseline, at which point it drops back down to Level 1.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to map any winning number to its starting row value for a six-line bet
    function getLineValue(num) {
        if (num === 0) return null;
        return Math.floor((num - 1) / 6) * 6 + 1;
    }

    // 1. Target Objectives / Session Variables Initialization
    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
        state.targetProfit = 30; 
        state.progressionLevel = 1;
        state.dynamicLineValue = 28; // Default initial dynamic choice from original setup
    }

    // Check if target profit has been cleared
    if (bankroll >= state.sessionStartBankroll + state.targetProfit) {
        state.sessionStartBankroll = bankroll;
        state.progressionLevel = 1;
    }

    const permanentLineValue = 16;

    // 2. Track progression and dynamic positioning based on historical performance data
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const color = lastSpin.winningColor;

        const currentLineValue = getLineValue(num);

        // Determine if the last spin was a hit on any of our active coverage options
        const hitPermanentLine = (currentLineValue === permanentLineValue);
        const hitDynamicLine = (currentLineValue === state.dynamicLineValue);
        const hitRed = (color === 'red');

        if (hitRed || hitPermanentLine || hitDynamicLine) {
            // Winning spin occurred. Test if total session recovery is accomplished
            if (bankroll >= state.sessionStartBankroll) {
                state.progressionLevel = 1;
                state.sessionStartBankroll = bankroll; 
            }
        } else {
            // Complete miss / loss scenario -> Advance progression layer up one unit weight
            state.progressionLevel += 1;
        }

        // Update dynamic placement position for the next spin
        if (currentLineValue !== null && currentLineValue !== permanentLineValue) {
            state.dynamicLineValue = currentLineValue;
        }
    }

    // 3. Base units assessment using configured constraints
    const insideUnit = config.betLimits.min;
    const outsideUnit = config.betLimits.minOutside;

    // Base bet configurations (Color Red = 3 units, Double Streets = 1 unit each)
    const baseRed = outsideUnit * 3;
    const basePermanentLine = insideUnit * 1;
    const baseDynamicLine = insideUnit * 1;

    // 4. Calculate customized bet sizes scaling by base bet amounts per progression level
    let redAmount = baseRed * state.progressionLevel;
    let permanentLineAmount = basePermanentLine * state.progressionLevel;
    let dynamicLineAmount = baseDynamicLine * state.progressionLevel;

    // 5. Clamp to table thresholds elegantly to ensure strict compliance
    redAmount = Math.max(Math.min(redAmount, config.betLimits.max), config.betLimits.minOutside);
    permanentLineAmount = Math.max(Math.min(permanentLineAmount, config.betLimits.max), config.betLimits.min);
    dynamicLineAmount = Math.max(Math.min(dynamicLineAmount, config.betLimits.max), config.betLimits.min);

    // Verify bankroll has enough funds to cover the combined wager pool
    const totalWager = redAmount + permanentLineAmount + dynamicLineAmount;
    if (bankroll < totalWager) {
        return []; 
    }

    // 6. Return structured bets array
    return [
        { type: 'red', amount: redAmount },
        { type: 'line', value: permanentLineValue, amount: permanentLineAmount },
        { type: 'line', value: state.dynamicLineValue, amount: dynamicLineAmount }
    ];
}