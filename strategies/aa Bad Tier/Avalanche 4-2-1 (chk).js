/**
 * The Avalanche 4-2-1 Roulette Strategy
 * Source: The Lucky Felt (https://youtu.be/EkUl2t9yoBk?si=30w414yISNLfDKao)
 *
 * The Logic:
 * This strategy focuses on profit-locking during winning streaks and employing a flat-rate 
 * recovery during losses. It targets 2:1 payout bets, specifically Dozens or Columns. 
 * For this automated implementation, it tracks the wheel's trend by placing bets on 
 * the Dozen that hit in the previous spin.
 *
 * The Progression:
 * - Base bet: The cycle starts with a "heavy hit" of 4 base units.
 * - On a WIN: The bet size is cut in half (e.g., 4 units -> 2 units -> 1 unit). This locks 
 * in profit from the initial win. If the bet size reaches 1 unit (the "dust trail"), 
 * it stays at 1 unit to ride the rest of the streak essentially risk-free.
 * - On a LOSS: Add exactly 4 units to the current bet amount to recover.
 *
 * The Goal:
 * To secure a session profit by capturing a quick win and rapidly reducing risk during 
 * winning streaks, while using a steady +4 unit increase to withstand downswings until 
 * a win halves the exposure back toward baseline.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    // The video scales based on bankroll ($10 units for $2000). We will map 1 unit to the table minimum.
    const baseUnit = config.betLimits.minOutside;

    // 2. Initialize State
    if (state.currentBetUnits === undefined) {
        state.currentBetUnits = 4; // Start the Avalanche with a 4-unit boulder
        state.targetDozen = 1;     // Default to Dozen 1 for the very first spin
    }

    // Helper to determine which Dozen a number belongs to
    const getDozen = (num) => {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null;
    };

    // 3. Process the last spin to update the progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNum = lastSpin.winningNumber;
        
        // Determine if our last bet won
        // (Assuming standard 0 or 00 roulette where green is an automatic loss on dozens)
        const wonLastSpin = (lastWinningNum !== 0 && lastWinningNum !== 37) && 
                            (getDozen(lastWinningNum) === state.targetDozen);

        if (wonLastSpin) {
            // WIN: Cut bet in half, but don't drop below 1 unit
            state.currentBetUnits = Math.max(1, Math.floor(state.currentBetUnits / 2));
        } else {
            // LOSS: Add 4 units to the current bet size
            state.currentBetUnits += 4;
        }

        // Update target to follow the trend (bet on the dozen that just hit)
        // If a zero hit, stick to the previous target dozen
        if (lastWinningNum !== 0 && lastWinningNum !== 37) {
            state.targetDozen = getDozen(lastWinningNum);
        }
    }

    // 4. Calculate actual Bet Amount
    let amount = state.currentBetUnits * baseUnit;

    // 5. CLAMP TO LIMITS (Crucial)
    amount = Math.max(amount, config.betLimits.minOutside); 
    amount = Math.min(amount, config.betLimits.max);

    // Prevent betting more than the available bankroll
    if (amount > bankroll) {
        amount = bankroll;
        if (amount < config.betLimits.minOutside) {
            return []; // Cannot afford the minimum bet
        }
    }

    // 6. Return Bet
    return [{ type: 'dozen', value: state.targetDozen, amount: amount }];
}