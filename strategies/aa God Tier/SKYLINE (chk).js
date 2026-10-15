/**
 * ROULETTE STRATEGY: SKYLINE SYSTEM
 * 
 * ============================================================================
 * SOURCE:
 * - YouTube Channel: Bet With Mo
 * - Video URL: https://youtu.be/YlIAS8Nop9w
 * 
 * ============================================================================
 * THE FULL LOGIC IN DETAIL:
 * The "Skyline" strategy is a high-coverage system covering 22 out of 37/38 numbers
 * (~59.5% physical wheel coverage, ~82.9% win probability across session levels).
 * It combines Double Street (Six Line) bets with Split bets to secure frequent wins
 * and high-payout "jackpot" overlap zones.
 * 
 * Bet Placement per Spin (7 total bets):
 * 1. Three Double Street (Six Line) Bets (2 units each):
 *    - Line 4–9   (value: 4)   -> Covers numbers 4, 5, 6, 7, 8, 9
 *    - Line 16–21 (value: 16)  -> Covers numbers 16, 17, 18, 19, 20, 21
 *    - Line 28–33 (value: 28)  -> Covers numbers 28, 29, 30, 31, 32, 33
 * 
 * 2. Four Split Bets (1 unit each):
 *    - Split 2–3   (value: [2, 3])
 *    - Split 8–9   (value: [8, 9])     --> Overlaps with Line 4–9 (Jackpot Zone!)
 *    - Split 14–15 (value: [14, 15])
 *    - Split 20–21 (value: [20, 21])   --> Overlaps with Line 16–21 (Jackpot Zone!)
 * 
 * Total Numbers Covered (22 numbers):
 * - 2, 3, 4, 5, 6, 7, 8, 9, 14, 15, 16, 17, 18, 19, 20, 21, 28, 29, 30, 31, 32, 33
 * - Jackpot Numbers (Hits both Double Street + Split): 8, 9, 20, 21
 * 
 * ============================================================================
 * THE FULL BET PROGRESSION IN DETAIL:
 * The system utilizes an 8-Level progression sequence.
 * Base Ratio: Double Streets = 2x unit | Splits = 1x unit (10 total units per level).
 * 
 * Progression Levels & Multipliers:
 * - Level 1: 1x multiplier  (Total 10 units: DS @ 2, Splits @ 1)
 * - Level 2: 2x multiplier  (Total 20 units: DS @ 4, Splits @ 2)
 * - Level 3: 3x multiplier  (Total 30 units: DS @ 6, Splits @ 3)
 * - Level 4: 4x multiplier  (Total 40 units: DS @ 8, Splits @ 4)
 * - Level 5: 8x multiplier  (Total 80 units: DS @ 16, Splits @ 8)  [Double Level 4]
 * - Level 6: 10x multiplier (Total 100 units: DS @ 20, Splits @ 10)
 * - Level 7: 20x multiplier (Total 200 units: DS @ 40, Splits @ 20) [Double Level 6]
 * - Level 8: 25x multiplier (Total 250 units: DS @ 50, Splits @ 25)
 * 
 * State Rules:
 * - On Loss: Advance to the next level (+1 level, capped at Level 8).
 * - On Win: 
 *   - If session profit target is reached/exceeded: Reset back to Level 1.
 *   - If session's peak profit is reached/exceeded: Step down 1 level (-1 level, floor at Level 1).
 *   - Otherwise (if peak profit not reached): Remain at current level.
 * 
 * ============================================================================
 * THE GOAL:
 * - Target Profit: Profit increments (e.g., $40, $100, $120 above initial bankroll).
 * - Stop Loss: Stop betting if total bankroll cannot cover the required bet amount.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. State Initialization
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.level = 1; // Start at Level 1
        state.targetProfit = (config && config.targetProfit) ? config.targetProfit : 100;
        state.peakProfit = 0; // Track session peak profit
        state.initialized = true;
    }

    // Progression level multipliers (Levels 1 through 8)
    const levelMultipliers = [1, 2, 3, 4, 8, 10, 20, 25];

    // Array of numbers covered by Skyline strategy
    const coveredNumbers = [
        2, 3, 4, 5, 6, 7, 8, 9,
        14, 15, 16, 17, 18, 19, 20, 21,
        28, 29, 30, 31, 32, 33
    ];

    // 2. Evaluate Previous Spin Results
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        const isWin = coveredNumbers.includes(winNum);
        const currentProfit = bankroll - state.initialBankroll;

        if (isWin) {
            if (currentProfit >= state.targetProfit) {
                // Reset to Level 1 when profit target is achieved
                state.level = 1;
            } else if (currentProfit >= state.peakProfit) {
                // Step down 1 level only if session's peak profit is reached or exceeded
                state.level = Math.max(1, state.level - 1);
            }
            // Otherwise remain at current level until peak profit is reached

            // Update peak profit if a new peak was set
            if (currentProfit > state.peakProfit) {
                state.peakProfit = currentProfit;
            }
        } else {
            // Step up 1 level on loss
            state.level = Math.min(8, state.level + 1);
        }
    }

    // 3. Determine Bet Limits & Base Units
    const minInside = (config && config.betLimits && config.betLimits.min) ? config.betLimits.min : 2;
    const maxLimit = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;

    // Unit multiplier for current level
    const mult = levelMultipliers[state.level - 1];

    // Calculate base unit size according to limits
    const baseUnit = Math.max(1, Math.floor(minInside / 2));

    // Calculate initial bet amounts (Double Street = 2x baseUnit * mult, Split = 1x baseUnit * mult)
    let dsAmount = baseUnit * 2 * mult;
    let splitAmount = baseUnit * 1 * mult;

    // Clamp bet amounts to respect min and max table bet limits
    dsAmount = Math.min(Math.max(dsAmount, minInside), maxLimit);
    splitAmount = Math.min(Math.max(splitAmount, minInside), maxLimit);

    // Calculate total required bet size for this spin
    const totalRequiredBet = (dsAmount * 3) + (splitAmount * 4);

    // Bankroll check: Stop betting if bankroll is insufficient
    if (bankroll < totalRequiredBet) {
        return [];
    }

    // 4. Return Bets Array
    return [
        // Double Street (Six Line) Bets
        { type: 'line', value: 4, amount: dsAmount },
        { type: 'line', value: 16, amount: dsAmount },
        { type: 'line', value: 28, amount: dsAmount },
        // Split Bets
        { type: 'split', value: [2, 3], amount: splitAmount },
        { type: 'split', value: [8, 9], amount: splitAmount },
        { type: 'split', value: [14, 15], amount: splitAmount },
        { type: 'split', value: [20, 21], amount: splitAmount }
    ];
}