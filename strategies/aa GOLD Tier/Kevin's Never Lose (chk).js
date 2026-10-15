/**
 * ==============================================================================
 * Strategy: Modified Never Lose Roulette System (Sleeper Dozen + Street Exclusion)
 * ==============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * ------------------------------------------------------------------------------
 * 1. Qualification / Trigger Phase:
 *    - Spin without placing bets until at least 2 distinct dozens (out of 1st, 2nd, 3rd)
 *      have recorded a win in recent history.
 *    - The remaining dozen that has NOT won is designated as the target sleeper dozen.
 * 
 * 2. Attempt 1 (Initial Bet):
 *    - Place 1 unit on any 3 streets within the target sleeper dozen (leaving 1 street uncovered).
 * 
 * 3. Attempt 2 (On Loss):
 *    - Retain/rebet the initial 3 streets.
 *    - Identify the other dozen that did not win on the previous spin.
 *    - Select 3 streets in that dozen, strictly EXCLUDING the street that most recently won in it.
 *    - Double up all bets across all 6 streets (each street receives 2 * currentUnit).
 * 
 * 4. Progression & Reset Conditions:
 *    - On Loss (after Attempt 2): Reset attempt to 1, increase the base unit multiplier by +1 
 *      (1x -> 2x -> 3x -> 4x -> ...), and initiate a new round at the higher unit tier.
 *    - On Win: 
 *      - If session reaches/exceeds peak bankroll (peak profit), reset unit multiplier back to 1x.
 *      - Otherwise, continue playing next round at the current unit multiplier without resetting.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.unitMultiplier = 1;
        state.attempt = 1; // 1 or 2
        state.attempt1Streets = [];
        state.attempt1Dozen = null;
        state.peakBankroll = bankroll;
        state.currentBets = [];
    }

    // Update session peak bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Helper Definitions
    const dozenStreets = {
        1: [1, 4, 7, 10],
        2: [13, 16, 19, 22],
        3: [25, 28, 31, 34]
    };

    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0; // 0 or 00
    }

    function getStreetStart(num) {
        if (num < 1 || num > 36) return null;
        return 1 + Math.floor((num - 1) / 3) * 3;
    }

    // 3. Process Result of Previous Active Bet
    if (state.currentBets && state.currentBets.length > 0 && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningStreet = getStreetStart(lastSpin.winningNumber);
        const isWin = state.currentBets.some(b => b.type === 'street' && b.value === winningStreet);

        if (isWin) {
            // On Win: reset unit multiplier if peak profit reached, else stay at current tier
            if (bankroll >= state.peakBankroll) {
                state.unitMultiplier = 1;
            }
            state.attempt = 1;
            state.attempt1Streets = [];
            state.attempt1Dozen = null;
        } else {
            // On Loss
            if (state.attempt === 1) {
                // Advance to Attempt 2
                state.attempt = 2;
            } else {
                // Loss on Attempt 2: Increase tier by 1 and reset cycle
                state.unitMultiplier += 1;
                state.attempt = 1;
                state.attempt1Streets = [];
                state.attempt1Dozen = null;
            }
        }
        state.currentBets = [];
    }

    // 4. Track Dozen History and Most Recent Street Hits per Dozen
    const recentDozensHit = new Set();
    const lastHitStreetInDozen = { 1: 10, 2: 22, 3: 34 };

    for (let i = spinHistory.length - 1; i >= 0; i--) {
        const num = spinHistory[i].winningNumber;
        const doz = getDozen(num);
        if (doz > 0) {
            recentDozensHit.add(doz);
            if (!lastHitStreetInDozen[doz]) {
                lastHitStreetInDozen[doz] = getStreetStart(num);
            }
        }
    }

    // Trigger Check: Must have at least 2 dozens that have won
    if (recentDozensHit.size < 2) {
        return []; // Spin without betting until at least 2 dozens have hit
    }

    // 5. Calculate Base Unit Amount
    const baseUnit = config.betLimits.min || 2;
    const currentUnit = baseUnit * state.unitMultiplier;

    let selectedStreets = [];
    let streetBetAmount = 0;

    if (state.attempt === 1) {
        // Find the dozen that has NOT won
        let sleeperDozen = [1, 2, 3].find(d => !recentDozensHit.has(d));
        
        // If all 3 dozens have hit at least once, pick the oldest sleeper (longest since hit)
        if (!sleeperDozen) {
            const lastSeenIndex = { 1: -1, 2: -1, 3: -1 };
            for (let i = spinHistory.length - 1; i >= 0; i--) {
                const doz = getDozen(spinHistory[i].winningNumber);
                if (doz > 0 && lastSeenIndex[doz] === -1) {
                    lastSeenIndex[doz] = i;
                }
            }
            sleeperDozen = [1, 2, 3].sort((a, b) => lastSeenIndex[a] - lastSeenIndex[b])[0];
        }

        // Pick any 3 streets in that dozen (e.g., exclude the 4th street)
        const streets = dozenStreets[sleeperDozen];
        selectedStreets = streets.slice(0, 3);
        state.attempt1Streets = [...selectedStreets];
        state.attempt1Dozen = sleeperDozen;
        streetBetAmount = currentUnit;

    } else if (state.attempt === 2) {
        // Retain Attempt 1 streets
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastHitDozen = getDozen(lastSpin.winningNumber);

        // Find the other dozen that did NOT win on the last spin (excluding state.attempt1Dozen)
        let otherDozen = [1, 2, 3].find(d => d !== state.attempt1Dozen && d !== lastHitDozen);
        if (!otherDozen) {
            otherDozen = [1, 2, 3].find(d => d !== state.attempt1Dozen) || 1;
        }

        // Exclude the street that most recently won within that dozen
        const excludeStreet = lastHitStreetInDozen[otherDozen] || dozenStreets[otherDozen][3];
        const secondDozenStreets = dozenStreets[otherDozen].filter(s => s !== excludeStreet).slice(0, 3);

        // Combine into 6 streets and double up all bets
        selectedStreets = Array.from(new Set([...state.attempt1Streets, ...secondDozenStreets]));
        streetBetAmount = currentUnit * 2;
    }

    // 6. Clamp Bet Amounts
    const clampedAmount = Math.max(
        config.betLimits.min,
        Math.min(streetBetAmount, config.betLimits.max)
    );

    // Verify bankroll coverage
    const totalRequired = clampedAmount * selectedStreets.length;
    if (bankroll < totalRequired) {
        const affordableAmount = Math.floor(bankroll / selectedStreets.length);
        if (affordableAmount < config.betLimits.min) {
            return [];
        }
    }

    // 7. Construct Bets
    const bets = selectedStreets.map(streetVal => ({
        type: 'street',
        value: streetVal,
        amount: clampedAmount
    }));

    state.currentBets = bets;
    return bets;
}