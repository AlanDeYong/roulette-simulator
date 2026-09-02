/**
 * ============================================================================
 * STRATEGY: "Cover Me" System (Updated Progression & Dozen Breakdown)
 * SOURCE:
 *   - YouTube Channel: Junko Bodie
 *   - Video Title: Junko's Favorite Roulette System
 *   - Video URL: https://youtu.be/mfIGEd4cNY0
 *
 * THE FULL LOGIC IN DETAIL:
 *   1. Initial Wait & Setup:
 *      - Observes 1 spin without betting to establish the initial baseline.
 *      - Identifies the winning dozen (D) and winning column (C).
 *      - In the winning dozen D: Places straight-up bets on all numbers except
 *        the 4 numbers in column C (8 straight-up numbers covered).
 *      - On the 2 dozens that did not win: Places outside dozen bets (12 units each).
 *      - Places a 1 unit straight-up bet on Zero (0).
 *
 *   2. Win Handling & Transitions:
 *      - Outside Dozen Win: Remove the outside bet on that winning dozen. Break it
 *        down into inside straight-up bets on all numbers in that dozen except the
 *        winning column (4-number vertical).
 *      - Inside Number Win: Remove all straight-up bets in the winning column within
 *        that winning dozen (satisfying/eliminating that vertical).
 *
 * THE FULL BET PROGRESSION:
 *   - Base Unit Multipliers: [1, 2, 5, 10, 15, 20, 30, 40]
 *   - Ratio: 1x multiplier per straight-up number / 12x multiplier per outside dozen.
 *   - Progression Step: Increases every 4 spins during an active session.
 *
 * THE GOAL & RESET:
 *   - Peak Profit Tracking: The session resets whenever a new all-time session
 *     bankroll peak is achieved (or immediately upon surpassing starting bankroll).
 *   - On reset: Progression index resets to 0 (1 unit), and the board layout
 *     re-initializes based on the most recent winning number.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initial spin check: wait 1 spin before placing bets
    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    const insideUnit = config.betLimits.min || 1;
    const outsideMin = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;
    const progressionMultipliers = [1, 2, 5, 10, 15, 20, 30, 40];

    // Helper functions for board geometry
    function getDozen(num) {
        if (num < 1 || num > 36) return null;
        return Math.floor((num - 1) / 12) + 1; // 1, 2, or 3
    }

    function getColumn(num) {
        if (num < 1 || num > 36) return null;
        return ((num - 1) % 3) + 1; // 1, 2, or 3
    }

    function getNumbersInDozenColumn(dozen, col) {
        const nums = [];
        const start = (dozen - 1) * 12 + col;
        for (let row = 0; row < 4; row++) {
            nums.push(start + row * 3);
        }
        return nums;
    }

    function getNumbersInDozen(dozen) {
        const nums = [];
        const start = (dozen - 1) * 12 + 1;
        for (let i = 0; i < 12; i++) {
            nums.push(start + i);
        }
        return nums;
    }

    // Helper to initialize session layout from a reference number
    function initSessionLayout(winningNum) {
        state.activeDozens = { 1: true, 2: true, 3: true };
        state.activeNumbers = {}; // number -> true

        const d = getDozen(winningNum) || 1;
        const c = getColumn(winningNum) || 1;

        // Remove outside bet on the winning dozen
        delete state.activeDozens[d];

        // Add straight-up numbers in winning dozen except column c
        const excluded = new Set(getNumbersInDozenColumn(d, c));
        getNumbersInDozen(d).forEach(n => {
            if (!excluded.has(n)) {
                state.activeNumbers[n] = true;
            }
        });
    }

    // 2. Initialize or manage session state
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;

    if (!state.sessionInitialized) {
        state.peakBankroll = bankroll;
        state.sessionStartBankroll = bankroll;
        state.spinCountInSession = 0;
        state.progressionIndex = 0;
        initSessionLayout(lastNum);
        state.sessionInitialized = true;
    } else {
        state.spinCountInSession += 1;

        // Check if a new peak bankroll was reached
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
            state.sessionStartBankroll = bankroll;
            state.spinCountInSession = 0;
            state.progressionIndex = 0;
            initSessionLayout(lastNum);
        } else {
            // Process the winning number into the board state
            const hitDozen = getDozen(lastNum);
            const hitColumn = getColumn(lastNum);

            if (hitDozen && hitColumn) {
                // If the dozen was covered by an outside dozen bet
                if (state.activeDozens[hitDozen]) {
                    delete state.activeDozens[hitDozen];
                    const excluded = new Set(getNumbersInDozenColumn(hitDozen, hitColumn));
                    getNumbersInDozen(hitDozen).forEach(n => {
                        if (!excluded.has(n)) {
                            state.activeNumbers[n] = true;
                        }
                    });
                }
                // If hit inside straight-up number
                else if (state.activeNumbers[lastNum]) {
                    const toRemove = getNumbersInDozenColumn(hitDozen, hitColumn);
                    toRemove.forEach(n => {
                        delete state.activeNumbers[n];
                    });
                }
            }

            // Step up progression multiplier every 4 spins
            state.progressionIndex = Math.min(
                Math.floor(state.spinCountInSession / 4),
                progressionMultipliers.length - 1
            );
        }
    }

    // 3. Compute bet amounts
    const currentMultiplier = progressionMultipliers[state.progressionIndex];

    // Inside bet amount per straight-up number
    let numberBetAmount = insideUnit * currentMultiplier;
    numberBetAmount = Math.max(numberBetAmount, config.betLimits.min);
    numberBetAmount = Math.min(numberBetAmount, maxBet);

    // Outside dozen bet amount (12 units base)
    let dozenBetAmount = 12 * insideUnit * currentMultiplier;
    dozenBetAmount = Math.max(dozenBetAmount, outsideMin);
    dozenBetAmount = Math.min(dozenBetAmount, maxBet);

    // 4. Construct bets array
    const bets = [];

    // Outside dozen bets
    Object.keys(state.activeDozens).forEach(dStr => {
        bets.push({
            type: 'dozen',
            value: parseInt(dStr, 10),
            amount: dozenBetAmount
        });
    });

    // Straight-up number bets
    Object.keys(state.activeNumbers).forEach(nStr => {
        bets.push({
            type: 'number',
            value: parseInt(nStr, 10),
            amount: numberBetAmount
        });
    });

    // Zero bet
    bets.push({
        type: 'number',
        value: 0,
        amount: numberBetAmount
    });

    if (config.tableType === 'american') {
        bets.push({
            type: 'number',
            value: '00',
            amount: numberBetAmount
        });
    }

    return bets;
}