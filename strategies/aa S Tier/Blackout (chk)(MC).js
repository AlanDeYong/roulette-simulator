/**
 * Strategy: Blackout (European Wheel Adaptation)
 * Source: Roulette Strategy Lab (https://www.youtube.com/watch?v=RXZfzatwRzc)
 * * The Logic: 
 * A high-coverage strategy that places bets across the board.
 * Adapted for European Roulette:
 * - 2nd Column (Base 5x unit)
 * - Straight Up on Zero (Base 2x unit) 
 * - 5 Corners: 2, 8, 17, 25, 32 (Base 2x unit each)
 * - 4 Streets: 4, 13, 22, 31 (Base 1x unit each)
 * * The Progression:
 * The progression ONLY applies to the 2nd Column bet. The inside bets remain static.
 * - Total Loss (Spin misses all covered numbers): Add 2 base units to the Column bet.
 * - Partial Loss (Spin hits, but payout is less than total bet): Add 1 base unit to the Column bet.
 * - Win (Net positive for the spin but NOT session profit): Keep column bet at current level.
 * * The Goal:
 * Achieve a new high-water mark for the session (Session Profit). 
 * Once the bankroll exceeds the session's starting bankroll, all bets are cleared and reset to base levels.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish Base Units
    const baseMultiplier = Math.max(1, Math.ceil(config.betLimits.min / 5));
    const streetBetAmount = 1 * baseMultiplier;
    const cornerBetAmount = 2 * baseMultiplier; // Also used for the Zero bet
    const baseColBetAmount = Math.max(5 * baseMultiplier, config.betLimits.minOutside);

    // 2. Initialize State on First Spin
    if (typeof state.sessionStartBankroll === 'undefined') {
        state.sessionStartBankroll = bankroll;
        state.currentColBet = baseColBetAmount;
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
    }

    // 3. Evaluate Previous Spin Results & Apply Progression
    if (spinHistory.length > 0) {
        const netChange = Math.round(bankroll - state.lastBankroll);

        // Goal Check: Did we achieve session profit?
        if (bankroll > state.sessionStartBankroll) {
            state.sessionStartBankroll = bankroll;
            state.currentColBet = baseColBetAmount;
        } 
        // Progression Trigger: Did we lose money on the last spin?
        else if (netChange < 0) {
            const increment = config.incrementMode === 'base' ? baseColBetAmount : config.minIncrementalBet;
            const isTotalLoss = (netChange <= -state.lastTotalBet);

            if (isTotalLoss) {
                state.currentColBet += (increment * 2);
            } else {
                state.currentColBet += increment; 
            }
        }
    }

    // 4. Clamp the progressing bet to table limits
    state.currentColBet = Math.max(state.currentColBet, config.betLimits.minOutside);
    state.currentColBet = Math.min(state.currentColBet, config.betLimits.max);

    const safeStreetBet = Math.min(streetBetAmount, config.betLimits.max);
    const safeInsideBet = Math.min(cornerBetAmount, config.betLimits.max);

    // 5. Construct the Bet Array
    const bets = [];

    // Outside Bet: 2nd Column 
    bets.push({ type: 'column', value: 2, amount: state.currentColBet });

    // Inside Bet: Straight up on Zero (European Adaptation)
    bets.push({ type: 'number', value: 0, amount: safeInsideBet });

    // Inside Bets: 5 Corners
    const cornerPlacements = [2, 8, 17, 25, 32];
    cornerPlacements.forEach(val => {
        bets.push({ type: 'corner', value: val, amount: safeInsideBet });
    });

    // Inside Bets: 4 Streets
    const streetPlacements = [4, 13, 22, 31];
    streetPlacements.forEach(val => {
        bets.push({ type: 'street', value: val, amount: safeStreetBet });
    });

    // 6. Update state for the next spin's evaluation
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    state.lastBankroll = bankroll;

    return bets;
}