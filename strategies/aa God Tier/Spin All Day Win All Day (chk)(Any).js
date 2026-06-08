/**
 * Roulette Strategy: "Spin All Day Win All Day" (Predictive State-of-the-Art Modeling)
 * * Source:
 * - Video URL: https://youtu.be/WpiY-QamBIY?si=EL_rvb_EnIE12xPG
 * - YouTube Channel: The Roulette Master
 * * The Full Logic in Detail:
 * 1. Waiting / Data Collection Condition:
 * - The strategy stays completely idle and does NOT place any bets until it has collected a sufficient sample size of spin history data.
 * - Minimum tracking threshold is set to 20 spins to build an initial probability state matrix. 
 * 2. Selection Trigger via State-of-the-Art Predictive Modeling:
 * - Instead of basic tracking or relying on the Gambler's Fallacy, this algorithm utilizes a first-order **Markov Chain Transition Matrix** coupled with an **Exponential Moving Average (EMA)** frequency weight.
 * - This model dynamically maps out the transitional probabilities of moving from the current winning Double Street into all subsequent Double Streets, accounting for sequence patterns and physical momentum shifts (hot states).
 * - After a cycle reset or session initialization, the prediction model scores each Double Street. The top 3 Double Streets displaying the highest combined conditional transition probability and recent hot frequency (EMA) are selected.
 * 3. Lock Conditions:
 * - Once the model selects the optimal 3 target Double Streets, it locks onto them.
 * - You remain on these exact spots through any losses or minor wins until the "Session Profit" recovery milestone clears.
 * * The Full Bet Progression in Detail:
 * 1. Initial/Base Bet:
 * - Every active betting sequence begins at the base progression tier (Level 1).
 * - 1 Unit is placed on each of the selected 3 Double Streets (Total 3 Units active).
 * 2. After a Loss:
 * - Increase the bet amount for each individual Double Street position by 1 Unit for the next spin (e.g., tier goes from 1 to 2, making it 2 units per position).
 * 3. After a Win:
 * - If the cycle profit is NOT enough to hit a new all-time high balance, the bet amounts for the 3 Double Streets stay exactly the same as the last spin (flat-betting at current tier).
 * * The Goal:
 * - A session successfully resets if the net balance becomes strictly greater than the baseline balance captured right before that betting cycle started (session profit >= 1 unit over the previous high watermark).
 * - Upon reaching this goal, the strategy clears its cycle flags, saves the new high bankroll peak, resets the bet tier back to 1 unit, and reruns the predictive matrix against the freshly updated spin history to choose the next 3 target hot streets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Minimum spin data threshold required to feed the transition predictive model
    const MIN_REQUIRED_SPINS = 20;
    const baseUnit = config.betLimits.min;

    // Defined standard layout mappings for the 6 standard Double Streets on a roulette table
    const doubleStreets = [
        { value: 1,  numbers: [1, 2, 3, 4, 5, 6] },
        { value: 7,  numbers: [7, 8, 9, 10, 11, 12] },
        { value: 13, numbers: [13, 14, 15, 16, 17, 18] },
        { value: 19, numbers: [19, 20, 21, 22, 23, 24] },
        { value: 25, numbers: [25, 26, 27, 28, 29, 30] },
        { value: 31, numbers: [31, 32, 33, 34, 35, 36] }
    ];

    // Helper function to find which Double Street index (0-5) a winning number belongs to
    function getStreetIndex(num) {
        return doubleStreets.findIndex(s => s.numbers.includes(num));
    }

    // Initialize foundational tracker records for a brand-new engine state
    if (state.maxBankroll === undefined) {
        state.maxBankroll = bankroll;
    }
    if (state.progressionTier === undefined) {
        state.progressionTier = 1;
    }
    if (state.activeStreetValues === undefined) {
        state.activeStreetValues = null;
    }

    // Process game outcomes if spin history data is present
    if (spinHistory && spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const winningNum = lastResult.winningNumber;
        const currentWinningIndex = getStreetIndex(winningNum);

        // Only evaluate progression adjustments if we were actively betting
        if (state.activeStreetValues) {
            const spinWasWin = currentWinningIndex !== -1 && state.activeStreetValues.includes(doubleStreets[currentWinningIndex].value);

            if (bankroll > state.maxBankroll) {
                // Milestone achieved: Reset tracking indicators back to state recalculation status
                state.maxBankroll = bankroll;
                state.progressionTier = 1;
                state.activeStreetValues = null; 
            } else if (!spinWasWin) {
                // Step up the bet scale incrementally on missed rounds
                state.progressionTier += 1;
            }
        }
    }

    // If data is insufficient, skip betting sequence entirely to avoid variance noise
    if (!spinHistory || spinHistory.length < MIN_REQUIRED_SPINS) {
        return [];
    }

    // If no active selections are locked, compute the state transition model to isolate the hottest 3 streets
    if (!state.activeStreetValues) {
        
        // 1. Initialize Markov Chain Transition Counting Matrix (6x6)
        // Tracks probability of moving from Street A -> Street B
        const transitionMatrix = Array(6).fill(0).map(() => Array(6).fill(0));
        
        // 2. Initialize Recent Frequency Weight array (EMA modeling factor)
        const recentWeights = Array(6).fill(0);
        const alpha = 2 / (MIN_REQUIRED_SPINS + 1); // Decay multiplier for historical momentum

        let previousStreetIdx = -1;

        // Process full spin history to construct state weights and mapping distributions
        for (let i = 0; i < spinHistory.length; i++) {
            const currentStreetIdx = getStreetIndex(spinHistory[i].winningNumber);
            
            // Skip zeros as they do not land within standard double street layouts
            if (currentStreetIdx === -1) continue;

            // Update transitional link chains if a valid contiguous pair is established
            if (previousStreetIdx !== -1) {
                transitionMatrix[previousStreetIdx][currentStreetIdx] += 1;
            }

            // Update Exponential Moving Average hot state tracker
            for (let s = 0; s < 6; s++) {
                const match = (s === currentStreetIdx) ? 1 : 0;
                recentWeights[s] = (match * alpha) + (recentWeights[s] * (1 - alpha));
            }

            previousStreetIdx = currentStreetIdx;
        }

        // Identify the most recent street in play to isolate the specific origin row in the transition table
        const lastValidIndex = getStreetIndex(spinHistory[spinHistory.length - 1].winningNumber);
        const activeRowIndex = lastValidIndex !== -1 ? lastValidIndex : previousStreetIdx;

        // Score all target candidates based on historical pattern mapping
        const streetScores = doubleStreets.map((street, targetIdx) => {
            let transitionScore = 0;
            
            if (activeRowIndex !== -1) {
                const totalRowTransitions = transitionMatrix[activeRowIndex].reduce((sum, val) => sum + val, 0);
                if (totalRowTransitions > 0) {
                    // Conditional probability calculation P(Target | Last State)
                    transitionScore = transitionMatrix[activeRowIndex][targetIdx] / totalRowTransitions;
                }
            }

            // Predictive Formula: Combine conditional Markov probability with long-term recent hot frequency
            const dynamicScore = (transitionScore * 0.6) + (recentWeights[targetIdx] * 0.4);

            return { value: street.value, score: dynamicScore };
        });

        // Sort candidates descending to isolate highest predicted probability scores
        streetScores.sort((a, b) => b.score - a.score);

        // Lock in the top 3 hottest predictive targets for this active run cycle
        state.activeStreetValues = [
            streetScores[0].value,
            streetScores[1].value,
            streetScores[2].value
        ];

        // Establish the new baseline margin parameter for the starting cycle bankroll tracking
        state.maxBankroll = bankroll;
    }

    // Calculate structural bet sizing limits
    let finalBetAmount = baseUnit * state.progressionTier;
    finalBetAmount = Math.max(finalBetAmount, config.betLimits.min);
    finalBetAmount = Math.min(finalBetAmount, config.betLimits.max);

    // Format structural bet transaction orders for deployment to table spots
    return state.activeStreetValues.map(streetVal => {
        return {
            type: 'line',
            value: streetVal,
            amount: finalBetAmount
        };
    });
}