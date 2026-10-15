/**
 * Strategy Name: 6 Corner Jackpot Tweak Strategy (Surgically Fixed)
 * Source: WillVegas YouTube Channel (https://youtu.be/qqyTVs3I4X0)
 * * Logic & Betting Grid Setup:
 * 1. Inside Bets (6 Corners): Placed on 2, 7, 14, 19, 26, and 31.
 * - Corner 2 covers 2,3,5,6
 * - Corner 7 covers 7,8,10,11
 * - Corner 14 covers 14,15,17,18
 * - Corner 19 covers 19,20,22,23
 * - Corner 26 covers 26,27,29,30
 * - Corner 31 covers 31,32,34,35
 * - Base amount: 2 units each.
 * 2. Outside Column Bet: Placed on the 2nd Column (value: 2).
 * - Base amount: 4 units.
 * 3. Zero Insurance: Placed on number 0 (basket/0 depending on wheel configuration).
 * - Base amount: 1 unit.
 * * Bet Progression Level Rules:
 * - On Jackpot Win (Hitting numbers in the 2nd column that overlap with corners): Full reset to base levels.
 * - On Partial Win (Hitting numbers on the outer edges of the corners without the column): Rebet the exact same amounts.
 * - On Total Loss: Increase corner and column bets by their initial base sizes (2 units and 4 units respectively).
 * Increase the zero bet by its initial base size (1 unit) only every 2 consecutive losses.
 * * Target Goal:
 * - Session profit target of $50 - $100 units or maximum time duration of 15-20 minutes.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Base Units from Configuration Limits
    const insideMin = config.betLimits.min || 2;
    const outsideMin = config.betLimits.minOutside || 5;
    const absoluteMax = config.betLimits.max || 500;

    // Base bet structure configurations
    const baseCornerUnits = 2;
    const baseColumnUnits = 4;
    const baseZeroUnits = 1;

    // 2. Initialize State Persistence Tracking
    if (!state.cornerMultiplier) state.cornerMultiplier = 1;
    if (!state.columnMultiplier) state.columnMultiplier = 1;
    if (!state.zeroMultiplier) state.zeroMultiplier = 1;
    if (!state.consecutiveLosses) state.consecutiveLosses = 0;
    if (!state.initialBankroll) state.initialBankroll = bankroll;

    // 3. Evaluate Previous Spin Results to Mutate Multipliers
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastNumber = lastResult.winningNumber;

        // Breakdown definitions of the layout outcomes
        const column2Numbers = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
        const cornerOuterNumbers = [
            3, 6, 
            7, 10, 
            15, 18, 
            19, 22, 
            27, 30, 
            31, 34
        ];
        
        const isJackpotWin = column2Numbers.includes(lastNumber) && (
            (lastNumber >= 2 && lastNumber <= 6) ||
            (lastNumber >= 7 && lastNumber <= 11) ||
            (lastNumber >= 14 && lastNumber <= 18) ||
            (lastNumber >= 19 && lastNumber <= 23) ||
            (lastNumber >= 26 && lastNumber <= 30) ||
            (lastNumber >= 31 && lastNumber <= 35)
        );

        const isPartialWin = cornerOuterNumbers.includes(lastNumber);
        const isZeroWin = (lastNumber === 0);

        if (isJackpotWin) {
            // Jackpot win reset rules
            state.cornerMultiplier = 1;
            state.columnMultiplier = 1;
            state.zeroMultiplier = 1;
            state.consecutiveLosses = 0;
        } else if (isPartialWin || isZeroWin) {
            // Partial wins rebet exactly as they are without clearing or rising
            state.consecutiveLosses = 0;
        } else {
            // Total loss mechanics trigger expansion
            state.consecutiveLosses += 1;
            
            // Corner and Column step up by base values on every loss
            state.cornerMultiplier += 1;
            state.columnMultiplier += 1;

            // Zero steps up by base values only every 2 consecutive losses
            if (state.consecutiveLosses % 2 === 0) {
                state.zeroMultiplier += 1;
            }
        }
    }

    // Stop execution if targets or safety limits are passed
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= 100000 || bankroll < (insideMin * 10)) {
        return [];
    }

    // 4. Calculate Final Bet Arrays and Clamp to Layout Enforcements
    let calculatedCornerBet = insideMin * baseCornerUnits * state.cornerMultiplier;
    let calculatedColumnBet = outsideMin * baseColumnUnits * state.columnMultiplier;
    let calculatedZeroBet = insideMin * baseZeroUnits * state.zeroMultiplier;

    // Enforce system global thresholds
    calculatedCornerBet = Math.min(Math.max(calculatedCornerBet, insideMin), absoluteMax);
    calculatedColumnBet = Math.min(Math.max(calculatedColumnBet, outsideMin), absoluteMax);
    calculatedZeroBet = Math.min(Math.max(calculatedZeroBet, insideMin), absoluteMax);

    const betsArray = [];

    // Push Corner Layout Array Elements
    const targetedCorners = [2, 7, 14, 19, 26, 31];
    targetedCorners.forEach(value => {
        betsArray.push({
            type: 'corner',
            value: value,
            amount: calculatedCornerBet
        });
    });

    // Push Column Layout Array Elements
    betsArray.push({
        type: 'column',
        value: 2,
        amount: calculatedColumnBet
    });

    // Push Zero Insurance Elements
    betsArray.push({
        type: 'number',
        value: 0,
        amount: calculatedZeroBet
    });

    return betsArray;
}