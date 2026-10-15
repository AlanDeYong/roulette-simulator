/**
 * Roulette Strategy: No-Gap Strategy (Zero Gap Money Method) - Peak Profit Reset
 * * Source: https://youtu.be/Of3CwZAwKJA (YouTube Channel: The Roulette Master)
 * * The Full Logic in details:
 * The strategy leverages groups of continuous "no-gap" sections around the 0 (and 00) on the wheel.
 * Straight-up bets are placed on 16 specific numbers that form unbroken physical chains on the wheel layout.
 * Heavy bets are placed on the 1st and 3rd Dozens, as all 16 targeted numbers fall within them,
 * triggering a double-payout when hit.
 * * The Full Bet Progression in details:
 * - Initial bets: 1 base unit on each straight-up number, 25 base units on the 1st Dozen, and 25 units on the 3rd Dozen.
 * - Small Loss (0 or 00 hits): The rule is to rebet the exact same amounts without increasing.
 * - Full Loss: If the ball lands in a completely uncovered pocket, the bet amounts increase by their respective base amounts.
 * - Win (Sub-Peak): If a spin is won but the overall bankroll has NOT recovered to its highest point (peak profit), 
 * the bet amounts remain at their current elevated levels to accelerate recovery.
 * - Peak Profit Reached: Bets ONLY reset to base amounts when the current bankroll reaches or exceeds the highest recorded bankroll of the session.
 * * The Goal:
 * Safely build profit utilizing roughly 80% board coverage. Hold elevated bets during recovery phases, 
 * and reset progressions only when a new session high-water mark is established.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base units
    const straightBase = config.betLimits.min;
    const dozenBase = Math.max(straightBase * 25, config.betLimits.minOutside);
    
    // 2. Define valid straight-up coverage dynamically based on the wheel layout
    let coveredNumbers = [];
    if (config.tableType === 'american') {
        coveredNumbers = [0, '00', 1, 2, 7, 8, 9, 10, 11, 12, 25, 26, 27, 28, 29, 30, 37];
    } else {
        coveredNumbers = [0, 3, 6, 7, 8, 11, 12, 26, 27, 28, 29, 30, 32, 34, 35, 36];
    }
    
    // 3. Initialize Persistent State
    if (state.straightBet === undefined) state.straightBet = straightBase;
    if (state.dozenBet === undefined) state.dozenBet = dozenBase;
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;
    
    // 4. Evaluate Previous Spin & Run Progression Logic
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Green pockets generate a "small loss" under this system
        const isSmallLoss = (num === 0 || num === '00' || num === 37);
        
        if (!isSmallLoss) {
            const isCoveredNumber = coveredNumbers.includes(num);
            const isFirstDozen = (num >= 1 && num <= 12);
            const isThirdDozen = (num >= 25 && num <= 36);
            
            // Calculate payout vs cost
            let payout = 0;
            if (isCoveredNumber) payout += state.straightBet * 36;
            if (isFirstDozen) payout += state.dozenBet * 3;
            if (isThirdDozen) payout += state.dozenBet * 3;
            
            const straightBetCount = 16;
            const totalCost = (straightBetCount * state.straightBet) + (2 * state.dozenBet);
            
            // On a loss, increase bets by base amounts
            // On a win, do NOT reset yet. Just maintain current bet levels.
            if (payout <= totalCost) {
                state.straightBet += straightBase;
                state.dozenBet += dozenBase;
            }
        }
    }
    
    // 5. Global Reset Logic: Only reset if session's peak profit is reached
    if (bankroll >= state.peakBankroll) {
        state.peakBankroll = bankroll; // Update new high-water mark
        state.straightBet = straightBase; // Reset Progression
        state.dozenBet = dozenBase;
    }
    
    // 6. Clamp Values to Limits
    state.straightBet = Math.max(state.straightBet, config.betLimits.min);
    state.straightBet = Math.min(state.straightBet, config.betLimits.max);
    
    state.dozenBet = Math.max(state.dozenBet, config.betLimits.minOutside);
    state.dozenBet = Math.min(state.dozenBet, config.betLimits.max);
    
    // 7. Build and Return Output Array
    const bets = [];
    
    bets.push({ type: 'dozen', value: 1, amount: state.dozenBet });
    bets.push({ type: 'dozen', value: 3, amount: state.dozenBet });
    
    for (const number of coveredNumbers) {
        if (number === 37) continue; 
        bets.push({ type: 'number', value: number, amount: state.straightBet });
    }
    
    return bets;
}