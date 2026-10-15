/**
 * Roulette Strategy: Dynamic 2 Dozen + Greens (Correction Variant)
 * * Source:
 * - URL: https://youtu.be/VtnVRXnmv5Q
 * - Channel: WillVegas
 * * * The Full Logic:
 * - Triggers & Activation: The strategy requires at least 37 spins of lookback history to calculate hot/cold numbers. No bets are placed until `spinHistory.length >= 37`.
 * - Dozen Selection: It analyzes the first 37 rows of the spin history to tally hits for each number. 
 * - Numbers are ranked by frequency.
 * - Each dozen (1st: 1-12, 2nd: 13-24, 3rd: 25-36) is evaluated based on its concentration of hot and cold numbers.
 * - The strategy dynamically selects the 2 dozens with the highest overall hot presence and lowest cold footprint.
 * - Bet Targets: Bets 5 base units on each of the 2 chosen dozens, and 1 base unit on the Single Zero (0) pocket.
 * * * The Full Bet Progression:
 * - Initial Base Unit Sizing:
 * - Dozen Bets: 5 * config.betLimits.minOutside
 * - Zero Bet: 1 * config.betLimits.min
 * - Progression Mode: Up-As-You-Lose (D'Alembert variant based on initial/base units).
 * - On Loss (Neither chosen dozen nor zero hits): Increase all active bets by their respective base bet amounts (Level + 1).
 * - On Win (A chosen dozen or zero hits): Check total session bankroll against its peak. If a new session peak profit is matched or exceeded, the progression completely resets back to Level 1. Otherwise, it drops down by exactly 1 level.
 * * * The Goal:
 * - Capitalize on rolling situational trends via lookback tracking, taking methodical step-down recoveries until previous session high marks are restored.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Minimum Data Requirements Check
    if (spinHistory.length < 37) {
        return []; 
    }

    // 2. Initialize Core Variables & Tracking States
    const baseInside = config.betLimits.min;
    const baseOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    if (!state.currentLevel) state.currentLevel = 1;
    if (!state.peakBankroll) state.peakBankroll = bankroll;
    
    // Track bankroll peak dynamically
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    const dozen1Base = baseOutside * 5;
    const dozen2Base = baseOutside * 5;
    const zeroBase = baseInside * 1;

    // 3. Process Progression Transitions Based on Prior Result
    if (state.lastChosenDozens && state.lastChosenDozens.length === 2) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let lastDozenHit = 0;
        if (lastNum >= 1 && lastNum <= 12) lastDozenHit = 1;
        else if (lastNum >= 13 && lastNum <= 24) lastDozenHit = 2;
        else if (lastNum >= 25 && lastNum <= 36) lastDozenHit = 3;

        const hitWinDozen = state.lastChosenDozens.includes(lastDozenHit);
        const hitZero = (lastNum === 0);

        if (hitWinDozen || hitZero) {
            // Win Condition
            if (bankroll >= state.peakBankroll) {
                state.currentLevel = 1;
            } else {
                state.currentLevel = Math.max(1, state.currentLevel - 1);
            }
        } else {
            // Loss Condition
            state.currentLevel += 1;
        }
    }

    // 4. Analyze Lookback Window (First 37 Rows) For Hot/Cold Distributions
    const analysisWindow = spinHistory.slice(0, 37);
    const frequencyMap = {};
    
    // Initialize standard numbers 1-36
    for (let i = 1; i <= 36; i++) {
        frequencyMap[i] = 0;
    }
    analysisWindow.forEach(spin => {
        const num = spin.winningNumber;
        if (num >= 1 && num <= 36) {
            frequencyMap[num] = (frequencyMap[num] || 0) + 1;
        }
    });

    // Sort numbers by hit counts to parse hot and cold groups
    const sortedNumbers = Object.keys(frequencyMap)
        .map(num => ({ number: parseInt(num), count: frequencyMap[num] }))
        .sort((a, b) => b.count - a.count);

    // Define thresholds dynamically based on the frequency boundaries
    const hotNumbers = new Set(sortedNumbers.slice(0, 12).map(n => n.number));
    const coldNumbers = new Set(sortedNumbers.slice(24, 36).map(n => n.number));

    // Evaluate dozens metrics
    const dozenScores = [
        { id: 1, hotCount: 0, coldCount: 0 },
        { id: 2, hotCount: 0, coldCount: 0 },
        { id: 3, hotCount: 0, coldCount: 0 }
    ];

    dozenScores.forEach(dozen => {
        const start = (dozen.id - 1) * 12 + 1;
        const end = dozen.id * 12;
        for (let n = start; n <= end; n++) {
            if (hotNumbers.has(n)) dozen.hotCount++;
            if (coldNumbers.has(n)) dozen.coldCount++;
        }
    });

    // Sort to pick the best 2 dozens (Most Hot numbers, then Least Cold numbers as a tiebreaker)
    dozenScores.sort((a, b) => {
        if (b.hotCount !== a.hotCount) {
            return b.hotCount - a.hotCount;
        }
        return a.coldCount - b.coldCount;
    });

    const chosenDozens = [dozenScores[0].id, dozenScores[1].id];
    state.lastChosenDozens = chosenDozens;

    // 5. Compute Safe, Clamped Bet Values
    let calculatedDozenAmount = dozen1Base * state.currentLevel;
    let calculatedZeroAmount = zeroBase * state.currentLevel;

    calculatedDozenAmount = Math.min(Math.max(calculatedDozenAmount, baseOutside), maxBet);
    calculatedZeroAmount = Math.min(Math.max(calculatedZeroAmount, baseInside), maxBet);

    // 6. Output Final Bet Object Structures
    return [
        { type: 'dozen', value: chosenDozens[0], amount: calculatedDozenAmount },
        { type: 'dozen', value: chosenDozens[1], amount: calculatedDozenAmount },
        { type: 'number', value: 0, amount: calculatedZeroAmount }
    ];
}