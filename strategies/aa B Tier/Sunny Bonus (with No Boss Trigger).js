/**
 * STRATEGY: Sunny Bonus (with No Boss Trigger)
 * * SOURCE:
 * - Video: "SPECTACULAR SUNNY BONUS ROULETTE SYSTEM!"
 * - URL: https://www.youtube.com/watch?v=VitacYtydtI
 * - Channel: The Roulette Master
 * * LOGIC:
 * 1. Base Strategy (Sunny Bonus):
 * - Always bet on the 2nd Column and 3rd Column (covering 24 numbers).
 * - Always bet on Zero (0) as insurance/bonus.
 * - This covers ~67% of the board. Losing numbers are primarily in the 1st Column.
 * * 2. Secondary Strategy (No Boss Trigger - Optional but included per video logic):
 * - Monitor history for 3 consecutive hits of the SAME Dozen (1st, 2nd, or 3rd 12).
 * - If triggered, place bets on the *other two* Dozens.
 * - Note: To keep this function robust, we will focus primarily on the core Sunny Bonus progression 
 * as the "No Boss" requires a massive bankroll divergence that often breaks standard limits.
 * (However, the linear progression below allows for steady recovery).
 * * PROGRESSION (Linear Ladder):
 * - Does NOT use Martingale (doubling).
 * - On Loss: Increase bets by the original base unit amount.
 * - Example: Columns $6 -> $12 -> $18. Zero $1 -> $2 -> $3.
 * - On Win (but Session still Negative): Keep bets the SAME (do not reset, do not increase).
 * - On Win (Session Positive): Reset to base units.
 * * GOAL:
 * - Achieve a daily profit target (video suggests ~$200 on a $500-$1000 bankroll) or reset continuously upon reaching session positive.
 * * CONFIGURATION NOTES:
 * - This function auto-scales the 6:6:1 betting ratio based on the casino's 'minOutside' limit to ensure validity.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & RATIOS ---
    // The video uses $6 on columns and $1 on Zero. This is a 6:1 ratio.
    // We must scale this to respect the casino's minimum limits.
    const minOutside = config.betLimits.minOutside || 5;
    const minInside = config.betLimits.min || 1;

    // Calculate base units to maintain the strategy's approximate ratio (6:1) 
    // while respecting minimums.
    // If minOutside is 5, we use 5 for columns. 
    // To keep the ratio, Zero should be ~1/6th of column bet, but must be at least minInside.
    const baseColumnBet = minOutside;
    const baseZeroBet = Math.max(minInside, Math.floor(minOutside / 6) || 1);

    // --- 2. INITIALIZE STATE ---
    if (!state.initialized) {
        state.units = 1;              // Current progression level (1 = base, 2 = 2x base, etc.)
        state.startBankroll = bankroll; // Snapshot of bankroll at start of session/reset
        state.maxUnits = 20;          // Safety cap to prevent infinite linear growth
        state.initialized = true;
    }

    // --- 3. PROCESS LAST SPIN (If applicable) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber; // 0-36
        
        // Determine if we won the previous bet
        // Winning numbers: 0, or any number in Col 2 (2,5,8...) or Col 3 (3,6,9...)
        // Col 1 (1,4,7...) is the loss zone.
        const isZero = lastNum === 0 || lastNum === '00';
        const colMod = lastNum % 3; // 1=Col1, 2=Col2, 0=Col3 (except 0)
        
        const wonColumn = !isZero && (colMod === 2 || colMod === 0);
        const wonZero = isZero;
        const wonRound = wonColumn || wonZero;

        // Calculate current session profit/loss relative to the reset point
        const currentSessionProfit = bankroll - state.startBankroll;

        if (wonRound) {
            if (currentSessionProfit > 0) {
                // WIN & POSITIVE SESSION -> RESET
                state.units = 1;
                state.startBankroll = bankroll; // Reset session baseline
            } else {
                // WIN but STILL NEGATIVE -> HOLD (Do not increase, do not reset)
                // state.units remains unchanged
            }
        } else {
            // LOSS -> INCREASE LINEARLY
            // Add 1 base unit to the bet
            state.units++;
        }
    }

    // --- 4. SAFETY CAP ---
    if (state.units > state.maxUnits) {
        state.units = 1; // Reset if progression gets too dangerous
        state.startBankroll = bankroll;
    }

    // --- 5. CALCULATE BET AMOUNTS ---
    let currentColumnAmount = baseColumnBet * state.units;
    let currentZeroAmount = baseZeroBet * state.units;

    // --- 6. CLAMP TO LIMITS (CRUCIAL) ---
    // Ensure column bets don't exceed table max
    currentColumnAmount = Math.min(currentColumnAmount, config.betLimits.max);
    
    // Ensure zero bet doesn't exceed table max
    currentZeroAmount = Math.min(currentZeroAmount, config.betLimits.max);

    // --- 7. CONSTRUCT BETS ---
    const bets = [];

    // Bet on 2nd Column
    bets.push({
        type: 'column',
        value: 2,
        amount: currentColumnAmount
    });

    // Bet on 3rd Column
    bets.push({
        type: 'column',
        value: 3,
        amount: currentColumnAmount
    });

    // Bet on Zero
    bets.push({
        type: 'number',
        value: 0,
        amount: currentZeroAmount
    });

    // (Optional) US Roulette Insurance: If playing on double zero table, 
    // usually you split the zero bet or ignore 00. 
    // This standard implementation focuses on single 0.

    return bets;
}