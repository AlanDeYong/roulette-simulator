/**
 * ODD VS EVEN - ROULETTE STRATEGY
 * Source: Bet With Mo (https://youtu.be/ngV9V2ug_R8)
 * 
 * The Full Logic:
 * This is a high-coverage system targeting the EVEN outside bet while hedging with 8 
 * specific ODD numbers (1, 3, 5, 7, 9, 13, 15, 17). 
 * By covering EVEN and these odds, you win slightly when EVEN hits, and get a better payout 
 * when covered ODD numbers hit. Losses occur on 0, 00, and uncovered odd numbers.
 * 
 * The Full Bet Progression:
 * The strategy has 8 fixed progression levels to recoup losses. 
 * - The EVEN bet starts at a base of 10 units.
 * - On a loss, the strategy moves up one level (max level 8).
 * - On a win, the strategy stays at the current level to continue recouping, 
 *   UNLESS the overall session profit goal is reached. 
 * 
 * Level Base Multipliers (Outside EVEN / Inside ODDs):
 * L1: 1x / 1x
 * L2: 2x / 1x
 * L3: 3x / 2x
 * L4: 4x / 2x
 * L5: 5x / 3x
 * L6: 6x / 3x
 * L7: 7x / 4x
 * L8: 14x / 8x (Double L7)
 * 
 * The Goal:
 * Target profit is tracked in increments of the Level 1 base total bet.
 * Once the bankroll meets or exceeds the target, the progression resets to Level 1, 
 * and a new target increment is set.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define progression multipliers
    const progression = [
        { evenMulti: 1, insideMulti: 1 }, // Level 1
        { evenMulti: 2, insideMulti: 1 }, // Level 2
        { evenMulti: 3, insideMulti: 2 }, // Level 3
        { evenMulti: 4, insideMulti: 2 }, // Level 4
        { evenMulti: 5, insideMulti: 3 }, // Level 5
        { evenMulti: 6, insideMulti: 3 }, // Level 6
        { evenMulti: 7, insideMulti: 4 }, // Level 7
        { evenMulti: 14, insideMulti: 8 } // Level 8
    ];

    // Number 19 excluded per correction
    const targetNumbers = [1, 3, 5, 7, 9, 13, 15, 17];

    // 2. Initialize State
    if (!state.level) state.level = 1;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;

    // Determine the base increment target (cost of Level 1)
    const baseInside = Math.max(config.betLimits.min * progression[0].insideMulti, config.betLimits.min);
    
    // EVEN bet base is 10 units
    let baseEvenAmount = 10 * config.betLimits.min * progression[0].evenMulti;
    const baseEven = Math.max(baseEvenAmount, config.betLimits.minOutside);
    
    const targetIncrement = (baseInside * targetNumbers.length) + baseEven;

    if (!state.profitTarget) {
        state.profitTarget = bankroll + targetIncrement;
    }

    // 3. Evaluate previous spin
    if (spinHistory.length > 0) {
        // Calculate session delta to determine win/loss without hardcoding payouts
        const profit = bankroll - state.lastBankroll;

        if (profit > 0) {
            // WIN Scenario
            if (bankroll >= state.profitTarget) {
                // Reached profit goal! Reset level and step target.
                state.level = 1;
                state.profitTarget = bankroll + targetIncrement;
            }
            // If profit goal isn't reached, stay at the current level to continue recouping
        } else if (profit < 0) {
            // LOSS Scenario
            state.level++;
            if (state.level > 8) {
                state.level = 8;
            }
        }
    }

    // 4. Bankroll Safety Check
    // Drop down levels if bankroll cannot support the next calculated bet level
    const getLevelCost = (lvlIdx) => {
        const data = progression[lvlIdx];
        const insAmount = Math.max(config.betLimits.min * data.insideMulti, config.betLimits.min);
        const evAmount = Math.max(10 * config.betLimits.min * data.evenMulti, config.betLimits.minOutside);
        return (insAmount * targetNumbers.length) + evAmount;
    };

    while (state.level > 1 && getLevelCost(state.level - 1) > bankroll) {
        state.level--;
    }

    // Update last bankroll for next spin's comparison
    state.lastBankroll = bankroll;

    // 5. Build Bets
    const currentProg = progression[state.level - 1];
    let bets = [];

    // Calculate & Clamp Outside EVEN bet (starting at 10 units)
    let evenAmount = 10 * config.betLimits.min * currentProg.evenMulti;
    evenAmount = Math.max(evenAmount, config.betLimits.minOutside);
    evenAmount = Math.min(evenAmount, config.betLimits.max);
    bets.push({ type: 'even', amount: evenAmount });

    // Calculate & Clamp Inside ODD numbers bets
    let insideAmount = config.betLimits.min * currentProg.insideMulti;
    insideAmount = Math.max(insideAmount, config.betLimits.min);
    insideAmount = Math.min(insideAmount, config.betLimits.max);

    targetNumbers.forEach(num => {
        bets.push({ type: 'number', value: num, amount: insideAmount });
    });

    return bets;
}