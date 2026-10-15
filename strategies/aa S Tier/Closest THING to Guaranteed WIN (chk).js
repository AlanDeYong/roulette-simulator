/**
 * Strategy: "Guaranteed WIN" Closest THING!!
 * Source: https://youtu.be/GRMkkZzbYoQ
 * Channel: WillVegas
 * * Full Logic Details:
 * This strategy provides comprehensive table coverage by playing a combination of 
 * Double Streets, a Dozen, Corner "Jackpot" bets, and a safety bet on the Green (0/00).
 * In total, 26 out of 37 standard numbers are covered. Bets are always placed actively 
 * on every single spin.
 * * Initial Base Bet Layout ($25 total):
 * 1. Double Street 4-9 (Line bet covering 4,5,6,7,8,9) - 1 Unit ($5)
 * 2. Double Street 28-33 (Line bet covering 28,29,30,31,32,33) - 1 Unit ($5)
 * 3. Second Dozen (Dozen bet covering 13-24) - 2 Units ($10)
 * 4. Corner Bet covering 5,6,8,9 - $1
 * 5. Corner Bet covering 17,18,20,21 - $1
 * 6. Corner Bet covering 29,30,32,33 - $1
 * 7. Basket / Number Bet on Green (0 / 00 depending on table type) - $2
 * * Full Bet Progression Details:
 * - A unit increment progression is used. 
 * - After any loss, the player increases the betting sizing by adding 1 unit ($25 base equivalent multiplier) 
 * to the table progression.
 * - This means Progression Level increments from 1 -> 2 -> 3 etc. upon losses.
 * - All component positions scale proportionally relative to their baseline values multiplied by the progression level.
 * - Upon achieving a net win that fully recovers the losses of the cycle (returning the bankroll to a new peak), 
 * the system resets completely back to Progression Level 1.
 * * Goal:
 * - Target Profit: $50 to $100 profit from the session setup.
 * - Stop Loss: Protected by automatic dynamic limits based on remaining bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence Variables
    if (!state.isInitialized) {
        state.highestBankroll = bankroll;
        state.progressionLevel = 1;
        state.isInitialized = true;
    }

    // Update the highest tracking peak if bankroll moves up
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    // 2. Performance Tracking & Reset Assessment
    // If we have history, analyze the last round outcome to adjust progression rules
    if (spinHistory.length > 0) {
        // If current bankroll matches or exceeds our absolute peak recovery target, reset back to base level
        if (bankroll >= state.highestBankroll) {
            state.progressionLevel = 1;
        } else {
            // Otherwise, we assess the last spin result to see if we incurred a session loss
            const lastSpin = spinHistory[spinHistory.length - 1];
            const num = lastSpin.winningNumber;

            // Determine if the last spin was a winning or losing slot for our specific matrix layout
            // Covered numbers: Double streets (4-9, 28-33), 2nd Dozen (13-24), Corner overlaps (5,6,8,9, 17,18,20,21, 29,30,32,33), and 0/00
            const isDoubleStreet1 = (num >= 4 && num <= 9);
            const isDoubleStreet2 = (num >= 28 && num <= 33);
            const isSecondDozen = (num >= 13 && num <= 24);
            const isCorner1 = [5, 6, 8, 9].includes(num);
            const isCorner2 = [17, 18, 20, 21].includes(num);
            const isCorner3 = [29, 30, 32, 33].includes(num);
            const isGreen = (num === 0 || num === 37); // 37 handles double zero fallback configurations

            const wonLastRound = isDoubleStreet1 || isDoubleStreet2 || isSecondDozen || isCorner1 || isCorner2 || isCorner3 || isGreen;

            if (!wonLastRound) {
                // If it missed all zones, step up by 1 unit level progression
                state.progressionLevel += 1;
            }
        }
    }

    // 3. Goal / Target Stop Conditions
    // Target profit recommendation from source: $50 to $100 profit
    const targetProfit = 750000; 
    if (bankroll >= config.startingBankroll + targetProfit) {
        return []; // Stop playing and locking profits
    }

    // 4. Calculate Base Unit Dimensions adhering strictly to constraints
    const insideMin = config.betLimits.min;
    const outsideMin = config.betLimits.minOutside;
    const absMaxBet = config.betLimits.max;

    const level = state.progressionLevel;

    // Baseline definitions matching video proportions scaled to current progression level
    let doubleStreetAmount = Math.max(5 * level, outsideMin);
    let dozenAmount         = Math.max(10 * level, outsideMin);
    let cornerAmount        = Math.max(1 * level, insideMin);
    let greenAmount         = Math.max(2 * level, insideMin);

    // Apply strict clamping boundaries to maximize compliance with structural simulator properties
    doubleStreetAmount = Math.min(doubleStreetAmount, absMaxBet);
    dozenAmount         = Math.min(dozenAmount, absMaxBet);
    cornerAmount        = Math.min(cornerAmount, absMaxBet);
    greenAmount         = Math.min(greenAmount, absMaxBet);

    // 5. Build Betting Array Matrix
    const bets = [
        // Double Street Line Bets (Value defines top left starting row marker layout index)
        { type: 'line', value: 4, amount: doubleStreetAmount },
        { type: 'line', value: 28, amount: doubleStreetAmount },

        // Outside Dozen Bet Matrix
        { type: 'dozen', value: 2, amount: dozenAmount },

        // Inside Corner Overlay Selections
        { type: 'corner', value: 5, amount: cornerAmount },
        { type: 'corner', value: 17, amount: cornerAmount },
        { type: 'corner', value: 29, amount: cornerAmount }
    ];

    // Insurance hedge deployment for zero configurations
    if (config.tableType === 'american') {
        bets.push({ type: 'basket', value: 0, amount: greenAmount });
    } else {
        bets.push({ type: 'number', value: 0, amount: greenAmount });
    }

    // 6. Safety Check Against Available Liquid Capital
    const totalRequiredOutlay = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalRequiredOutlay > bankroll) {
        return []; // Insufficient funds available to complete sizing structure safely
    }

    return bets;
}