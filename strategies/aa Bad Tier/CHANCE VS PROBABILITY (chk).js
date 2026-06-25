/**
 * Source: https://youtu.be/AY9-iwA92lw (Bet With Mo)
 * * Logic:
 * - The strategy waits for the first 37 spins without betting to determine the initial 5 "cold" numbers.
 * - "Cold" numbers are calculated by finding the lowest-frequency numbers in the spin history.
 * - A loss advances the betting progression. 
 * - A win, or reaching the end of the 10-step progression, resets the sequence and picks 5 new cold numbers using all past spins.
 * * Progression:
 * - Level 1: 1 unit per number (Total 5u)
 * - Next 4 losses: Increase by 1 unit (2u, 3u, 4u, 5u per number)
 * - Next loss: Double up all bets (10u per number)
 * - Next 3 losses: Increase by 4 units each (14u, 18u, 22u per number)
 * - Next loss: Double up all bets (44u per number)
 * - On win, reset to Level 1.
 * * Goal:
 * - No explicit target profit is set; the strategy aims to continuously profit via 35:1 straight-up payouts while using the 10-level progression as an implicit stop-loss before resetting.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Wait for the first 37 spins to gather observation data before placing bets
    if (spinHistory.length < 37) {
        return []; 
    }

    const unit = config.betLimits.min; 
    const progressionMultipliers = [1, 2, 3, 4, 5, 10, 14, 18, 22, 44];

    // Helper: Determine the 5 coldest numbers dynamically
    const getColdNumbers = (history) => {
        if (history.length === 0) return [1, 2, 3, 4, 5];

        const stats = {};
        for (let i = 0; i <= 36; i++) {
            stats[i] = { number: i, count: 0, lastSeen: -1 };
        }
        if (config.tableType === 'american') {
            stats['00'] = { number: '00', count: 0, lastSeen: -1 };
        }
        
        history.forEach((spin, index) => {
            const num = spin.winningNumber;
            if (stats[num]) {
                stats[num].count++;
                stats[num].lastSeen = index;
            } else {
                stats[num] = { number: num, count: 1, lastSeen: index };
            }
        });

        const sortedStats = Object.values(stats).sort((a, b) => {
            if (a.count !== b.count) return a.count - b.count;
            return a.lastSeen - b.lastSeen;
        });

        return sortedStats.slice(0, 5).map(s => s.number);
    };

    // Initialize state once the 37-spin threshold is met
    if (state.progressionIndex === undefined) {
        state.progressionIndex = 0;
        state.targetNumbers = getColdNumbers(spinHistory);
    } else {
        // Evaluate the result of the last spin
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        const won = state.targetNumbers.includes(lastSpin);

        if (won) {
            state.progressionIndex = 0;
            state.targetNumbers = getColdNumbers(spinHistory);
        } else {
            state.progressionIndex++;
            // Reset sequence if the 10-level limit has been breached
            if (state.progressionIndex >= progressionMultipliers.length) {
                state.progressionIndex = 0;
                state.targetNumbers = getColdNumbers(spinHistory);
            }
        }
    }

    let multiplier = progressionMultipliers[state.progressionIndex];
    let amount = unit * multiplier;

    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    return state.targetNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: amount
    }));
}