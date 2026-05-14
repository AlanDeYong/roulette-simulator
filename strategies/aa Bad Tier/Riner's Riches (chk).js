/**
 * Riner's Riches Roulette Strategy
 * * Source: The Roulette Master - "✅ “The BEST NEW Roulette SECRET REVEALED”
 * URL: https://www.youtube.com/watch?v=79DkMIwROBo
 * * The Logic: 
 * This strategy exploits the overlap of specific outside bets. It alternates between two phases:
 * - Phase 1: Targets Red, Odd, and the 1st Dozen. This specifically hunts for 1, 3, 5, 7, and 9.
 * - Phase 2: Targets Black, Even, and the 1st Dozen. This specifically hunts for 2, 4, 6, 8, and 10.
 * The system relies on "partial wins" (hitting 1 or 2 of the 3 bets) to sustain the bankroll 
 * while waiting to hit the "Jackpot" (all 3 bets winning simultaneously).
 * * The Progression: 
 * - Base Units: 3 units on Color, 3 units on Parity, 2 units on 1st Dozen.
 * - On a "Net Loss" (return is less than total bet amount): Increase all bets by their base unit amount.
 * - On a "Partial Win" (net profit >= 0, but not all 3 hit): Keep bets exactly the same.
 * - On a "Jackpot" (all 3 bets win): Reset progression to the base unit amounts and swap the phase 
 * (e.g., from Red/Odd to Black/Even).
 * * The Goal: 
 * Churn through spins, extending playtime via partial wins, until the 3-way intersection hits 
 * for a large payout, then cycle the profit and switch sides.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.phase) {
        state.phase = 'red_odd'; // Start targeting Red, Odd, 1st Dozen
        state.currentLevel = 1;  // Multiplier for the base bets
    }

    // 2. Evaluate Previous Spin
    if (spinHistory.length > 0 && state.lastBetAmounts) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const color = lastSpin.winningColor; // 'red', 'black', or 'green'
        
        // Determine parity and dozen
        const parity = (num !== 0 && num % 2 === 0) ? 'even' : (num !== 0 ? 'odd' : 'none');
        const dozen = (num >= 1 && num <= 12) ? 1 : 
                      (num >= 13 && num <= 24) ? 2 : 
                      (num >= 25 && num <= 36) ? 3 : 0;

        // Check if Jackpot hit (all 3 conditions met)
        let isJackpot = false;
        if (state.phase === 'red_odd' && color === 'red' && parity === 'odd' && dozen === 1) {
            isJackpot = true;
        } else if (state.phase === 'black_even' && color === 'black' && parity === 'even' && dozen === 1) {
            isJackpot = true;
        }

        if (isJackpot) {
            // Reset progression and switch phase
            state.currentLevel = 1;
            state.phase = state.phase === 'red_odd' ? 'black_even' : 'red_odd';
        } else {
            // Calculate Net Profit of the last spin to determine progression
            const totalBet = state.lastBetAmounts.color + state.lastBetAmounts.parity + state.lastBetAmounts.dozen;
            let totalWin = 0;

            if (state.phase === 'red_odd') {
                if (color === 'red') totalWin += state.lastBetAmounts.color * 2;
                if (parity === 'odd') totalWin += state.lastBetAmounts.parity * 2;
                if (dozen === 1) totalWin += state.lastBetAmounts.dozen * 3;
            } else {
                if (color === 'black') totalWin += state.lastBetAmounts.color * 2;
                if (parity === 'even') totalWin += state.lastBetAmounts.parity * 2;
                if (dozen === 1) totalWin += state.lastBetAmounts.dozen * 3;
            }

            // If we suffered a net loss on the spin, increase the linear progression level
            if (totalWin < totalBet) {
                state.currentLevel += 1;
            }
            // If totalWin >= totalBet (Partial Win), we hold the current level (do nothing)
        }
    }

    // 3. Define Base Unit Amounts
    // The video uses a 3:3:2 ratio ($15:$15:$10). We scale this based on the config's minimum outside limit.
    const baseUnit = Math.max(config.betLimits.minOutside, 5); // Defaulting to 5 if minOutside is extremely low
    const baseColorAmt = 3 * (baseUnit / 5); 
    const baseParityAmt = 3 * (baseUnit / 5);
    const baseDozenAmt = 2 * (baseUnit / 5);

    // 4. Calculate Current Bet Amounts based on progression level
    let betColorAmt = baseColorAmt * state.currentLevel;
    let betParityAmt = baseParityAmt * state.currentLevel;
    let betDozenAmt = baseDozenAmt * state.currentLevel;

    // 5. Clamp to Table Limits
    betColorAmt = Math.min(Math.max(betColorAmt, config.betLimits.minOutside), config.betLimits.max);
    betParityAmt = Math.min(Math.max(betParityAmt, config.betLimits.minOutside), config.betLimits.max);
    betDozenAmt = Math.min(Math.max(betDozenAmt, config.betLimits.minOutside), config.betLimits.max);

    // Save for next spin's evaluation
    state.lastBetAmounts = {
        color: betColorAmt,
        parity: betParityAmt,
        dozen: betDozenAmt
    };

    // 6. Build the Bets Array
    let bets = [];
    if (state.phase === 'red_odd') {
        bets.push({ type: 'red', amount: betColorAmt });
        bets.push({ type: 'odd', amount: betParityAmt });
        bets.push({ type: 'dozen', value: 1, amount: betDozenAmt });
    } else {
        bets.push({ type: 'black', amount: betColorAmt });
        bets.push({ type: 'even', amount: betParityAmt });
        bets.push({ type: 'dozen', value: 1, amount: betDozenAmt });
    }

    // Pre-flight bankroll check - ensure we have enough to cover the total bet
    const totalCurrentBet = betColorAmt + betParityAmt + betDozenAmt;
    if (totalCurrentBet > bankroll) {
        // If we don't have enough to cover the full spread, either bet remaining bankroll proportionally or stop.
        // Returning empty array stops betting.
        return []; 
    }

    return bets;
}