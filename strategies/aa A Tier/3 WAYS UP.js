
/**
 * 3 WAYS UP Roulette Strategy
 * * Source: "Bet With Mo" - https://www.youtube.com/watch?v=PhD2oS6S9gM
 * * THE LOGIC:
 * This is a High Coverage strategy (covering ~24 numbers) designed to grind small profits 
 * while recovering losses through a 9-Level progression.
 * * The Layout:
 * 1. Streets: Covers 8 specific rows across the board.
 * - 1st Dozen: Streets 4, 7, 10 (Covers 4-12)
 * - 2nd Dozen: Streets 16, 19 (Covers 16-21)
 * - 3rd Dozen: Streets 25, 28, 31 (Covers 25-33)
 * 2. Splits (Jackpots): Added from Level 2 onwards. Placed vertically "above" the streets 
 * to create double-covered "Jackpot" numbers (5, 8, 11, 17, 20, 26, 29, 32).
 * * THE PROGRESSION (Recovery):
 * - Win: 
 * - If (Session Profit >= Next Profit Goal): Reset to Level 1. Increase Profit Goal by $20.
 * - If (Session Profit < Next Profit Goal): Repeat same bet (or Level 1 if safe).
 * - Loss: Move to the next Level (1 -> 9).
 * * Level Multipliers (Approximate based on video):
 * - L1: Street 1u
 * - L2: Street 2u, Split 1u
 * - L3: Street 3u, Split 1u
 * - L4: Street 4u, Split 2u
 * - L5: Street 5u, Split 3u
 * - L6: Street 7u, Split 4u
 * - L7: Street 10u, Split 6u
 * - L8: Street 15u, Split 10u
 * - L9: Street 25u, Split 15u (Hail Mary)
 * * THE GOAL:
 * - Hit incremental profit targets of +$20 units.
 * - Stop Loss: 9 consecutive losses (Bust).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- CONFIGURATION ---
    const BASE_UNIT = config.betLimits.min; // Usually $1 or $2
    const PROFIT_STEP = 20 * BASE_UNIT;     // Goal increments (e.g., $20, $40, $60)
    
    // The 8 Streets (First number of the row)
    const STREET_NUMS = [4, 7, 10, 16, 19, 25, 28, 31];
    
    // The 8 Splits (Vertical pairs creating the "Jackpot" coverage)
    // Example: Split [2,5] overlaps with Street 4 (4,5,6) to make 5 a Jackpot.
    const SPLIT_PAIRS = [
        [2, 5], [5, 8], [8, 11],    // 1st Dozen Jackpots: 5, 8, 11
        [14, 17], [17, 20],         // 2nd Dozen Jackpots: 17, 20
        [23, 26], [26, 29], [29, 32]// 3rd Dozen Jackpots: 26, 29, 32
    ];

    // Progression Levels (Multipliers for Base Unit)
    const LEVELS = [
        { street: 1, split: 0 },  // Level 1: $8 total (if $1 unit)
        { street: 2, split: 1 },  // Level 2: $24 total
        { street: 3, split: 1 },  // Level 3: $32 total
        { street: 4, split: 2 },  // Level 4: $48 total
        { street: 5, split: 3 },  // Level 5: $64 total
        { street: 6, split: 4 },  // Level 6: $80 total
        { street: 8, split: 5 },  // Level 7: $104 total
        { street: 12, split: 8 }, // Level 8: $160 total (Double up feel)
        { street: 20, split: 12 } // Level 9: Max aggression
    ];

    // --- STATE INITIALIZATION ---
    if (!state.initialized) {
        state.currentLevel = 0; // Index of LEVELS array (0-8)
        state.startBankroll = bankroll;
        state.nextProfitGoal = PROFIT_STEP;
        state.initialized = true;
    }

    // --- GAME LOGIC ---
    // Check previous result to determine next move
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.winAmount || 0; // Assuming simulator provides this
        // Calculate current session profit
        const currentProfit = bankroll - state.startBankroll;

        // Condition 1: Did we hit the Profit Goal?
        if (currentProfit >= state.nextProfitGoal) {
            // SUCCESS: Reset system
            state.currentLevel = 0;
            state.nextProfitGoal = currentProfit + PROFIT_STEP; // Set new goal relative to current high
            // console.log(`Goal Hit! Resetting. New Goal: +${state.nextProfitGoal}`);
        } 
        // Condition 2: Did we lose?
        else if (lastWinAmount === 0) {
            // LOSS: Increase level
            if (state.currentLevel < LEVELS.length - 1) {
                state.currentLevel++;
            } else {
                // Max level reached and lost. Strategy failed. 
                // Optional: Reset to 0 or stay at max? Video implies bust, we reset to 0 to preserve remaining funds.
                state.currentLevel = 0; 
            }
        }
        // Condition 3: We won, but didn't hit goal (Grinding)
        else {
            // Usually in this strategy, if you are profiting but haven't hit the +20 mark,
            // you might repeat the level or step down. 
            // To be safe, if the win covered the previous bets, we repeat.
            // If the win was a massive Jackpot that put us close, we might reset.
            // Simple logic: Repeat level until Goal is hit or Loss occurs.
        }
    }

    // --- BET CONSTRUCTION ---
    const lvlConfig = LEVELS[state.currentLevel];
    const bets = [];

    // 1. Place Street Bets
    // Calc amount: Base * Multiplier, clamped to limits
    let streetAmount = BASE_UNIT * lvlConfig.street;
    streetAmount = Math.max(streetAmount, config.betLimits.min);
    streetAmount = Math.min(streetAmount, config.betLimits.max);

    STREET_NUMS.forEach(streetStart => {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: streetAmount
        });
    });

    // 2. Place Split Bets (Only if multiplier > 0)
    if (lvlConfig.split > 0) {
        let splitAmount = BASE_UNIT * lvlConfig.split;
        splitAmount = Math.max(splitAmount, config.betLimits.min);
        splitAmount = Math.min(splitAmount, config.betLimits.max);

        SPLIT_PAIRS.forEach(pair => {
            bets.push({
                type: 'split',
                value: pair,
                amount: splitAmount
            });
        });
    }

    // Safety check: If total bet exceeds bankroll, stop betting or scale down? 
    // Simulator usually rejects, but we return empty to avoid errors.
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBet > bankroll) {
        return []; // Not enough funds
    }

    return bets;

}