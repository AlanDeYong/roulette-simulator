/**
 * Roulette Strategy: Vis a Vis
 * 
 * Source:
 * - URL: https://www.youtube.com/watch?v=5dkBAVJ_P2M&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5
 * - Channel: Roulette Strategy
 * 
 * The Full Logic in Details:
 * - This strategy targets two diametrically opposite sections of the European roulette wheel:
 *   the region surrounding the number '0' and the region surrounding the number '5' (hence "Vis a Vis" or face-to-face).
 * - A bet is placed on every single spin. The covered numbers are calculated by treating 0 and 5 as center points 
 *   on the European wheel racetrack layout and extending a specific number of neighbors to both sides.
 * - The strategy dynamically changes both the coverage size (number of neighbors) and the bet multiplier based on consecutive losses.
 * - Upon any winning spin, the progression resets back to the initial base level.
 * 
 * The Full Bet Progression in Details:
 * - Level 0 (Initial Base): 1 unit straight-up per number on 0 with 4 neighbors and 5 with 4 neighbors (Total: 18 numbers covered).
 * - Level 1 (After 1st Loss): 3 units straight-up per number on 0 with 5 neighbors and 5 with 5 neighbors (Total: 22 numbers covered).
 * - Level 2 (After 2nd Loss): 8 units straight-up per number on 0 with 6 neighbors and 5 with 6 neighbors (Total: 26 numbers covered).
 * - Level 3+ (Subsequent Losses): Maintain 6 neighbors for both sections (26 numbers), but double the unit bet size from the previous level (16 units, 32 units, 64 units, etc.).
 * - Reset: Any hit within the covered numbers instantly resets the progression back to Level 0.
 * 
 * The Goal:
 * - To exploit high-coverage sector patterns on opposite sides of the wheel, leveraging a aggressive recovery progression 
 *   to secure net profits when a streak ends. The objective is steady session profit accumulation.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the standard European Wheel layout sequence
    const euWheel = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    // 2. Initialize tracking states if this is the first spin
    if (state.level === undefined) {
        state.level = 0;
        state.lastBetNumbers = [];
    }

    // 3. Track win/loss outcome from the previous spin
    // FIX: Only evaluate history if we actually placed a bet previously.
    // This prevents false level-ups on the very first spin when imported data/history exists.
    if (spinHistory && spinHistory.length > 0 && state.lastBetNumbers && state.lastBetNumbers.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNumber = lastSpin.winningNumber;

        // Check if the winning number was in our last placed selection
        if (state.lastBetNumbers.includes(lastWinningNumber)) {
            state.level = 0; // Reset to base level on win
        } else {
            state.level++; // Progress to higher loss level on loss
        }
    }

    // 4. Establish the progression rules based on the level tier
    let neighborsCount = 4;
    let multiplier = 1;

    if (state.level === 0) {
        neighborsCount = 4;
        multiplier = 1;
    } else if (state.level === 1) {
        neighborsCount = 5;
        multiplier = 3;
    } else if (state.level === 2) {
        neighborsCount = 6;
        multiplier = 8;
    } else {
        // Subsequent losses: keep maximum coverage (6 neighbors) and double the previous bet multiplier
        neighborsCount = 6;
        multiplier = 8 * Math.pow(2, state.level - 2);
    }

    // 5. Calculate final straight-up bet size, strictly observing limits
    // FIX: Prioritize config.minIncrementalBet as the base unit to respect custom simulator configurations.
    const baseUnit = config.minIncrementalBet !== undefined ? config.minIncrementalBet : config.betLimits.min;
    let amountPerNumber = baseUnit * multiplier;

    // Clamp the individual position bet within system configuration parameters
    amountPerNumber = Math.max(amountPerNumber, config.betLimits.min);
    amountPerNumber = Math.min(amountPerNumber, config.betLimits.max);

    // Racetrack neighbor retrieval helper function
    function getSectorNumbers(centerNum, count) {
        const idx = euWheel.indexOf(centerNum);
        const numbers = [];
        for (let i = -count; i <= count; i++) {
            let targetIdx = (idx + i) % euWheel.length;
            if (targetIdx < 0) targetIdx += euWheel.length;
            numbers.push(euWheel[targetIdx]);
        }
        return numbers;
    }

    // 6. Generate numbers for both opposite wheel sectors
    const zeroSector = getSectorNumbers(0, neighborsCount);
    const fiveSector = getSectorNumbers(5, neighborsCount);

    // Combine both arrays into a unique collection of target numbers
    const uniqueNumbers = Array.from(new Set([...zeroSector, ...fiveSector]));

    // Retain target numbers in state to evaluate the next spin's results
    state.lastBetNumbers = uniqueNumbers;

    // 7. Format array into structural inside straight-up bets
    const bets = uniqueNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: amountPerNumber
    }));

    return bets;
}