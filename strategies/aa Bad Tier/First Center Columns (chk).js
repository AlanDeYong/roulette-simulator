/**
 * ==============================================================================
 * Strategy: First Center Columns ("1st Center Columns")
 * Source: YouTube - "🔥 MANY WAYS TO WIN! | This Roulette Strategy Gives You More Chances to Profit 🎯"
 * Channel: WillVegas (https://youtu.be/1IxyE6TbHmQ)
 *
 * ------------------------------------------------------------------------------
 * THE FULL LOGIC IN DETAIL:
 * ------------------------------------------------------------------------------
 * This multi-coverage system places strategic bets across dozens, columns, and 
 * center-column straight-up numbers to generate high board coverage and multiple 
 * overlapping payout combinations:
 *
 * 1. 1st Dozen (Numbers 1-12): 10 Units (Outside bet)
 * 2. 1st Column (Numbers 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34): 5 Units (Outside bet)
 * 3. 3rd Column (Numbers 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36): 5 Units (Outside bet)
 * 4. Number 0 (Straight up, or Split 0/00 on American table): 1 Unit (Inside bet)
 * 5. Number 14 (Straight up): 1 Unit (Inside bet)
 * 6. Number 17 (Straight up): 1 Unit (Inside bet)
 * 7. Number 20 (Straight up): 1 Unit (Inside bet)
 * 8. Number 23 (Straight up): 1 Unit (Inside bet)
 *
 * Total Base Outlay per spin = 25 Units.
 *
 * ------------------------------------------------------------------------------
 * THE FULL BET PROGRESSION:
 * ------------------------------------------------------------------------------
 * - Base Level: Multiplier = 1.
 * - Loss Tracking: A spin resulting in a net loss (including partial losses where 
 *   returns are less than the total amount wagered) increments the consecutive loss counter.
 * - Double-Up Trigger: If 3 consecutive losses occur at the current progression level, 
 *   the strategy doubles all bet amounts (Multiplier = Multiplier * 2) and resets 
 *   the consecutive loss counter to 0.
 * - Recovery & Reset: On any winning spin, if the bankroll reaches or exceeds the 
 *   initial session bankroll (in session profit), the progression completely resets 
 *   back to base level (Multiplier = 1). If not yet in overall profit, the strategy 
 *   maintains the current multiplier level to facilitate rapid recovery.
 *
 * ------------------------------------------------------------------------------
 * THE GOAL:
 * ------------------------------------------------------------------------------
 * - Target Profit: +$50 to +$70 profit (or +50 to +70 base units) above the 
 *   starting bankroll.
 * - Stop-Loss: Stops if bankroll is insufficient to place the minimum required bets.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.lastBankroll = bankroll;
        state.multiplier = 1;
        state.consecutiveLosses = 0;
        state.targetProfit = 6000 * (config.betLimits.min || 1); // $50 - $70 target profit
        state.targetReached = false;
        state.initialized = true;
    }

    // 2. Check Session Target Profit
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        state.targetReached = true;
        return []; // Stop betting once target profit is reached
    }

    // 3. Process Spin History & Update Progression
    if (spinHistory && spinHistory.length > 0) {
        const netChange = bankroll - state.lastBankroll;

        if (netChange > 0) {
            // Winning spin: reset consecutive losses
            state.consecutiveLosses = 0;

            // If overall session is in net profit, reset progression to base
            if (bankroll >= state.initialBankroll) {
                state.multiplier = 1;
            }
        } else if (netChange < 0) {
            // Net loss (partial or full loss)
            state.consecutiveLosses += 1;

            // Double up every 3 consecutive losses
            if (state.consecutiveLosses >= 3) {
                state.multiplier *= 2;
                state.consecutiveLosses = 0;
            }
        }
    }

    // Save bankroll before placing new bets
    state.lastBankroll = bankroll;

    // 4. Calculate Base Units respecting limits
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Base unit per 1 inside unit (proportional so 5 units >= minOutside)
    const baseUnit = Math.max(minInside, Math.ceil(minOutside / 5));

    const mult = state.multiplier;

    // Helper to clamp bet amounts to casino limits
    const clampInside = (units) => Math.min(Math.max(units * baseUnit * mult, minInside), maxBet);
    const clampOutside = (units) => Math.min(Math.max(units * baseUnit * mult, minOutside), maxBet);

    const dozenAmount = clampOutside(10);
    const col1Amount = clampOutside(5);
    const col3Amount = clampOutside(5);
    const zeroAmount = clampInside(1);
    const n14Amount = clampInside(1);
    const n17Amount = clampInside(1);
    const n20Amount = clampInside(1);
    const n23Amount = clampInside(1);

    // 5. Construct Bet Placements
    const bets = [
        // 1st Dozen (1-12)
        { type: 'dozen', value: 1, amount: dozenAmount },

        // 1st and 3rd Columns
        { type: 'column', value: 1, amount: col1Amount },
        { type: 'column', value: 3, amount: col3Amount },

        // 4 Center-Column straight-up numbers (2nd dozen)
        { type: 'number', value: 14, amount: n14Amount },
        { type: 'number', value: 17, amount: n17Amount },
        { type: 'number', value: 20, amount: n20Amount },
        { type: 'number', value: 23, amount: n23Amount }
    ];

    // Zero coverage (straight up on 0 for European, or split 0/00 if American)
    if (config.tableType === 'american') {
        bets.push({ type: 'split', value: [0, 0], amount: zeroAmount });
    } else {
        bets.push({ type: 'number', value: 0, amount: zeroAmount });
    }

    // 6. Check Total Bet against Available Bankroll
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBet > bankroll) {
        return []; // Insufficient bankroll to place full strategy layout
    }

    return bets;
}