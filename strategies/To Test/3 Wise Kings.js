/**
 * Roulette Strategy: Three Wise Kings
 * * Source:
 * - Video: https://youtu.be/6MSJ8v_O5SQ
 * - Channel: Stacking Chips
 * * The Full Logic:
 * - The strategy fundamentally relies on placing flat "street" bets that cover a high percentage 
 * of the wheel (18 numbers out of 37/38, or ~50% of the layouts excluding zeros).
 * - Specifically, it targets 6 specific streets (the middle rows across the layout columns).
 * - Level 1 (Base): Places 1 unit (default $5) on 6 designated streets:
 * - Street 4 (numbers 4, 5, 6)
 * - Street 7 (numbers 7, 8, 9)
 * - Street 13 (numbers 13, 14, 15)
 * - Street 16 (numbers 16, 17, 18)
 * - Street 25 (numbers 25, 26, 27)
 * - Street 28 (numbers 28, 29, 30)
 * - The presenter modifies the strategy by optionally adding a safety hedge unit on '0' 
 * (or 'split' on 0/00 depending on the table) to act as insurance during high-progression streaks.
 * * The Full Bet Progression:
 * - Win on Level 1: Reset progression/state and repeat Level 1 base bets.
 * - Loss on Level 1: Progress to Level 2.
 * - Level 2: Add 3 more units to each of the 6 streets (making it 4 units total per street).
 * - Loss on Level 2: Maintain the same 6 street footprints but utilize a Martingale-style progression. 
 * Double the total wager size of the street bets each consecutive loss on Level 2 or deeper 
 * until a win is achieved.
 * - Win on any Level: Instantly reset back to Level 1 base units.
 * * The Goal:
 * - Target Profit: Designed for quick low-roller session sessions aiming to lock in a profit 
 * near 95% to 100% of the session buy-in bankroll (e.g., doubling a $100 starting credit).
 * - Stop Loss: Standard casino table limits or absolute exhaustion of the playable bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State variables
    if (state.level === undefined) {
        state.level = 1; // Start at Level 1
        state.currentMultiplier = 1; // Initial street multiplier
    }

    // Target profit threshold tracking (Presenter cashed out at 95% gain)
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
    }

    // Stop execution if target profit is met (approx doubling bankroll)
    if (bankroll >= state.initialBankroll * 1.95) {
        return [];
    }

    // 2. Parse History to adjust progressions
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Target winning numbers covered by the 6 streets:
        // [4,5,6], [7,8,9], [13,14,15], [16,17,18], [25,26,27], [28,29,30]
        const targetNumbers = [
            4, 5, 6, 
            7, 8, 9, 
            13, 14, 15, 
            16, 17, 18, 
            25, 26, 27, 
            28, 29, 30
        ];

        const isWin = targetNumbers.includes(lastNumber);

        if (isWin) {
            // Reset to Level 1 on any hit
            state.level = 1;
            state.currentMultiplier = 1;
        } else {
            // Process progression level upon loss
            if (state.level === 1) {
                state.level = 2;
                state.currentMultiplier = 4; // Add 3 units -> total 4 units
            } else if (state.level >= 2) {
                state.level += 1;
                state.currentMultiplier *= 2; // Martingale doubling behavior beyond Level 2
            }
        }
    }

    // 3. Establish Bet Amounts using config structures
    const baseInsideUnit = config.betLimits.min; 
    let currentStreetAmount = baseInsideUnit * state.currentMultiplier;

    // 4. Handle Insurance (Presenter modification)
    // Only apply insurance when running higher stakes (Level 2+) to guard against zero out-kills
    let betsArray = [];
    if (state.level >= 2) {
        let insuranceAmount = config.betLimits.min;
        insuranceAmount = Math.max(insuranceAmount, config.betLimits.min);
        insuranceAmount = Math.min(insuranceAmount, config.betLimits.max);

        if (config.tableType === 'american') {
            betsArray.push({ type: 'split', value: [0, 0], amount: insuranceAmount }); // covers 0/00 split
        } else {
            betsArray.push({ type: 'number', value: 0, amount: insuranceAmount });
        }
    }

    // 5. Construct Street Bets & Clamp to Constraints
    const streetHeuristics = [4, 7, 13, 16, 25, 28];
    
    // Check table limits constraints across wagers
    currentStreetAmount = Math.max(currentStreetAmount, config.betLimits.min);
    currentStreetAmount = Math.min(currentStreetAmount, config.betLimits.max);

    streetHeuristics.forEach(startNumber => {
        betsArray.push({
            type: 'street',
            value: startNumber,
            amount: currentStreetAmount
        });
    });

    // 6. Ensure total required funds do not breach current liquid bankroll
    const totalRequiredBet = betsArray.reduce((sum, b) => sum + b.amount, 0);
    if (totalRequiredBet > bankroll) {
        return []; // Practical stop-loss condition when system can't fund the tier wagers
    }

    return betsArray;
}