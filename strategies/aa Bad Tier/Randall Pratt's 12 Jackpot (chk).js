/**
 * Strategy: Randall Pratt's 12 Jackpot System
 * Source: YouTube - The Roulette Master (https://youtu.be/bCSE4g5qewo)
 *
 * The Full Logic in Detail:
 * -------------------------
 * This strategy places inside bets across specific streets, center corners, and the zero(s):
 * 1. Streets (8 street bets):
 *    - 2nd Dozen: All 4 streets (13-15, 16-18, 19-21, 22-24).
 *    - 1st Dozen: Middle two streets (4-6, 7-9).
 *    - 3rd Dozen: Middle two streets (28-30, 31-33).
 * 2. Corners (3 center corner bets):
 *    - Corner 5 (covers 5, 6, 8, 9)
 *    - Corner 17 (covers 17, 18, 20, 21)
 *    - Corner 29 (covers 29, 30, 32, 33)
 *    These overlap with the streets to create 12 "Jackpot" numbers (5, 6, 8, 9, 17, 18, 20, 21, 29, 30, 32, 33)
 *    which pay on both the street (11:1) and the corner (8:1).
 * 3. Zero Insurance:
 *    - Straight up bet on 0 (and 00 if American table) to hedge against green, turning what would be a full
 *      loss into a smaller partial loss.
 *
 * The Full Bet Progression in Detail:
 * -----------------------------------
 * - Initial Bet:
 *   - 1 unit (scaled to config.betLimits.min) on each of the 8 streets and 3 corners.
 *   - The zero straight-up bet is sized proportionally (minimum inside bet unit or table min).
 * - Progression Rules:
 *   - Single / First Loss: Do not increase; re-bet the current bet amount.
 *   - Back-to-Back Losses (2 losses in a row): Triggers aggressive recovery mode.
 *     In this mode, increase the bet level by 1 unit on EVERY spin (win or lose) until recovered.
 *   - Non-consecutive losses during progression: Increase by 1 unit upon subsequent losses.
 *   - Win / Reset Condition:
 *     - Hitting any of the 12 Jackpot numbers triggers an immediate reset back to base level.
 *     - Reaching a new session bankroll peak (session profit) also triggers an immediate reset back to base level.
 *
 * The Goal:
 * ---------
 * Capitalize on high-frequency street hits while hunting the 12 jackpot numbers. The stop goal is
 * consistent session profit lock-in and resetting whenever bankroll achieves a new peak or hits a jackpot.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // 1. Initialize Strategy State
    if (!state.initialized) {
        state.initialized = true;
        state.baseUnit = minInside;
        state.multiplier = 1;
        state.peakBankroll = bankroll;
        state.consecutiveLosses = 0;
        state.inAggressiveMode = false;
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
    }

    // 2. Evaluate previous spin outcome if history exists
    if (spinHistory && spinHistory.length > 0 && state.lastTotalBet > 0) {
        const lastProfit = bankroll - state.lastBankroll;
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // The 12 jackpot numbers that overlap both corner and street
        const jackpotNumbers = [5, 6, 8, 9, 17, 18, 20, 21, 29, 30, 32, 33];
        const hitJackpot = jackpotNumbers.includes(lastNum);

        // Check if session profit reached a new high
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }

        const isNewSessionProfit = bankroll >= state.peakBankroll;

        if (lastProfit > 0) {
            // Net profit on the spin
            state.consecutiveLosses = 0;

            if (hitJackpot || isNewSessionProfit) {
                // Reset immediately to base level on jackpot hit or session recovery
                state.multiplier = 1;
                state.inAggressiveMode = false;
            } else if (state.inAggressiveMode) {
                // In aggressive mode after back-to-back losses, increase 1 unit every spin until recovery
                state.multiplier += 1;
            }
        } else {
            // Net loss on the spin (full or partial loss)
            state.consecutiveLosses += 1;

            if (state.consecutiveLosses >= 2) {
                // Back-to-back losses trigger aggressive increase mode
                state.inAggressiveMode = true;
                state.multiplier += 1;
            } else if (state.inAggressiveMode) {
                // Already in aggressive mode, increase on every spin
                state.multiplier += 1;
            }
            // If it's only the first loss (consecutiveLosses === 1) and not in aggressive mode: do not increase
        }
    }

    // 3. Calculate Bet Amounts Clamped to Limits
    const unitBet = Math.min(Math.max(state.baseUnit * state.multiplier, minInside), maxBet);
    const zeroBet = Math.min(Math.max(state.baseUnit * Math.max(1, Math.floor(state.multiplier * 0.5)), minInside), maxBet);

    // 4. Construct Bet Placements
    // 8 Street bets:
    // 1st Dozen middle two: 4 (4-6), 7 (7-9)
    // 2nd Dozen all four: 13 (13-15), 16 (16-18), 19 (19-21), 22 (22-24)
    // 3rd Dozen middle two: 28 (28-30), 31 (31-33)
    const streetValues = [4, 7, 13, 16, 19, 22, 28, 31];

    // 3 Center Corner bets:
    // Corner 5 (5,6,8,9), Corner 17 (17,18,20,21), Corner 29 (29,30,32,33)
    const cornerValues = [5, 17, 29];

    const bets = [];

    // Place Street bets
    for (let i = 0; i < streetValues.length; i++) {
        bets.push({
            type: 'street',
            value: streetValues[i],
            amount: unitBet
        });
    }

    // Place Corner bets
    for (let i = 0; i < cornerValues.length; i++) {
        bets.push({
            type: 'corner',
            value: cornerValues[i],
            amount: unitBet
        });
    }

    // Place Zero Straight Up Insurance
    bets.push({
        type: 'number',
        value: 0,
        amount: zeroBet
    });

    if (config.tableType === 'american') {
        bets.push({
            type: 'number',
            value: '00',
            amount: zeroBet
        });
    }

    // 5. Calculate total wagered and update state
    let totalBet = 0;
    for (let i = 0; i < bets.length; i++) {
        totalBet += bets[i].amount;
    }

    state.lastBankroll = bankroll;
    state.lastTotalBet = totalBet;

    return bets;
}