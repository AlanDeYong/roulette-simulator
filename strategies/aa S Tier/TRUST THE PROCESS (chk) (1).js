/**
 * STRATEGY: Zonal Progression (Safer Linear Variation)
 * * * SOURCE: 
 * - Channel: Bet With Mo
 * - Video: https://www.youtube.com/watch?v=__svmhqJf5k
 * - Note: Progression heavily modified via custom ruleset (Safer Linear Variation).
 * * * THE FULL LOGIC IN DETAILS:
 * - The strategy places straight-up and street bets across specific mathematical "Zones".
 * - It relies on directional mapping, toggling between Left-To-Right (LTR) and Right-To-Left (RTL) mapping on resets.
 * - LTR Zones: 
 * - Z1: Numbers 2,3,5,6,8,9 + Streets 1,4,7
 * - Z2: Numbers 14,15,17,18,20,21 + Streets 13,16,19
 * - Z3: Numbers 26,27,29,30 + Streets 25,28
 * - RTL Zones: 
 * - Z1: Numbers 29,30,32,33,35,36 + Streets 28,31,34
 * - Z2: Numbers 17,18,20,21,23,24 + Streets 16,19,22
 * - Z3: Numbers 8,9,11,12 + Streets 7,10
 * - A "Win" is strictly defined as a spin where the payout is greater than the total bet amount (net profit > 0). 
 * - A partial payout that results in a net bankroll drop is treated as a Loss.
 * * * THE FULL BET PROGRESSION IN DETAILS:
 * - Start (Stage 0): Bet 1 base unit on Zone 1.
 * - First Loss (Stage 1): Maintain base unit multiplier (1x), rebet Zone 1 and add Zone 2.
 * - Second Loss (Stage 2): Double the unit multiplier (2x), rebet Zone 1 & 2, and add Zone 3.
 * - Subsequent Losses (Stage 3+): Rebet all 3 Zones and increase the unit multiplier linearly by 2 (the Stage 2 amount) instead of doubling.
 * - On Win (Net Profit > 0): 
 * - If bankroll is less than the session peak bankroll: Rebet the exact same setup (maintain current stage, active zones, and multiplier).
 * - If bankroll reaches or exceeds the session peak bankroll: Reset the progression to Stage 0, reset multiplier to 1 base unit, and swap the betting direction (LTR <-> RTL).
 * * * THE GOAL:
 * - Recover drawdowns systematically by expanding board coverage and scaling bet sizes linearly rather than exponentially, protecting against rapid bust scenarios.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. CONFIGURATION & CONSTANTS
    const MIN_CHIP = config.betLimits.min || 1;
    const MAX_BET = config.betLimits.max || 500;

    const LTR = {
        z1: { numbers: [2, 3, 5, 6, 8, 9], streets: [1, 4, 7] },
        z2: { numbers: [14, 15, 17, 18, 20, 21], streets: [13, 16, 19] },
        z3: { numbers: [26, 27, 29, 30], streets: [25, 28] }
    };

    const RTL = {
        z1: { numbers: [29, 30, 32, 33, 35, 36], streets: [28, 31, 34] },
        z2: { numbers: [17, 18, 20, 21, 23, 24], streets: [16, 19, 22] },
        z3: { numbers: [8, 9, 11, 12], streets: [7, 10] }
    };

    // 2. STATE INITIALIZATION
    if (state.stage === undefined) state.stage = 0; 
    if (!state.direction) state.direction = 'LTR'; 
    if (state.multiplier === undefined) state.multiplier = 1;
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;
    if (state.lastBetAmount === undefined) state.lastBetAmount = 0;

    // 3. ANALYZE PREVIOUS SPIN (If not first spin)
    if (spinHistory.length > 0) {
        // Calculate net profit for the round
        const roundProfit = bankroll - state.lastBankroll;
        
        // STRICT WIN DETECTION: Must have a positive net profit. 
        // A partial win (net loss) is treated as a loss and triggers progression.
        const isWin = roundProfit > 0; 
        
        if (isWin) {
            if (bankroll >= state.peakBankroll) {
                // Session peak reached: Reset and swap directions
                state.stage = 0;
                state.multiplier = 1;
                state.direction = state.direction === 'LTR' ? 'RTL' : 'LTR';
            }
            // Else rebet: Do nothing (preserves stage, multiplier, and direction)
        } else {
            // Progression on loss (or net loss)
            state.stage++;
            if (state.stage === 1) {
                state.multiplier = 1; // Add Z2, unit remains base
            } else if (state.stage === 2) {
                state.multiplier = 2; // Add Z3, double up to 2x
            } else if (state.stage > 2) {
                state.multiplier += 2; // Safer variation: increase by Stage 2 amount linearly
            }
        }
    }

    // Update bankroll records for the next spin evaluation
    state.peakBankroll = Math.max(state.peakBankroll, bankroll);
    state.lastBankroll = bankroll;

    // 4. DETERMINE ACTIVE ZONES & BET SIZE
    const currentZones = state.direction === 'LTR' ? LTR : RTL;
    
    let activeZones = [currentZones.z1];
    if (state.stage >= 1) activeZones.push(currentZones.z2);
    if (state.stage >= 2) activeZones.push(currentZones.z3);

    // Calculate Chip Value and Clamp to Limits
    let chipValue = MIN_CHIP * state.multiplier;
    chipValue = Math.max(chipValue, config.betLimits.min); 
    chipValue = Math.min(chipValue, MAX_BET); 
    
    // 5. CONSTRUCT BETS
    const bets = [];
    let totalBetForTurn = 0;

    activeZones.forEach(zone => {
        // Place Straight Up Bets
        zone.numbers.forEach(num => {
            bets.push({
                type: 'number',
                value: num,
                amount: chipValue
            });
            totalBetForTurn += chipValue;
        });

        // Place Street Bets
        zone.streets.forEach(streetStart => {
            bets.push({
                type: 'street',
                value: streetStart,
                amount: chipValue
            });
            totalBetForTurn += chipValue;
        });
    });

    // Save total bet amount to accurately check wins next turn
    state.lastBetAmount = totalBetForTurn;

    // 6. CHECK FUNDS & RETURN
    if (totalBetForTurn > bankroll) {
        return []; // Insufficient funds to execute the strategy
    }

    return bets;
}