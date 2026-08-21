/**
 * @file strategy.js
 * @description Roulette Strategy: "Snakes & Ladders" (Red Snake Comping Strategy)
 * 
 * --- STRATEGY DOCUMENTATION ---
 * 
 * SOURCE:
 * - Video URL: https://youtu.be/k2Lk2MXtg10
 * - Channel: CEG Dealer School
 * 
 * FULL LOGIC IN DETAIL:
 * - The "Snakes & Ladders" strategy is a hedge/comp-building roulette system designed to maintain
 *   a high average bet per spin ($140 base) with minimum net volatility to play for long sessions
 *   (e.g., 3 hours) and accumulate casino rating comps or multiplier points.
 * - Every single spin, the system places three synchronized bet components:
 *   1. Red Snake Straight-Up Bets: $5 (1 unit) placed on each of the 12 Red Snake numbers
 *      (1, 5, 9, 12, 14, 16, 19, 23, 27, 30, 32, 34). Total = $60 (12 units).
 *   2. Black Outside Bet: $70 (14 units) placed on Black color.
 *   3. Green Zero Protection: $10 (2 units) placed on 0 (European) or 0/00 Split (American).
 * 
 * OUTCOME MATRIX (Base $140 Bet):
 * - Red Snake Hit (12/38 or 12/37 numbers): Wins Straight-Up ($175 + $5) = $180. Net Profit: +$40.
 * - Black Hit (18/38 or 18/37 numbers): Wins Even Money ($70 + $70) = $140. Net Outcome: $0 (Push).
 * - Green 0/00 Hit (1 or 2 numbers): Wins Split/Straight ($170 + $10) = $180. Net Profit: +$40.
 * - Uncovered Red ("Donk" numbers: 3, 7, 18, 21, 25, 36): All bets lose. Net Loss: -$140.
 * 
 * FULL BET PROGRESSION:
 * - Flat Betting: The strategy does NOT use a Martingale or negative progression.
 * - Bet amounts remain identical on every spin, regardless of wins or losses.
 * - All bet amounts are clamped dynamically to respect table min/max limits (`config.betLimits`).
 * 
 * GOAL / TARGETS:
 * - Primary Goal: Maximize table play time and total action wagered for casino comps / points.
 * - Target Bankroll / Buy-In: $300 to $700 (2 to 5 full betting units of $140).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Table Bet Limits
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // Base units based on table limits
    // In standard video setup: Inside unit = $5, Outside unit = $70 (14x inside unit), Green unit = $10 (2x inside unit)
    let unitInside = Math.max(5, minInside);
    let unitOutside = Math.max(minOutside, unitInside * 14);
    let unitGreen = Math.max(minInside, unitInside * 2);

    // Clamp individual bets to table max limit
    unitInside = Math.min(unitInside, maxBet);
    unitOutside = Math.min(unitOutside, maxBet);
    unitGreen = Math.min(unitGreen, maxBet);

    // Check minimum total bankroll required for 1 full spin
    const totalRequiredBankroll = (unitInside * 12) + unitOutside + unitGreen;
    if (bankroll < totalRequiredBankroll) {
        // Insufficient funds to execute the strategy safely
        return [];
    }

    const bets = [];

    // 1. Red Snake Bets (12 Red Numbers forming the snake pattern on the layout)
    const redSnakeNumbers = [1, 5, 9, 12, 14, 16, 19, 23, 27, 30, 32, 34];
    for (const num of redSnakeNumbers) {
        bets.push({
            type: 'number',
            value: num,
            amount: unitInside
        });
    }

    // 2. Black Outside Bet (Main Hedge)
    bets.push({
        type: 'black',
        amount: unitOutside
    });

    // 3. Green Zero Bet (Zero Cover)
    if (config.tableType === 'american') {
        // Split on 0 and 00 for American Roulette
        bets.push({
            type: 'split',
            value: [0, 2], // 0-00 courtesy/split position or basket/split representation
            amount: unitGreen
        });
    } else {
        // Straight-up on 0 for European Roulette
        bets.push({
            type: 'number',
            value: 0,
            amount: unitGreen
        });
    }

    return bets;
}