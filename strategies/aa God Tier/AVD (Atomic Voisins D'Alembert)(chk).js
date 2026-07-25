/**
 * ============================================================================
 * ROULETTE STRATEGY: AVD (Atomic Voisins D'Alembert)
 * ============================================================================
 * Source:
 *   - Video URL: https://youtu.be/WtsM1YiUWpw
 *   - Channel: Casino Matchmaker (Strategy submitted by Matt B)
 *
 * The Full Logic in details:
 *   - Table Type: European Wheel (Single Zero, 37 numbers: 0-36).
 *   - Trigger/Conditions: Places bets every spin until the target profit is reached.
 *   - Base Unit Bet Sizing (Level 1 = 1 Progression Unit = $15 Total):
 *     1. Split bets (1 unit): $1
 *     2. Corner & Trio bets (2 units): $2
 *     3. Column 2 bet (6 units): $6
 *   - Bet Placements per Progression Level:
 *     - Outside Bet: Column 2 (6 units)
 *     - Voisins du Zéro Inside Bets (9 units total):
 *       - Trio 0/2/3: 2 units (value: [0, 2, 3])
 *       - Corner 25/26/28/29: 2 units (value: 25)
 *       - Split 4/7: 1 unit (value: [4, 7])
 *       - Split 12/15: 1 unit (value: [12, 15])
 *       - Split 18/21: 1 unit (value: [18, 21])
 *       - Split 19/22: 1 unit (value: [19, 22])
 *       - Split 32/35: 1 unit (value: [32, 35])
 *   - Covered Numbers: 24 total winning numbers out of 37 (64.86% coverage).
 *   - Jackpot / "Banger" Numbers: 2, 26, 29, 32, 35 (Overlap of Column 2 and Voisins).
 *
 * The Full Bet Progression in details:
 *   - Initial Bet Level: Level 1 ($15 total, $1 splits). Change to Level 2 to match video's $30 start.
 *   - Minimum Floor Level: Level 1 (Never drops below $15 total).
 *   - On Loss: Increase progression level by +1 unit (Adds $15 to total bet).
 *   - On Standard Win: Decrease progression level by -1 unit (Floored at Level 1).
 *   - On Jackpot Hit (2, 26, 29, 32, 35) OR Net Session Profit (> 0): Reset to starting level.
 *
 * The Goal:
 *   - Reach target session profit (+100 units or net profit) or stop when target is met.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        // Set to 1 for $1 splits ($15 total). Set to 2 to match the video's $30 start.
        state.progression = 1; 
    }

    // 2. Evaluate Spin History & Update Progression
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        const voisinsNumbers = [0, 2, 3, 4, 7, 12, 15, 18, 19, 21, 22, 25, 26, 28, 29, 32, 35];
        const col2Numbers = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
        const jackpotNumbers = [2, 26, 29, 32, 35];

        const isVoisins = voisinsNumbers.includes(num);
        const isCol2 = col2Numbers.includes(num);
        const isJackpot = jackpotNumbers.includes(num);
        const isWin = isVoisins || isCol2;

        const currentProfit = bankroll - state.initialBankroll;

        // Progression adjustments
        if (currentProfit > 0 || isJackpot) {
            // Reset to base starting level on profit or jackpot
            state.progression = 1;
        } else if (!isWin) {
            // Increase by +1 level on loss (+$15 total bet)
            state.progression += 1;
        } else {
            // Decrease by -1 level on win (floored at level 1)
            state.progression = Math.max(1, state.progression - 1);
        }
    }

    // 3. Goal Check (Target Profit)
    const targetProfit = 100000;
    if (bankroll - state.initialBankroll >= targetProfit) {
        return [];
    }

    // 4. Calculate Base Unit Sizing ($1 per unit base)
    const baseUnit = 1;
    const level = state.progression;

    const unit1Base = baseUnit * level;     // $1 x level
    const unit2Base = unit1Base * 2;        // $2 x level
    const unit6Base = unit1Base * 6;        // $6 x level

    // Clamp amounts to config limits
    const inside1Unit = Math.min(Math.max(unit1Base, config.betLimits.min), config.betLimits.max);
    const inside2Unit = Math.min(Math.max(unit2Base, config.betLimits.min), config.betLimits.max);
    const outside6Unit = Math.min(Math.max(unit6Base, config.betLimits.minOutside), config.betLimits.max);

    // 5. Construct and Return Bet Objects
    return [
        // Outside Bet (6 units)
        { type: 'column', value: 2, amount: outside6Unit },

        // Voisins du Zéro Inside Bets (9 units total)
        { type: 'trio', value: [0, 2, 3], amount: inside2Unit },
        { type: 'corner', value: 25, amount: inside2Unit },
        { type: 'split', value: [4, 7], amount: inside1Unit },
        { type: 'split', value: [12, 15], amount: inside1Unit },
        { type: 'split', value: [18, 21], amount: inside1Unit },
        { type: 'split', value: [19, 22], amount: inside1Unit },
        { type: 'split', value: [32, 35], amount: inside1Unit }
    ];
}