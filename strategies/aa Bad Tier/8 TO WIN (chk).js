/**
 * Strategy Name: 8 to Win Roulette Strategy
 * Source: https://youtu.be/jWH5P09RAOQ (Channel: Bet With Mo)
 * * * Full Logic Details:
 * - Triggers: Bets are placed every spin. Progresses on losses, recovers/resets on wins.
 * - On Win: 
 * - If the current bankroll hits or exceeds the session's peak profit, the strategy resets to Level 1.
 * - If not at peak profit and the current level is a "double up" tier (Levels 6, 7, 8), drop down exactly 1 level.
 * - If not at peak profit and on a baseline tier (Levels 1-5), stay at the current level.
 * - Post-Reset: The split pairs flip starting sides (alternating between high numbers like 31/34 and low numbers like 7/10) to mix up the spread. Column bets remain unchanged.
 * * * Full Bet Progression Details (Base Unit Multipliers):
 * - Level 1: 3 units each on 1st/3rd Col, 1 unit each on splits 31/34, 33/36 (Total: 8 units)
 * - Level 2: 6 units each on 1st/3rd Col, 1 unit each on splits 25/28, 27/30 added (Total: 16 units)
 * - Level 3: 9 units each on 1st/3rd Col, 1 unit each on splits 19/22, 21/24 added (Total: 24 units)
 * - Level 4: 12 units each on 1st/3rd Col, 1 unit each on splits 13/16, 15/18 added (Total: 32 units)
 * - Level 5: 15 units each on 1st/3rd Col, 1 unit each on splits 7/10, 9/12 added (Total: 40 units)
 * - Level 6: Double up all bets from Level 5 (Total: 80 units)
 * - Level 7: Double up all bets from Level 6 (Total: 160 units)
 * - Level 8: Double up all bets from Level 7 (Total: 320 units)
 * * * Goal:
 * - To utilize 2/3 column coverage backed by inside split insurance to grind a targeted profit over short sessions.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Strategy State
    if (state.level === undefined) state.level = 1;
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;
    if (state.side === undefined) state.side = 'high'; // 'high' starts from 31/34, 'low' starts from 7/10
    if (state.previousCoveredBets === undefined) state.previousCoveredBets = null;

    // Track peak bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Process Win / Loss from Previous Spin
    if (spinHistory.length > 0 && state.previousCoveredBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        let won = false;
        
        // Check if any of our bets hit
        for (const b of state.previousCoveredBets) {
            if (b.type === 'column') {
                if (b.value === 1 && winningNum % 3 === 1) won = true;
                if (b.value === 3 && winningNum !== 0 && winningNum % 3 === 0) won = true;
            } else if (b.type === 'split') {
                if (Array.isArray(b.value) && b.value.includes(winningNum)) won = true;
            }
            if (won) break;
        }

        // Adjust Level based on outcome
        if (won) {
            if (bankroll >= state.peakBankroll) {
                state.level = 1;
                state.side = state.side === 'high' ? 'low' : 'high'; // Alternate sides upon reset
            } else {
                if (state.level >= 6) {
                    state.level--; // Drop down a level if in the double-up stages
                }
            }
        } else {
            if (state.level < 8) {
                state.level++; // Move up progression on a loss
            }
        }
    }

    // 3. Define the core Base Unit (Usually 1)
    const unit = config.betLimits.min;

    // 4. Calculate exact Unit amounts according to progression mapping
    let colUnits = 3;
    let splitUnits = 1;

    switch (state.level) {
        case 1: colUnits = 3;   splitUnits = 1; break;
        case 2: colUnits = 6;   splitUnits = 1; break;
        case 3: colUnits = 9;   splitUnits = 1; break;
        case 4: colUnits = 12;  splitUnits = 1; break;
        case 5: colUnits = 15;  splitUnits = 1; break;
        case 6: colUnits = 30;  splitUnits = 2; break; // First Double Up
        case 7: colUnits = 60;  splitUnits = 4; break; // Second Double Up
        case 8: colUnits = 120; splitUnits = 8; break; // Third Double Up
        default: colUnits = 120; splitUnits = 8; break;
    }

    let currentBets = [];

    // Calculate actual dollar amount based on unit
    let colAmount = colUnits * unit;
    let splitAmount = splitUnits * unit;

    // Clamp strictly to table minimums/maximums to ensure validity
    colAmount = Math.max(colAmount, config.betLimits.minOutside);
    colAmount = Math.min(colAmount, config.betLimits.max);

    splitAmount = Math.max(splitAmount, config.betLimits.min);
    splitAmount = Math.min(splitAmount, config.betLimits.max);

    // 5. Place Bets
    // Columns
    currentBets.push({ type: 'column', value: 1, amount: colAmount });
    currentBets.push({ type: 'column', value: 3, amount: colAmount });

    // Define base layout segments for splits
    const highSideSplits = [
        [[31, 34], [33, 36]],
        [[25, 28], [27, 30]],
        [[19, 22], [21, 24]],
        [[13, 16], [15, 18]],
        [[7, 10], [9, 12]]
    ];

    const lowSideSplits = [
        [[7, 10], [9, 12]],
        [[13, 16], [15, 18]],
        [[19, 22], [21, 24]],
        [[25, 28], [27, 30]],
        [[31, 34], [33, 36]]
    ];

    // Select the proper order of splits based on our side state
    const activeSplitsOrder = state.side === 'high' ? highSideSplits : lowSideSplits;
    
    // Unlocks up to 5 tiers of splits (10 total splits max before double-up phase begins)
    const splitTiersToInclude = Math.min(state.level, 5);

    for (let i = 0; i < splitTiersToInclude; i++) {
        const pair = activeSplitsOrder[i];
        currentBets.push({ type: 'split', value: pair[0], amount: splitAmount });
        currentBets.push({ type: 'split', value: pair[1], amount: splitAmount });
    }

    // Save current bet structure to state memory for win evaluation on the next wheel spin
    state.previousCoveredBets = currentBets;

    return currentBets;
}