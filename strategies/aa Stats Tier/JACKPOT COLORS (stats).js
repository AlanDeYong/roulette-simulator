/**
 * Jackpot Colors Roulette Strategy
 * Source: https://youtu.be/NR8r6TZSk6U (Bet With Mo)
 * * The Full Logic:
 * This strategy covers a significant portion of the board by betting on a color (e.g., Black) 
 * and 9 straight-up numbers of the opposing color (e.g., Low Red). 
 * On a fresh session or after recovering to a new session peak profit, the strategy checks 
 * the past 10 spins to find the trending High/Low and Color patterns. It then bets on the opposing 
 * color of the trend, and straight-up numbers matching the trending pattern's color and 
 * high/low sector. 
 * * The Full Bet Progression:
 * - Base setup: 11 units on the Outside Color bet, 1 unit each on 9 Inside Number bets.
 * - On the next 4 consecutive losses: Increase all bets by their respective base amount 
 * (Multiplier progresses: x1 -> x2 -> x3 -> x4 -> x5). Total units: 20 -> 40 -> 60 -> 80 -> 100.
 * - On the 5th loss: Double up all bets from the previous level (Multiplier jumps to x10, 200 units).
 * - On the 6th loss and beyond: Increase straight-up bets by 5 units and the color bet by 55 units 
 * (Multiplier increases by +5 for each subsequent loss, e.g., to x15, x20, etc.).
 * - On a win: 
 * - If the win pushes the bankroll to a new session peak, completely reset the progression and trends.
 * - If recovering from losses (bankroll below peak), maintain the current multiplier but remove 
 * the winning straight-up number from active bets (if an inside bet won). Up to 4 consecutive 
 * numbers can be removed per cycle.
 * * The Goal:
 * Accumulate consistent small wins with large board coverage. When in a drawdown, aggressively 
 * scale bets using the specified progression to recover and reach a new peak profit, then reset.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize state on first run
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
        state.losses = 0;
        state.multiplier = 1;
        state.removedCount = 0;
        state.initialized = false;
    }

    // 2. Process previous spin result
    if (state.initialized && spinHistory.length > 0) {
        const net = bankroll - state.lastBankroll;
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        if (net > 0) {
            // On win, remove winning straight-up number up to 4 times
            if (state.activeNumbers.includes(lastNum) && state.removedCount < 4) {
                state.activeNumbers = state.activeNumbers.filter(n => n !== lastNum);
                state.removedCount++;
            }
        } else if (net < 0) {
            // On loss, progress multiplier
            state.losses++;
            if (state.losses <= 4) {
                state.multiplier += 1;
            } else if (state.losses === 5) {
                state.multiplier *= 2; // Double up on 5th loss
            } else {
                state.multiplier += 5; // +5 multiplier (which equates to +5 base inside and +55 base outside)
            }
        }
    }

    // 3. Reset condition: Reached new peak profit or first run
    if (!state.initialized || bankroll >= state.peakBankroll) {
        state.peakBankroll = bankroll; // Update to new peak
        
        state.losses = 0;
        state.multiplier = 1;
        state.removedCount = 0;
        
        let highCount = 0;
        let lowCount = 0;
        let redCount = 0;
        let blackCount = 0;
        
        const history = spinHistory.slice(-10); // Check up to last 10 spins
        history.forEach(spin => {
            if (spin.winningNumber >= 1 && spin.winningNumber <= 18) lowCount++;
            if (spin.winningNumber >= 19 && spin.winningNumber <= 36) highCount++;
            if (spin.winningColor === 'red') redCount++;
            if (spin.winningColor === 'black') blackCount++;
        });
        
        // Default to Low Red / Black if equal
        const trendIsHigh = highCount > lowCount; 
        const trendIsRed = redCount >= blackCount;
        
        state.opposingColor = trendIsRed ? 'black' : 'red';
        
        // Define active inside bets based on trending color and high/low half
        if (trendIsRed && !trendIsHigh) {
            state.activeNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18];
        } else if (trendIsRed && trendIsHigh) {
            state.activeNumbers = [19, 21, 23, 25, 27, 30, 32, 34, 36];
        } else if (!trendIsRed && !trendIsHigh) {
            state.activeNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17];
        } else if (!trendIsRed && trendIsHigh) {
            state.activeNumbers = [20, 22, 24, 26, 28, 29, 31, 33, 35];
        }
        
        state.initialized = true;
    }

    // Update last bankroll before returning the new bets
    state.lastBankroll = bankroll;

    // 4. Calculate bet amounts and clamp to config limits
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    const baseUnit = Math.max(1, minInside);
    
    let insideAmount = baseUnit * state.multiplier;
    let outsideAmount = (11 * baseUnit) * state.multiplier;

    // Clamp inside bets
    insideAmount = Math.max(insideAmount, minInside);
    insideAmount = Math.min(insideAmount, maxBet);

    // Clamp outside bet
    outsideAmount = Math.max(outsideAmount, minOutside);
    outsideAmount = Math.min(outsideAmount, maxBet);

    // 5. Construct and return bets array
    const bets = [];
    
    // Outside Color bet
    bets.push({ type: state.opposingColor, amount: outsideAmount });

    // Inside Straight-Up bets
    state.activeNumbers.forEach(num => {
        bets.push({ type: 'number', value: num, amount: insideAmount });
    });

    return bets;
}