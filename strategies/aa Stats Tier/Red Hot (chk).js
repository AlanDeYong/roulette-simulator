/**
 * Roulette Strategy: "Red Hot" (Surgically Modified)
 * * Source:
 * - Video: https://youtu.be/DWLb5hfcikc
 * - Channel: The Roulette Master
 * * The Full Logic in Details:
 * - This strategy covers a target footprint across specific Outside layout positions, Columns, 
 * and individual Inside numbers primarily focused on Red and Odd selections to build a high-coverage zone.
 * - Base Bet Layout Configuration ($60 Total base unit):
 * 1. Outside Red: $15
 * 2. Outside Odd: $15
 * 3. Multiplier First 12 Dozen (1st 12): $10
 * 4. Multiplier Third Column (3rd Column): $10
 * 5. Inside Straight Up Numbers 1, 5, 7: $2 each ($6 total)
 * 6. Inside Straight Up Numbers 16, 19, 25, 34: $1 each (Modified specific Red numbers list, $4 total)
 * * The Full Bet Progression in Details:
 * - This strategy utilizes a "D'Alembert-like" or "Base Unit" recovery progression (Flat incremental reset system).
 * - Win: Reset the full bet configuration instantly back to the base level amounts.
 * - Loss/Push: Increase the bet amount for each individual position by its initial base amount (Multiplier stage). 
 * (This adheres to config.incrementMode === 'base' rules)
 * * The Goal:
 * - Steady banking of session profits by cashing out early once into a positive balance.
 * - Stop-Loss: Protection of bankroll by recovering using flat linear progression ticks rather than aggressive compounding.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Base Allocations for Layout Positions
    const baseBets = [
        { type: 'red', amount: 15 },
        { type: 'odd', amount: 15 },
        { type: 'dozen', value: 1, amount: 10 },
        { type: 'column', value: 3, amount: 10 },
        { type: 'number', value: 1, amount: 2 },
        { type: 'number', value: 5, amount: 2 },
        { type: 'number', value: 7, amount: 2 },
        { type: 'number', value: 16, amount: 1 },
        { type: 'number', value: 19, amount: 1 },
        { type: 'number', value: 25, amount: 1 },
        { type: 'number', value: 34, amount: 1 }
    ];

    // Dynamically calculate the total base bet so it's always accurate ($60)
    const baseTotalBet = baseBets.reduce((sum, bet) => sum + bet.amount, 0);

    // 2. Initialize Strategy State Variables
    if (!state.currentLevel) {
        state.currentLevel = 1;
    }

    // 3. Process Win/Loss from the last spin to adjust Progression Level
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;
        const winningColor = lastSpin.winningColor;
        const isOdd = winningNumber % 2 !== 0;

        // Calculate base payout if we were playing at level 1
        let basePayout = 0;

        if (winningColor === 'red') basePayout += 15 * 2;
        if (isOdd && winningNumber !== 0 && winningNumber !== 37) basePayout += 15 * 2;
        if (winningNumber >= 1 && winningNumber <= 12) basePayout += 10 * 3;
        if (winningNumber % 3 === 0 && winningNumber !== 0) basePayout += 10 * 3;

        if ([1, 5, 7].includes(winningNumber)) basePayout += 2 * 36;
        if ([16, 19, 25, 34].includes(winningNumber)) basePayout += 1 * 36;

        // Strict Check: Did we make a pure net profit?
        if (basePayout > baseTotalBet) {
            // Win: Reset progression level back to base layer
            state.currentLevel = 1;
        } else {
            // Loss or Push: Increment the progression multiplier stage
            state.currentLevel += 1;
        }
    }

    // 4. Construct Final Active Bets Array scaled by Progression Layer
    const activeBets = [];

    for (let i = 0; i < baseBets.length; i++) {
        const currentSelection = baseBets[i];
        let betAmount = currentSelection.amount * state.currentLevel;

        // Clamp bet entries strictly according to environment configuration parameters
        const isOutsideBet = ['red', 'black', 'even', 'odd', 'low', 'high', 'dozen', 'column'].includes(currentSelection.type);
        const minLimit = isOutsideBet ? config.betLimits.minOutside : config.betLimits.min;

        betAmount = Math.max(betAmount, minLimit);
        betAmount = Math.min(betAmount, config.betLimits.max);

        // Build object layout structure
        const betObject = {
            type: currentSelection.type,
            amount: betAmount
        };

        if (currentSelection.value !== undefined) {
            betObject.value = currentSelection.value;
        }

        activeBets.push(betObject);
    }

    return activeBets;
}