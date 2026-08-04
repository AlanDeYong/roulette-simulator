/**
 * Strategy Name: My Layout
 * Source: https://youtu.be/eP--tGAkOH4 (The Roulette Master / Charles Morris)
 *
 * The Full Logic in details:
 * - This strategy strategically covers 21 numbers on the board using a 5:1 bet ratio. 
 * - It places a large outside bet on Low (1-18) and five smaller inside Street bets (7, 10, 13, 16, 19).
 * - Coverage Outcomes:
 *   * Numbers 1-6: Covered only by the Low bet. Results in a perfect Break-Even (Net 0).
 *   * Numbers 7-18: Covered by BOTH the Low bet and a Street bet. Results in a Large Win.
 *   * Numbers 19-21: Covered only by a Street bet. Results in a Small Win.
 *   * Numbers 22-36, 0, 00: Uncovered. Results in a Net Loss.
 *
 * The Full Bet Progression in details:
 * - The strategy uses a slow, linear multiplier progression to recover from losses without risking massive bets.
 * - Multiplier starts at 1.
 * - After a Net Loss: Multiplier increases by 1 (e.g., from 1x base to 2x base bets).
 * - After a Break Even (Numbers 1-6): Multiplier remains unchanged.
 * - After a Net Win: Multiplier remains unchanged UNTIL your bankroll reaches or exceeds its previous 
 *   highest peak (high watermark) before the losing streak began.
 * - Once the bankroll is fully recovered, the multiplier resets to 1.
 *
 * The Goal:
 * - Consistently grind out small to medium profits with a high hit rate, using a manageable recovery 
 *   progression when long streaks of high numbers (22-36) hit. No hardcoded stop-loss is set; play until 
 *   you reach your personal session target.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State and High Watermark
    if (state.progression === undefined) {
        state.progression = 1;
        state.referenceBankroll = bankroll;
    } else if (bankroll > state.referenceBankroll && state.progression === 1) {
        // Keep reference bankroll updated during winning streaks at base level
        state.referenceBankroll = bankroll;
    }

    // 2. Evaluate the Last Spin to Adjust Progression
    if (spinHistory.length > 0 && state.lastBets) {
        let lastSpin = spinHistory[spinHistory.length - 1];
        
        // Parse securely to handle American '00' string properly
        let n = parseInt(lastSpin.winningNumber, 10);
        if (isNaN(n)) n = -1; // 00 maps to -1 for safe math checking
        
        let totalBet = 0;
        let totalWin = 0;
        
        // Calculate the total return of the previous spin's layout
        for (let b of state.lastBets) {
            totalBet += b.amount;
            
            // Check Low win (Pays 1:1, so returns 2x amount)
            if (b.type === 'low' && n >= 1 && n <= 18) {
                totalWin += b.amount * 2;
            }
            
            // Check Street win (Pays 11:1, so returns 12x amount)
            if (b.type === 'street') {
                if (n >= b.value && n <= b.value + 2) {
                    totalWin += b.amount * 12;
                }
            }
        }
        
        let netProfit = totalWin - totalBet;
        
        if (netProfit < 0) {
            // Net loss: Increase the progression level
            state.progression += 1;
        } else if (netProfit > 0) {
            // Net win: Check if bankroll has recovered to the high watermark
            if (bankroll >= state.referenceBankroll) {
                state.progression = 1; // Reset progression
                state.referenceBankroll = bankroll; // Establish new high watermark
            }
            // If we won but haven't fully recovered, progression stays exactly the same
        }
        // If netProfit === 0 (Break even), progression stays exactly the same
    }

    // 3. Determine Base Units (Crucial to maintain 5:1 ratio for break-even math)
    let baseStreet = config.betLimits.min;
    let baseLow = baseStreet * 5;

    // Ensure the Low bet satisfies the minimum outside bet limits
    if (baseLow < config.betLimits.minOutside) {
        baseLow = config.betLimits.minOutside;
        baseStreet = Math.max(config.betLimits.min, Math.ceil(baseLow / 5));
        // Force the strict 5:1 ratio mathematically
        baseLow = baseStreet * 5; 
    }

    // 4. Calculate Current Bet Multiplier based on config increment mode
    let mult = 1;
    if (state.progression > 1) {
        if (config.incrementMode === 'base') {
            mult = state.progression;
        } else {
            // 'fixed' mode applies the configured step increase to the multiplier
            mult = 1 + (state.progression - 1) * config.minIncrementalBet;
        }
    }

    let currentLowBet = baseLow * mult;
    let currentStreetBet = baseStreet * mult;

    // 5. Clamp Bets strictly to configuration maximums proportionally
    let limitFactor = 1;
    if (currentLowBet > config.betLimits.max) {
        limitFactor = config.betLimits.max / currentLowBet;
    }
    if (currentStreetBet > config.betLimits.max) {
        limitFactor = Math.min(limitFactor, config.betLimits.max / currentStreetBet);
    }
    
    currentLowBet = Math.floor(currentLowBet * limitFactor);
    currentStreetBet = Math.floor(currentStreetBet * limitFactor);

    // 6. Formulate the Full Layout
    let bets = [
        { type: 'low', amount: currentLowBet },
        { type: 'street', value: 7, amount: currentStreetBet },
        { type: 'street', value: 10, amount: currentStreetBet },
        { type: 'street', value: 13, amount: currentStreetBet },
        { type: 'street', value: 16, amount: currentStreetBet },
        { type: 'street', value: 19, amount: currentStreetBet }
    ];

    // Store the layout to evaluate net profit on the next spin
    state.lastBets = bets;

    return bets;
}