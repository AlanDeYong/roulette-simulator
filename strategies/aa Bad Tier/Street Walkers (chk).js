/**
 * Strategy: Street Walker-acci (Street Walkers to Fibonacci)
 * Source: CEG Dealer School (https://youtu.be/Wz4ncU1ow6Y)
 * System Author: Triple J
 *
 * The Full Logic in Detail:
 * - The strategy targets a Dozen (or 3 Streets within a Dozen) that did not hit on the previous spin.
 * - If the wheel hits a particular dozen (e.g. 2nd Dozen), the system picks one of the remaining
 *   two non-hitting dozens (e.g. 1st Dozen).
 * - When transitioning to Streets (Levels 6-8), the strategy narrows exposure from 12 numbers (a full dozen)
 *   down to 9 numbers (3 individual streets within that target dozen) to preserve bankroll while offering high payout.
 *
 * The Full Bet Progression in Detail:
 * - Total 8 Progression Steps:
 *   - Step 1: 1 unit on Dozen (e.g., $5)
 *   - Step 2: 1 unit on Dozen (e.g., $5)
 *   - Step 3: 2 units on Dozen (e.g., $10)
 *   - Step 4: 3 units on Dozen (e.g., $15)
 *   - Step 5: 5 units on Dozen (e.g., $25)
 *   - Step 6: 3 Streets @ 4 units each (e.g., $20 per street, $60 total)
 *   - Step 7: 3 Streets @ 5 units each (e.g., $25 per street, $75 total)
 *   - Step 8: 3 Streets @ 7 units each (e.g., $35 per street, $105 total)
 * - On any Win: The progression resets immediately to Step 1.
 * - On a Loss: Move to the next step. If Step 8 loses, the 72-unit cycle ends; stop or reset to Step 1.
 *
 * The Goal:
 * - Target Profit: +18 units (e.g. +$90 on a $5 base unit, or +25% of starting bankroll).
 * - Stop-Loss: Full cycle loss after Step 8 (72 units total, e.g. -$360).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseOutside = config.betLimits.minOutside || 5;
    const baseInside = config.betLimits.min || 2;
    const unit = Math.max(baseOutside, baseInside);

    // Initialize state
    if (!state.initialized) {
        state.initialized = true;
        state.startingBankroll = bankroll;
        state.step = 0; // 0-indexed: 0 through 7
        state.targetProfit = unit * 1800; // Default $90 profit target for $5 units
        state.stopLoss = unit * 72; // 360 buy-in for $5 units
        state.targetDozen = 1;
    }

    // Check stop-loss and profit target conditions
    const currentProfit = bankroll - state.startingBankroll;
    if (currentProfit >= state.targetProfit || currentProfit <= -state.stopLoss) {
        return []; // Stop betting
    }

    // Progression definition: multiplier per position
    // Steps 0-4: 1 Dozen bet
    // Steps 5-7: 3 Streets bet
    const progression = [
        { type: 'dozen', units: 1 },
        { type: 'dozen', units: 1 },
        { type: 'dozen', units: 2 },
        { type: 'dozen', units: 3 },
        { type: 'dozen', units: 5 },
        { type: 'streets', unitsPerStreet: 4 },
        { type: 'streets', unitsPerStreet: 5 },
        { type: 'streets', unitsPerStreet: 7 }
    ];

    // Evaluate last spin result if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Determine which dozen hit
        let hitDozen = 0;
        if (lastNum >= 1 && lastNum <= 12) hitDozen = 1;
        else if (lastNum >= 13 && lastNum <= 24) hitDozen = 2;
        else if (lastNum >= 25 && lastNum <= 36) hitDozen = 3;

        // Determine if previous bet won
        let won = false;
        if (state.lastBetType === 'dozen') {
            won = (hitDozen === state.targetDozen);
        } else if (state.lastBetType === 'streets') {
            won = state.lastBetStreets.some(streetStart => lastNum >= streetStart && lastNum <= streetStart + 2);
        }

        if (won) {
            state.step = 0;
        } else {
            state.step += 1;
            if (state.step >= progression.length) {
                // Cycle exhausted
                return [];
            }
        }

        // Avoid the dozen that just hit
        if (hitDozen !== 0) {
            const availableDozens = [1, 2, 3].filter(d => d !== hitDozen);
            // Stick with current target if it wasn't the hit dozen, otherwise pick an available one
            if (state.targetDozen === hitDozen) {
                state.targetDozen = availableDozens[0];
            }
        }
    }

    const currentStage = progression[state.step];
    const bets = [];

    if (currentStage.type === 'dozen') {
        let betAmount = unit * currentStage.units;
        betAmount = Math.max(betAmount, config.betLimits.minOutside);
        betAmount = Math.min(betAmount, config.betLimits.max);

        bets.push({
            type: 'dozen',
            value: state.targetDozen,
            amount: betAmount
        });

        state.lastBetType = 'dozen';
        state.lastBetStreets = [];
    } else {
        // 3 Streets in the target dozen
        // Dozen 1 streets: 1, 4, 7, 10
        // Dozen 2 streets: 13, 16, 19, 22
        // Dozen 3 streets: 25, 28, 31, 34
        const dozenStart = (state.targetDozen - 1) * 12 + 1;
        const allStreets = [dozenStart, dozenStart + 3, dozenStart + 6, dozenStart + 9];
        // Select first 3 streets to reduce to 9 numbers
        const selectedStreets = allStreets.slice(0, 3);

        let betAmount = unit * currentStage.unitsPerStreet;
        betAmount = Math.max(betAmount, config.betLimits.min);
        betAmount = Math.min(betAmount, config.betLimits.max);

        for (let i = 0; i < selectedStreets.length; i++) {
            bets.push({
                type: 'street',
                value: selectedStreets[i],
                amount: betAmount
            });
        }

        state.lastBetType = 'streets';
        state.lastBetStreets = selectedStreets;
    }

    return bets;
}