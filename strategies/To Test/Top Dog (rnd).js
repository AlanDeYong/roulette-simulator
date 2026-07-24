/**
 * Strategy Name: Top Dog Roulette Strategy
 * Source: https://youtu.be/aXomeX8gfP8 (Gamblers University)
 * * Full Logic Details:
 * This strategy aims for robust layout coverage using a layered inside-bet methodology.
 * Each betting round covers a specific vertical section of the table blueprint consisting of:
 * - 3 Consecutive Street Bets (e.g., rows starting with 4, 7, 10)
 * - 3 Split Bets directly above those streets (e.g., 5-8, 11-14, 17-20 horizontal or vertical matching layout shifts)
 * - 3 Straight Up Bets directly above those splits (e.g., 6, 9, 12)
 * * Note: The visual combination forms a highly covered block. The exact location zone shifts or repeats based 
 * on session conditions, but the fundamental bet selection rules apply standard dynamic tiering.
 * * Full Bet Progression Details:
 * This is an incremental progression system with custom recovery stages:
 * - Base Unit Setup: Plays 1 base unit per position (9 units total per starting bet layout).
 * - Win Condition: When a winning spin occurs that creates a session bankroll high, the system resets to base unit amounts (1x unit per position).
 * - Loss Condition: On loss, the strategy rebets and increments all covered positions by +1 unit or moves to an advanced flat tier sequence 
 * to safely recover deficits with expanded coverage while respecting global tables bounds.
 * * Goal:
 * Target profit is variable (typically +$100 to +$150 over a 40-spin horizon). 
 * Stop-loss is configured dynamically or when table limits prohibit the required scale.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Setup Success & Limit Parameters
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;
    const baseIncrement = config.minIncrementalBet || 1;

    // 2. State Initialization
    if (!state.isInitialized) {
        state.isInitialized = true;
        state.currentLevel = 1;
        state.highestBankroll = bankroll;
        state.targetProfit = 150; 
        state.spinCount = 0;
        state.zoneIndex = 0; // Alternates table zones for visual coverage variance
    }

    state.spinCount++;

    // Track Highest Bankroll achieved to evaluate resetting rules
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
        state.currentLevel = 1; // Reset progression tier upon hitting new peaks
    }

    // 3. Process previous spin data to adjust levels if no peak was achieved
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastProfit = state.lastBetAmount ? (bankroll - state.previousBankroll) : 0;

        if (lastProfit <= 0) {
            // Level escalation upon loss
            state.currentLevel++;
            // Shift zones systematically on losses to search for hot clusters
            state.zoneIndex = (state.zoneIndex + 1) % 3;
        } else {
            // On a win that did not reach a clean session high, gently maintain or slightly step down
            if (state.currentLevel > 1) {
                state.currentLevel = Math.max(1, state.currentLevel - 1);
            }
        }
    }

    // Update historical reference metrics for next round evaluation loop
    state.previousBankroll = bankroll;

    // Determine current bet amount multiplier based on configuration options
    let multiplier = state.currentLevel;
    let unitBetAmount = minInside * multiplier;

    // Dynamic Zone Matrix Definitions mapping [Streets, Splits, StraightUps]
    const zones = [
        {
            streets: [4, 7, 10],
            splits: [[5, 8], [8, 11], [11, 14]],
            straights: [6, 9, 12]
        },
        {
            streets: [13, 16, 19],
            splits: [[14, 17], [17, 20], [20, 23]],
            straights: [15, 18, 21]
        },
        {
            streets: [25, 28, 31],
            splits: [[26, 29], [29, 32], [32, 35]],
            straights: [27, 30, 33]
        }
    ];

    // Select the configuration data from the chosen block
    const activeZone = zones[state.zoneIndex];
    let bets = [];

    // Clamp single positions safely within limits configuration boundaries
    const clampInsideBet = (amt) => Math.min(Math.max(amt, minInside), maxBet);
    let finalizedAmount = clampInsideBet(unitBetAmount);

    // 4. Build Strategy Layout Blueprint Output
    // Append Street Components
    activeZone.streets.forEach(val => {
        bets.push({ type: 'street', value: val, amount: finalizedAmount });
    });

    // Append Split Components
    activeZone.splits.forEach(val => {
        bets.push({ type: 'split', value: val, amount: finalizedAmount });
    });

    // Append Straight Up Components
    activeZone.straights.forEach(val => {
        bets.push({ type: 'number', value: val, amount: finalizedAmount });
    });

    // Calculate sum configuration value of this round layout to cache for loss check calculations
    state.lastBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);

    // Stop execution sequence cleanly if bankroll runs completely dry
    if (state.lastBetAmount > bankroll) {
        return []; 
    }

    return bets;
}