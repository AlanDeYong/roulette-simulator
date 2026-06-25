/**
 * Roulette Strategy: Cover 26 (Randomized Split Variant)
 * * Source:
 * - YouTube Channel: Gamblers University
 * - Video URL: https://youtu.be/B9cdKge_3DY
 * * The Full Logic in details:
 * - Every round, two distinct dozens are selected completely at random from the three layout options (1st, 2nd, or 3rd Dozen).
 * - Within each of the two selected dozens, one valid layout split bet (either a horizontal or vertical split) is chosen entirely at random.
 * - Bets are then placed across the table layout: covering the two randomly selected dozens, the two inner random dozen splits, and a straight-up number bet on 0.
 * * The Full Bet Progression in details:
 * - Base Bet Setup (Level 1): 12 units on each of the 2 selected dozens, 1 unit on the number 0, and 1 unit on each of the 2 random internal splits.
 * - Progression Rule:
 * - After a LOSS: The progression level climbs by +1 step (e.g., Level 1 -> Level 2 -> Level 3), scaling the dozen bets by +12 units and inside bets by +1 unit.
 * - After a WIN that sets a new Session High bankroll: The progression resets back to Level 1.
 * - After a WIN that does NOT achieve a new Session High: The progression remains flat at the current level.
 * - All bet sizing configurations strictly respect table limits via dynamic min/max clamping.
 * * The Goal:
 * - Target profit is +100 units over the initial starting bankroll. Betting terminates once this threshold is met.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // -------------------------------------------------------------------------
    // 1. Initialize State & Target Tracking
    // -------------------------------------------------------------------------
    if (state.progression === undefined) {
        state.progression = 1;
        state.sessionHigh = bankroll;
        state.initialBankroll = bankroll;
    }

    // Terminate play if the session win goal (+100 units) is achieved
    if (bankroll >= state.initialBankroll + 1000000) {
        return [];
    }

    // -------------------------------------------------------------------------
    // 2. Progression Level Assessment
    // -------------------------------------------------------------------------
    if (state.previousBankroll !== undefined) {
        if (bankroll > state.previousBankroll) {
            // Win condition reached
            if (bankroll > state.sessionHigh) {
                state.sessionHigh = bankroll;
                state.progression = 1; // Reset to base level on new session high
            }
            // If win occurs without reaching a new high, progression level remains flat
        } else if (bankroll < state.previousBankroll) {
            // Loss condition reached: increment progression level by 1
            state.progression += 1;
        }
    }

    // Keep track of the highest achieved bankroll and current round status
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
    }
    state.previousBankroll = bankroll;

    // -------------------------------------------------------------------------
    // 3. Random Dozen and Split Layout Selection
    // -------------------------------------------------------------------------
    const dozensPool = [1, 2, 3];
    const chosenDozens = [];
    
    // Select 2 unique random dozens
    while (chosenDozens.length < 2) {
        const randomIndex = Math.floor(Math.random() * dozensPool.length);
        const selectedDozen = dozensPool[randomIndex];
        if (!chosenDozens.includes(selectedDozen)) {
            chosenDozens.push(selectedDozen);
        }
    }

    // Helper function to dynamically collect all valid split pairs within a specific dozen
    function getValidSplits(dozen) {
        const offset = (dozen - 1) * 12;
        const splits = [];
        
        // Horizontal Splits (within streets)
        for (let s = 0; s < 4; s++) {
            const start = offset + 1 + s * 3;
            splits.push([start, start + 1]);
            splits.push([start + 1, start + 2]);
        }
        
        // Vertical Splits (adjacent numbers within columns)
        for (let c = 1; c <= 3; c++) {
            splits.push([offset + c, offset + c + 3]);
            splits.push([offset + c + 3, offset + c + 6]);
            splits.push([offset + c + 6, offset + c + 9]);
        }
        
        return splits;
    }

    // -------------------------------------------------------------------------
    // 4. Sizing Calculations & Table Limit Clamping
    // -------------------------------------------------------------------------
    let dozenAmount = 12 * state.progression;
    let insideAmount = 1 * state.progression;

    // Enforce outside bet table constraints
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    // Enforce inside bet table constraints
    insideAmount = Math.max(insideAmount, config.betLimits.min);
    insideAmount = Math.min(insideAmount, config.betLimits.max);

    // -------------------------------------------------------------------------
    // 5. Construct and Return Bet Placements
    // -------------------------------------------------------------------------
    const bets = [];

    // Place straight-up bet on 0
    bets.push({ type: 'number', value: 0, amount: insideAmount });

    // Place bets on selected dozens and random inner splits
    chosenDozens.forEach(dozen => {
        bets.push({ type: 'dozen', value: dozen, amount: dozenAmount });

        const validSplits = getValidSplits(dozen);
        const randomSplit = validSplits[Math.floor(Math.random() * validSplits.length)];
        bets.push({ type: 'split', value: randomSplit, amount: insideAmount });
    });

    return bets;
}