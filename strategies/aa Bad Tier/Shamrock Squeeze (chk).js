/**
 * Shamrock Squeeze Roulette Strategy
 * * Source: https://www.youtube.com/watch?v=fycEe_7HNfs (The Lucky Felt)
 * * The Full Logic in details: 
 * The strategy casts a wide net over 18 numbers and "squeezes" the trap tighter 
 * with every losing or partially losing spin by adding smaller, more concentrated 
 * inside bets. The target side (High/Low) follows the last winning number 
 * ("Follow the Winner"). If a spin results in a net win (profit > 0), the trap 
 * resets back to a wide 18-number bet. If a spin results in a net loss (which 
 * includes partial hits that don't cover the total bet amount), the trap tightens 
 * by progressing to the next level.
 * * The Full Bet Progression in details:
 * Level 1: Even Money (High or Low)
 * Level 2: Adds Dozen (overlapping the Even Money)
 * Level 3: Adds Double Street / Line (overlapping the Dozen)
 * Level 4: Adds Corner (overlapping the Line)
 * Level 5: Adds Street (overlapping the Corner)
 * Level 6: Adds Split (overlapping the Street)
 * Level 7+: Adds Single Number (overlapping the Split)
 * On every loss, the bets are increased by their respective base bet amount 
 * (1 unit of their respective minimum limit). A net win resets the progression 
 * back to Level 1.
 * * The Goal:
 * To hit a highly concentrated "jackpot" number for a massive payout, targeting 
 * a 20% session profit. The strategy relies on hitting the core of the trap to 
 * recoup smaller partial losses and secure quick profits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Calculate Profit from Last Spin
    if (state.lastBankroll !== undefined) {
        let profit = bankroll - state.lastBankroll;
        if (profit > 0) {
            state.N = 1; // Reset trap on net win
        } else {
            state.N++;   // Tighten trap on loss or partial loss
        }
    } else {
        state.N = 1;     // Initial spin
    }
    
    // Update lastBankroll for the next spin's profit calculation
    state.lastBankroll = bankroll;

    // 2. Determine Target Anchor (Follow the Winner)
    if (!state.anchor) state.anchor = 'high'; // Default starting side

    if (spinHistory.length > 0) {
        let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        if (lastNum >= 1 && lastNum <= 18) {
            state.anchor = 'low';
        } else if (lastNum >= 19 && lastNum <= 36) {
            state.anchor = 'high';
        }
        // If 0 or 00, maintain the previous anchor
    }

    let isHigh = state.anchor === 'high';
    let N = state.N;
    let bets = [];

    // Helper to calculate amounts based on respective base bet sizes
    function getAmount(level, isOutside) {
        // The respective base bet amount for this type of bet
        const baseBet = isOutside ? config.betLimits.minOutside : config.betLimits.min;
        
        // The bet size increases by the base bet amount for each progression level
        let amount = level * baseBet;
        
        // Clamp to limits
        amount = Math.max(amount, baseBet);
        amount = Math.min(amount, config.betLimits.max);
        
        return amount;
    }

    // 3. Build Bets based on Progression Level (N)
    if (N >= 1) bets.push({ type: isHigh ? 'high' : 'low', amount: getAmount(N, true) });
    if (N >= 2) bets.push({ type: 'dozen', value: isHigh ? 3 : 1, amount: getAmount(N - 1, true) });
    if (N >= 3) bets.push({ type: 'line', value: isHigh ? 31 : 1, amount: getAmount(N - 2, false) });
    if (N >= 4) bets.push({ type: 'corner', value: isHigh ? 32 : 1, amount: getAmount(N - 3, false) });
    if (N >= 5) bets.push({ type: 'street', value: isHigh ? 34 : 1, amount: getAmount(N - 4, false) });
    if (N >= 6) bets.push({ type: 'split', value: isHigh ? [35, 36] : [1, 2], amount: getAmount(N - 5, false) });
    if (N >= 7) bets.push({ type: 'number', value: isHigh ? 36 : 1, amount: getAmount(N - 6, false) });

    return bets;
}