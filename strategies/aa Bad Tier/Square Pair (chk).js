/**
 * Square Pair Roulette Strategy (Net Profit Evaluation)
 * 
 * Source: https://youtu.be/PTSlHqn0XrQ (Channel: Gamblers University)
 * 
 * The Full Logic:
 * - Start by betting on a single Dozen (the one that last hit) and 4 specific Corner bets within it.
 * - A spin is ONLY considered a win if the net profit is greater than 0. Minor losses (net profit <= 0) count as losses.
 * - On the first loss, add the exact same pattern to the Dozen that just hit (won on the wheel). Do NOT increase bet sizes yet.
 * - On subsequent losses, increase all bets by their base amounts (increase multiplier by 1).
 * - On a win (net profit > 0), evaluate against session peak profit:
 *    - If bankroll is at or above peak: Reset to base level and bet on the Dozen that just hit.
 *    - If bankroll is below peak: Rebet (maintain current active dozens and amounts).
 * 
 * The Full Bet Progression:
 * - Base Bets: $5 on the Dozen, $1 on each of the 4 Corners.
 * - Progression Level 1: 1 Dozen active, Base bet multiplier = 1x.
 * - Progression Level 2 (1st Loss): 2 Dozens active, Base bet multiplier = 1x.
 * - Progression Level 3+ (Subsequent Losses): 2 Dozens active, Multiplier increases by +1 per loss.
 * - Progression (On Win): Rebet if in drawdown, Reset if at new peak.
 * 
 * The Goal:
 * - Recover drawdowns systematically and capture peak profit milestones.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State & Track Peak Profit
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;
    if (state.progression === undefined) state.progression = 1;
    if (state.activeDozens === undefined) state.activeDozens = [1];
    
    // Update highest recorded bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Define the corners for each dozen
    const corners = {
        1: [1, 2, 4, 5],     // 1st Dozen Corners
        2: [13, 14, 16, 17], // 2nd Dozen Corners
        3: [25, 26, 28, 29]  // 3rd Dozen Corners
    };
    
    // Exact coverage for payout calculation
    const cornerMap = {
        1: [1, 2, 4, 5], 2: [2, 3, 5, 6], 4: [4, 5, 7, 8], 5: [5, 6, 8, 9],
        13: [13, 14, 16, 17], 14: [14, 15, 17, 18], 16: [16, 17, 19, 20], 17: [17, 18, 20, 21],
        25: [25, 26, 28, 29], 26: [26, 27, 29, 30], 28: [28, 29, 31, 32], 29: [29, 30, 32, 33]
    };

    // 2. Determine Base Amounts
    const baseDozen = 5;
    const baseCorner = 1;

    // 3. Handle Progression (Check last result)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Determine which dozen just hit (the "winning" dozen on the wheel)
        let lastHitDozen = 1; 
        if (lastNum >= 1 && lastNum <= 12) lastHitDozen = 1;
        else if (lastNum >= 13 && lastNum <= 24) lastHitDozen = 2;
        else if (lastNum >= 25 && lastNum <= 36) lastHitDozen = 3;
        
        // Calculate exact net profit from the previous spin
        let totalBet = 0;
        let totalWin = 0;
        const prevMultiplier = Math.max(1, state.progression - 1);
        const prevDozenAmount = baseDozen * prevMultiplier;
        const prevCornerAmount = baseCorner * prevMultiplier;

        for (let dozen of state.activeDozens) {
            totalBet += prevDozenAmount + (prevCornerAmount * 4);
            
            const rangeStart = (dozen - 1) * 12 + 1;
            const rangeEnd = dozen * 12;
            if (lastNum >= rangeStart && lastNum <= rangeEnd) {
                totalWin += prevDozenAmount * 3;
            }
            
            for (let c of corners[dozen]) {
                if (cornerMap[c] && cornerMap[c].includes(lastNum)) {
                    totalWin += prevCornerAmount * 9; // Corner pays 8:1 + original bet = 9
                }
            }
        }
        
        const netProfit = totalWin - totalBet;

        if (netProfit > 0) {
            // True win
            if (bankroll >= state.peakBankroll) {
                state.progression = 1;
                state.activeDozens = [lastHitDozen];
            }
            // Else: Not at peak profit -> Rebet (maintain state)
        } else {
            // Loss (including minor losses) -> Increment progression
            state.progression++;
            
            // On 1st loss (progression 2), add 2nd pattern to the dozen that just hit
            if (state.progression === 2) {
                if (!state.activeDozens.includes(lastHitDozen)) {
                    state.activeDozens.push(lastHitDozen);
                } else {
                    const nextAvailable = [1, 2, 3].find(d => !state.activeDozens.includes(d));
                    if (nextAvailable) state.activeDozens.push(nextAvailable);
                }
            }
        }
    }

    // 4. Calculate Amounts based on progression level
    const multiplier = Math.max(1, state.progression - 1);
    
    let dozenAmount = baseDozen * multiplier;
    let cornerAmount = baseCorner * multiplier;

    // 5. CLAMP TO LIMITS
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);
    
    cornerAmount = Math.max(cornerAmount, config.betLimits.min);
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    // 6. Construct and Return Bet Objects
    let bets = [];
    
    for (let dozen of state.activeDozens) {
        bets.push({ type: 'dozen', value: dozen, amount: dozenAmount });
        bets.push({ type: 'corner', value: corners[dozen][0], amount: cornerAmount });
        bets.push({ type: 'corner', value: corners[dozen][1], amount: cornerAmount });
        bets.push({ type: 'corner', value: corners[dozen][2], amount: cornerAmount });
        bets.push({ type: 'corner', value: corners[dozen][3], amount: cornerAmount });
    }

    return bets;
}