/**
 * STRATEGY: Kirby's Dozens
 * * SOURCE: 
 * "The Roulette Master" on YouTube
 * Video: https://www.youtube.com/watch?v=uhtbz4J8swg
 * * THE LOGIC:
 * This strategy bets on two of the three dozens simultaneously, covering ~66% of the board.
 * The selection criteria is to "Leave out the dozen that hit last."
 * - If Dozen 1 hit last, we bet on Dozen 2 and Dozen 3.
 * - If Dozen 2 hit last, we bet on Dozen 1 and Dozen 3.
 * - If Dozen 3 hit last, we bet on Dozen 1 and Dozen 2.
 * - If Zero hits, we repeat the previous exclusion logic (treat as a loss).
 * * THE PROGRESSION (Martingale-style Aggression):
 * The strategy uses a 4-level progression to recover losses and profit.
 * Multipliers based on a standard unit (usually $5 in the video):
 * 1. Level 1: 1 unit on each dozen (Video: $5)
 * 2. Level 2: 4 units on each dozen (Video: $20)
 * 3. Level 3: 20 units on each dozen (Video: $100)
 * 4. Level 4: 50 units on each dozen (Video: $250)
 * * - Win: Reset to Level 1.
 * - Loss: Move to next Level.
 * - Max Loss: If Level 4 loses, reset to Level 1 (Stop Loss logic to prevent total wipeout).
 * * THE GOAL:
 * Grind small profits by leveraging the high probability (66%) of winning, using 
 * aggressive progression to recover occasional losses in a single spin.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    // The video uses $5, $20, $100, $250. We convert this to multipliers of the minOutside bet.
    // Multipliers: 1x, 4x, 20x, 50x
    const MULTIPLIERS = [1, 4, 20, 50];
    const BASE_UNIT = config.betLimits.minOutside;

    // Helper to identify dozen (0=Zero, 1=1-12, 2=13-24, 3=25-36)
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        return Math.ceil(num / 12);
    };

    // 2. Initialize State
    if (state.level === undefined) state.level = 0;
    if (state.lastBetDozenExcluded === undefined) state.lastBetDozenExcluded = null; // The dozen we avoided last time

    // 3. Determine Win/Loss & Update Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozenHit = getDozen(lastNum);

        // Did we win? 
        // We win if the dozen that hit matches one of the two we bet on.
        // Conversely, we LOSE if the dozen that hit was the one we Excluded, OR if it was Zero.
        let won = false;
        
        // We only check win status if we actually made a bet last time
        if (state.lastBetDozenExcluded !== null) {
            if (lastDozenHit === 0) {
                won = false; // Zero is always a loss in this setup
            } else if (lastDozenHit === state.lastBetDozenExcluded) {
                won = false; // The dozen we avoided actually hit
            } else {
                won = true; // One of the other two dozens hit
            }
        }

        if (won) {
            state.level = 0; // Reset on win
        } else {
            state.level++; // Increase aggression on loss
            // Safety cap: If we lose the max level, reset to start to preserve remaining bankroll
            if (state.level >= MULTIPLIERS.length) {
                state.level = 0;
            }
        }
    }

    // 4. Determine Betting Logic (Which Dozens?)
    let dozenToExclude;

    if (spinHistory.length === 0) {
        // First spin default: Avoid Dozen 3 (Arbitrary start)
        dozenToExclude = 3;
    } else {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozenHit = getDozen(lastNum);

        if (lastDozenHit === 0) {
            // If Zero hit, we can't "exclude the last dozen". 
            // Logic: Stick with the previous exclusion (persist through zero) or default to 3.
            dozenToExclude = state.lastBetDozenExcluded || 3;
        } else {
            // Standard logic: Exclude the dozen that just hit.
            // "If 2nd Dozen hit, bet on 1st and 3rd." -> Exclude 2.
            dozenToExclude = lastDozenHit;
        }
    }

    // Save for next spin comparison
    state.lastBetDozenExcluded = dozenToExclude;

    // 5. Calculate Bet Amount
    const currentMultiplier = MULTIPLIERS[state.level];
    let rawAmount = BASE_UNIT * currentMultiplier;

    // 6. Clamp to Limits
    // Ensure bet is at least the table minimum (outside)
    let amount = Math.max(rawAmount, config.betLimits.minOutside);
    // Ensure bet does not exceed table maximum
    amount = Math.min(amount, config.betLimits.max);

    // 7. Construct Bets
    // We bet on everything EXCEPT the excluded dozen.
    const bets = [];
    
    // Dozen 1
    if (dozenToExclude !== 1) {
        bets.push({ type: 'dozen', value: 1, amount: amount });
    }
    // Dozen 2
    if (dozenToExclude !== 2) {
        bets.push({ type: 'dozen', value: 2, amount: amount });
    }
    // Dozen 3
    if (dozenToExclude !== 3) {
        bets.push({ type: 'dozen', value: 3, amount: amount });
    }

    return bets;
}