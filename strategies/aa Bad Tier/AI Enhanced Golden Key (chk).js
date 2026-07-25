/**
 * AI Enhanced Golden Key Roulette Strategy
 * 
 * Source:
 * - URL: https://youtu.be/KguCqJHox5c
 * - Channel: The Risk and Reward Lab
 * 
 * Strategy Logic:
 * - Table Coverage: Covers 21 of 37/38 numbers on the roulette wheel (~55.3% coverage in European).
 * - Bet Placement (Base Level):
 *   1. 1st Dozen (numbers 1-12): 3 units (e.g., $6 base)
 *   2. Street 13-15 (value 13): 1 unit (e.g., $2 base)
 *   3. Street 16-18 (value 16): 1 unit (e.g., $2 base)
 *   4. Street 19-21 (value 19): 1 unit (e.g., $2 base)
 *   Total Base Bet = 6 units (e.g., $12 total when base street unit = $2).
 * 
 * Progression Logic (Modified Labouchere 1-0-1):
 * - Starts flat at Base Level ($12 total bet) after wins.
 * - On the first loss, progression activates with starting line [1, 0, 1].
 *   The sum of first and last numbers (1 + 1 = 2) is added to the end of the line, creating [1, 0, 1, 2].
 * - While progression is active:
 *   - Bet unit total U = first number + last number in line (or single number if length === 1).
 *   - Total bet amount scales proportionally to U (e.g., $6 * U).
 *   - Dozen bet = 3 * U ($3 * U), each Street bet = 1 * U ($1 * U).
 * - Outcome Mechanics:
 *   - Loss (No hit): Add (first + last) to the end of the line.
 *   - Dozen Win (2:1 payout): Remove ONLY the first number from the line.
 *   - Street Win (11:1 payout): Remove BOTH first and last numbers from the line.
 * - Progression Complete: When the line becomes empty, progression resets and returns to Base Level.
 * 
 * Goal:
 * - Efficient recovery with low escalation stress, steadily accumulating session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.inProgression = false;
        state.line = [1, 0, 1];
        state.initialized = true;
    }

    // 2. Process Previous Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Determine outcome type
        const isDozenWin = (num >= 1 && num <= 12);
        const isStreetWin = (num >= 13 && num <= 21);
        const isWin = isDozenWin || isStreetWin;

        if (!state.inProgression) {
            // At base level: stays at base on win, enters progression on loss
            if (!isWin) {
                state.inProgression = true;
                state.line = [1, 0, 1];
                // Add loss amount (first + last = 1 + 1 = 2) to end of starting line
                state.line.push(state.line[0] + state.line[state.line.length - 1]);
            }
        } else {
            // Active progression
            if (!isWin) {
                // Loss: add (first + last) to end of line
                const first = state.line[0];
                const last = state.line[state.line.length - 1];
                state.line.push(first + last);
            } else if (isStreetWin) {
                // Street Win: cancel both first and last
                if (state.line.length <= 2) {
                    state.line = [];
                } else {
                    state.line.shift();
                    state.line.pop();
                }
            } else if (isDozenWin) {
                // Dozen Win: cancel only the first number
                state.line.shift();
            }

            // Check if progression is completed
            if (state.line.length === 0) {
                state.inProgression = false;
                state.line = [1, 0, 1];
            }
        }
    }

    // 3. Calculate Bet Multiplier (U)
    let U = 2; // Default base level = 2 ($12 total when base unit = $1/$2)
    if (state.inProgression && state.line.length > 0) {
        if (state.line.length === 1) {
            U = state.line[0];
        } else {
            U = state.line[0] + state.line[state.line.length - 1];
        }
    }

    // 4. Calculate Bet Amounts respecting limits
    // Inside street min bet:
    const minStreet = Math.max(config.betLimits.min || 2, 1);
    // Base unit multiplier factor ($1 unit per U when street base is $2 / 2 = $1)
    const unitScale = minStreet / 2;

    let streetBet = Math.max(U * 1 * unitScale, minStreet);
    let dozenBet = Math.max(U * 3 * unitScale, config.betLimits.minOutside || 5);

    // Clamp to maximum bet limits
    const maxBet = config.betLimits.max || 500;
    streetBet = Math.min(streetBet, maxBet);
    dozenBet = Math.min(dozenBet, maxBet);

    // 5. Construct Bet Array
    return [
        { type: 'dozen', value: 1, amount: dozenBet },
        { type: 'street', value: 13, amount: streetBet },
        { type: 'street', value: 16, amount: streetBet },
        { type: 'street', value: 19, amount: streetBet }
    ];
}