
/**
 * Strategy: The Expander (Coverage Builder)
 * * Source: 
 * Video: "This Roulette Method Builds Coverage Instead of Chasing Wins"
 * Channel: Casino Matchmaker
 * URL: https://www.youtube.com/watch?v=7NMz2PjwREg
 * * The Logic:
 * This strategy focuses on increasing table coverage ("Expanding") after losses rather 
 * than just increasing bet amounts. It turns losing numbers into winning/covered numbers 
 * in subsequent spins.
 * * 1. Start with "Level 1" coverage (small set of Splits/Streets).
 * 2. On Loss: Expand to the next level (add more Splits/Streets) to cover more holes.
 * 3. On Win: Check if specific profit target is met.
 * - If Target Met: Reset to Level 1.
 * - If Target Not Met: Repeat same bet (Oscar's Grind style).
 * * The Progression (Bet Sizing):
 * - Level 1 & 2: Base Unit size.
 * - Level 3+: Increase unit size by +1 Base Unit per level to account for the 
 * diluted payout caused by high table coverage.
 * * The Goal:
 * - Hit a session profit target (e.g., +20 units) then strictly reset coverage.
 * - Avoid covering the whole table without increasing bet size (which leads to "winning" spins that lose money).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const TARGET_PROFIT_UNITS = 10; // Target +10 units profit before resetting (Video uses $20 on $4 unit)
    const MIN_BET = config.betLimits.min;
    
    // Define the Expansion Stages (adding coverage pieces by piece)
    // We use a pattern of 1 Street + 1 Split per level to spread coverage evenly.
    const EXPANSION_MAP = [
        // Level 1: Street 1-3, Split 8/11
        [{ type: 'street', value: 1 }, { type: 'split', value: [8, 11] }],
        
        // Level 2 adds: Street 13-15, Split 17/20
        [{ type: 'street', value: 13 }, { type: 'split', value: [17, 20] }],
        
        // Level 3 adds: Street 22-24, Split 26/29
        [{ type: 'street', value: 22 }, { type: 'split', value: [26, 29] }],
        
        // Level 4 adds: Street 31-33, Split 32/35 (Overlapping slightly to boost density)
        [{ type: 'street', value: 31 }, { type: 'split', value: [32, 35] }],
        
        // Level 5 adds: Street 4-6, Split 10/13
        [{ type: 'street', value: 4 }, { type: 'split', value: [10, 13] }],
        
        // Level 6 adds: Street 25-27, Split 0/2 (Covering Zero here)
        [{ type: 'street', value: 25 }, { type: 'split', value: [0, 2] }]
    ];

    // 2. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.currentUnit = MIN_BET;
        state.sessionStartBankroll = bankroll;
        state.lastBetAmount = 0;
    }

    // 3. Process Last Spin (if exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Determine if we won the previous round based on bankroll delta
        // (Approximation: Current Bankroll vs Bankroll before last bet)
        // Since we don't have 'prevBankroll' stored explicitly, we calculate purely on logic:
        const currentProfit = bankroll - state.sessionStartBankroll;
        const targetAmount = TARGET_PROFIT_UNITS * MIN_BET;

        // Did we hit the profit target?
        if (currentProfit >= targetAmount) {
            // WIN & TARGET MET: Reset everything
            state.level = 1;
            state.currentUnit = MIN_BET;
            state.sessionStartBankroll = bankroll; // Reset baseline
        } else {
            // Check immediate spin result logic
            // We need to know if the last specific spin was a "Win" (payout > cost) or "Loss"
            // To do this simply without complex payout calc, we rely on the expansion logic:
            // If bankroll went DOWN compared to (bankroll + lastBetCost), we lost.
            // If bankroll went UP, we won.
            
            // Heuristic: If we are 'down' from the start of this specific sequence, 
            // and the last spin didn't fix it, we expand.
            
            // Simplification for Simulator:
            // If we won (payout > 0) -> Repeat or Reset (handled above).
            // If we lost (payout == 0) -> Expand.
            
            // Since we can't easily see payout > 0 without calculating it, 
            // we assume if bankroll > previous_state_bankroll (which we can't see),
            // let's use a simpler logic flow:
            
            // A "Loss" in this strategy is usually defined as not hitting a covered number.
            // We have to calculate if the last number was covered by our active bets.
            // However, strictly following the video: "Loser -> Repeat and Expand".
            
            // We'll trust the "Expand on Loss" logic.
            // We need to determine if we actually lost the last spin. 
            // Since `utils` might not give payout, we assume loss if bankroll dropped.
            // Note: This relies on the simulator executing sequentially.
            
            // Let's assume a loss if we haven't reset above, and we need to decide to Expand or Stay.
            // We need to store 'previousBankroll' in state to detect loss accurately.
            if (state.previousBankroll !== undefined) {
                if (bankroll < state.previousBankroll) {
                    // LOSS: Expand
                    state.level++;
                    
                    // Cap level at max defined stages
                    if (state.level > EXPANSION_MAP.length) {
                         state.level = EXPANSION_MAP.length; // Cap expansion
                    }
                    
                    // Progression Rule: Level 3+ adds units
                    // Video: "At Level 3 we add a unit"
                    if (state.level >= 3) {
                        // Formula: Base + (Level - 2) * Base
                        // Lvl 3 = 2 units, Lvl 4 = 3 units
                        state.currentUnit = MIN_BET * (state.level - 1); 
                    } else {
                        state.currentUnit = MIN_BET;
                    }

                } else {
                    // WIN (but target not met): Repeat same bet
                    // Do not change level or unit
                }
            }
        }
    }

    // 4. Construct Bets based on Current Level
    let bets = [];
    
    // Aggregate all bet definitions from Stage 0 up to Current Level
    for (let i = 0; i < state.level; i++) {
        if (EXPANSION_MAP[i]) {
            let stageBets = EXPANSION_MAP[i];
            
            stageBets.forEach(b => {
                // CLAMP BET LIMITS
                let finalAmount = state.currentUnit;
                finalAmount = Math.max(finalAmount, config.betLimits.min);
                finalAmount = Math.min(finalAmount, config.betLimits.max);

                bets.push({
                    type: b.type,
                    value: b.value,
                    amount: finalAmount
                });
            });
        }
    }

    // 5. Update State for next turn
    state.previousBankroll = bankroll;
    
    // Calculate total cost for checking bankroll sufficiency
    const totalBetCost = bets.reduce((sum, b) => sum + b.amount, 0);
    
    // Safety: If not enough money, return empty (stop playing)
    if (totalBetCost > bankroll) {
        return [];
    }

    return bets;

}