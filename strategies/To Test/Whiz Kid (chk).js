/**
 * Whiz Kid Roulette Strategy
 * 
 * Source: https://www.youtube.com/watch?v=a8Rq-g0f3-Y (Analyzed via Video Summary)
 * 
 * The Logic: 
 * The system starts by covering a significant portion of the board using 7 splits 
 * and a single straight-up bet on 0. It relies on high board coverage to secure 
 * frequent, incremental wins.
 * 
 * The Progression:
 * - On a Loss: The strategy aggressively doubles the bet size on all active positions 
 *   AND adds one additional split to the board to increase coverage.
 * - On a Win: The strategy removes the last added split (returning towards the base 7 splits) 
 *   and resets the bet size back to the base minimum to lock in the profit margin.
 * 
 * The Goal:
 * To survive short losing streaks through aggressive doubling and increased coverage, 
 * locking in a profit when a win eventually hits. The primary risk is a prolonged 
 * losing streak depleting the bankroll or hitting table limits due to the doubling progression.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the sequence of bets (0 Straight Up + Initial 7 Splits + Additional Splits)
    const betSequence = [
        { type: 'number', value: 0 },          // Index 0: Zero
        { type: 'split', value: [8, 11] },     // Index 1: Initial Split 1
        { type: 'split', value: [13, 14] },    // Index 2: Initial Split 2
        { type: 'split', value: [15, 18] },    // Index 3: Initial Split 3
        { type: 'split', value: [17, 20] },    // Index 4: Initial Split 4
        { type: 'split', value: [27, 30] },    // Index 5: Initial Split 5
        { type: 'split', value: [28, 29] },    // Index 6: Initial Split 6
        { type: 'split', value: [32, 35] },    // Index 7: Initial Split 7
        // --- Additional splits to add on loss ---
        { type: 'split', value: [1, 2] },      // Index 8: Add on 1st loss
        { type: 'split', value: [4, 5] },      // Index 9: Add on 2nd loss
        { type: 'split', value: [19, 22] },    // Index 10: Add on 3rd loss
        { type: 'split', value: [23, 26] },    // Index 11: Add on 4th loss
        { type: 'split', value: [31, 34] },    // Index 12: Add on 5th loss
        { type: 'split', value: [33, 36] }     // Index 13: Add on 6th loss
    ];

    const INITIAL_SPOTS = 8; // 1 straight up + 7 splits

    // 2. Initialize State
    if (state.activeSpots === undefined) {
        state.activeSpots = INITIAL_SPOTS;
        state.multiplier = 1;
        state.lastBets = [];
    }

    // 3. Determine Win/Loss from previous spin
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        let wonLastSpin = false;

        // Check if the last winning number was covered by our previous bets
        for (const b of state.lastBets) {
            if (b.type === 'number' && b.value === lastSpin) {
                wonLastSpin = true;
                break;
            } else if (b.type === 'split' && b.value.includes(lastSpin)) {
                wonLastSpin = true;
                break;
            }
        }

        // 4. Apply Progression Logic
        if (wonLastSpin) {
            // WIN: Remove the last added split (minimum is the initial 8 spots)
            state.activeSpots = Math.max(INITIAL_SPOTS, state.activeSpots - 1);
            // WIN: Reset bet size to base to lock in profit
            state.multiplier = 1; 
        } else {
            // LOSS: Add an additional split (maximum is the total available in our sequence)
            state.activeSpots = Math.min(betSequence.length, state.activeSpots + 1);
            // LOSS: Aggressively double the bet size
            state.multiplier *= 2;
        }
    }

    // 5. Calculate and Clamp Bet Amount
    // Determine the base unit for inside bets
    const baseUnit = config.betLimits.min; 
    let currentBetAmount = baseUnit * state.multiplier;

    // Clamp the bet amount to strictly adhere to table limits
    currentBetAmount = Math.max(currentBetAmount, config.betLimits.min);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    // 6. Generate the Array of Bets
    let currentBets = [];
    
    // Safety check: if bankroll is too low to place all required bets at current multiplier,
    // we must fall back to placing what we can at the minimum bet, or stop.
    // (Assuming the simulator handles insufficient funds gracefully, but we construct the array anyway).
    for (let i = 0; i < state.activeSpots; i++) {
        currentBets.push({
            type: betSequence[i].type,
            value: betSequence[i].value,
            amount: currentBetAmount
        });
    }

    // Save bets to state so we can check if they won on the next spin
    state.lastBets = currentBets;

    return currentBets;
}