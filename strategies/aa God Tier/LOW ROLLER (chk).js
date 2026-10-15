/**
 * Strategy: Fluid Dozen Progression Strategy
 * Source: https://youtu.be/_jj73GOzVLg (Channel: Bet With Mo)
 * * Logic & Triggers:
 * - The strategy plays a modular layout that scales up across different sectors of the table on losses.
 * - Initial layout targets the 1st Dozen (Splits 2/3, 5/6, and Double Street 7/12).
 * - Losses expand the layout to the 2nd Dozen, then the 3rd Dozen, and apply specific multipliers or unit increments.
 * - Wins on splits trigger a dynamic "blast radius containment": the specific winning split is removed from subsequent bets.
 * Up to 2 splits can be safely removed to lock in profits while letting the remaining bets run.
 * - When the session reaches or exceeds its peak bankroll profit, the entire layout resets back to Level 1.
 * * Full Bet Progression:
 * - Level 1: 1st Dozen (1 unit on splits 2/3, 5/6; 2 units on 7/12 double street)
 * - Level 2 (After 1st Loss): Keep Level 1 bets + Add 2nd Dozen (1 unit on splits 14/15, 17/18; 2 units on 19/24 double street)
 * - Level 3 (After 2nd Loss): Keep Level 1 & 2 bets + Add 3rd Dozen (1 unit on splits 26/27, 29/30) AND double up all existing bets.
 * - Level 4 (After 3rd Loss): Rebet and increase all active bets by their initial base values (Splits +1 unit, Double Streets +2 units).
 * - Level 5 (After 4th Loss): Rebet and double all active bets.
 * - Level 6 (After 5th Loss): Rebet and increase all active bets by 2x their initial base values (Splits +2 units, Double Streets +4 units).
 * - Level 7 (After 6th Loss): Rebet and increase all active bets by 4x their initial base values (Splits +4 units, Double Streets +8 units).
 * - Level 8 (After 7th Loss): Rebet and double all active bets.
 * * Goal:
 * - Lock in cumulative positive progression returns, tracking bankroll milestones, and resetting cleanly upon achieving new peaks.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const splitMin = config.betLimits.min;

    // 1. Initialize State
    if (!state.isInitialized) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.removedSplits = []; // Tracks specific values removed: e.g., [2, 5]
        
        // Dynamic multipliers per position type across the levels
        state.multipliers = {
            s2_3: 1, s5_6: 1, ds7_12: 2,
            s14_15: 0, s17_18: 0, ds19_24: 0,
            s26_27: 0, s29_30: 0, ds31_36: 0
        };
        state.isInitialized = true;
    }

    // 2. Process History and Win/Loss Transitions
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        // Peak profit target check -> Reset on any net new profit achievement
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
            state.level = 1;
            state.removedSplits = [];
        } else {
            // Check which specific bet won
            const won2_3 = (winNum === 2 || winNum === 3) && state.multipliers.s2_3 > 0 && !state.removedSplits.includes(2);
            const won5_6 = (winNum === 5 || winNum === 6) && state.multipliers.s5_6 > 0 && !state.removedSplits.includes(5);
            const won14_15 = (winNum === 14 || winNum === 15) && state.multipliers.s14_15 > 0 && !state.removedSplits.includes(14);
            const won17_18 = (winNum === 17 || winNum === 18) && state.multipliers.s17_18 > 0 && !state.removedSplits.includes(17);
            const won26_27 = (winNum === 26 || winNum === 27) && state.multipliers.s26_27 > 0 && !state.removedSplits.includes(26);
            const won29_30 = (winNum === 29 || winNum === 30) && state.multipliers.s29_30 > 0 && !state.removedSplits.includes(29);

            const wonAnySplit = won2_3 || won5_6 || won14_15 || won17_18 || won26_27 || won29_30;

            // Check if any double street won
            const wonDS7_12 = (winNum >= 7 && winNum <= 12) && state.multipliers.ds7_12 > 0;
            const wonDS19_24 = (winNum >= 19 && winNum <= 24) && state.multipliers.ds19_24 > 0;
            const wonDS31_36 = (winNum >= 31 && winNum <= 36) && state.multipliers.ds31_36 > 0;
            
            const wonAnyDS = wonDS7_12 || wonDS19_24 || wonDS31_36;

            if (wonAnySplit) {
                // Remove the winning split bet (max 2 overall)
                if (state.removedSplits.length < 2) {
                    if (won2_3) state.removedSplits.push(2);
                    if (won5_6) state.removedSplits.push(5);
                    if (won14_15) state.removedSplits.push(14);
                    if (won17_18) state.removedSplits.push(17);
                    if (won26_27) state.removedSplits.push(26);
                    if (won29_30) state.removedSplits.push(29);
                }
                // Keep multipliers as they are for remaining positions
            } else if (wonAnyDS) {
                // Double street wins maintain current level structures unless peak profit is cleared
            } else {
                // Clean Loss -> Advance progression level
                state.level++;
                if (state.level > 8) state.level = 1; // Safety cycle fail-safe
            }
        }
    }

    // 3. Build Layout and Multipliers based on current calculated Level
    if (state.level === 1) {
        state.multipliers = {
            s2_3: 1, s5_6: 1, ds7_12: 2,
            s14_15: 0, s17_18: 0, ds19_24: 0,
            s26_27: 0, s29_30: 0, ds31_36: 0
        };
    } else if (state.level === 2) {
        // Level 2: Initial 1st Dozen layout + add 2nd Dozen components
        state.multipliers = {
            s2_3: 1, s5_6: 1, ds7_12: 2,
            s14_15: 1, s17_18: 1, ds19_24: 2,
            s26_27: 0, s29_30: 0, ds31_36: 0
        };
    } else if (state.level === 3) {
        // Level 3: Add 3rd Dozen splits & double up all prior active configurations
        state.multipliers = {
            s2_3: 2, s5_6: 2, ds7_12: 4,
            s14_15: 2, s17_18: 2, ds19_24: 4,
            s26_27: 2, s29_30: 2, ds31_36: 0
        };
    } else if (state.level === 4) {
        // Level 4: Increase by initial base layout unit sizes
        state.multipliers.s2_3 += 1;   state.multipliers.s5_6 += 1;   state.multipliers.ds7_12 += 2;
        state.multipliers.s14_15 += 1; state.multipliers.s17_18 += 1; state.multipliers.ds19_24 += 2;
        state.multipliers.s26_27 += 1; state.multipliers.s29_30 += 1;
    } else if (state.level === 5) {
        // Level 5: Double all current bets
        for (let key in state.multipliers) state.multipliers[key] *= 2;
    } else if (state.level === 6) {
        // Level 6: Increase by 2x initial layout unit values
        state.multipliers.s2_3 += 2;   state.multipliers.s5_6 += 2;   state.multipliers.ds7_12 += 4;
        state.multipliers.s14_15 += 2; state.multipliers.s17_18 += 2; state.multipliers.ds19_24 += 4;
        state.multipliers.s26_27 += 2; state.multipliers.s29_30 += 2;
    } else if (state.level === 7) {
        // Level 7: Increase by 4x initial layout unit values
        state.multipliers.s2_3 += 4;   state.multipliers.s5_6 += 4;   state.multipliers.ds7_12 += 8;
        state.multipliers.s14_15 += 4; state.multipliers.s17_18 += 4; state.multipliers.ds19_24 += 8;
        state.multipliers.s26_27 += 4; state.multipliers.s29_30 += 4;
    } else if (state.level === 8) {
        // Level 8: Double all current bets
        for (let key in state.multipliers) state.multipliers[key] *= 2;
    }

    // 4. Construct Final Bets Array honoring constraints & exclusions
    const bets = [];

    const formatBet = (type, value, calculatedAmount) => {
        if (calculatedAmount <= 0) return;
        let amount = Math.max(calculatedAmount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        bets.push({ type: type, value: value, amount: amount });
    };

    // Dozen 1
    if (!state.removedSplits.includes(2)) formatBet('split', [2, 3], state.multipliers.s2_3 * splitMin);
    if (!state.removedSplits.includes(5)) formatBet('split', [5, 6], state.multipliers.s5_6 * splitMin);
    formatBet('line', 7, state.multipliers.ds7_12 * splitMin);

    // Dozen 2
    if (!state.removedSplits.includes(14)) formatBet('split', [14, 15], state.multipliers.s14_15 * splitMin);
    if (!state.removedSplits.includes(17)) formatBet('split', [17, 18], state.multipliers.s17_18 * splitMin);
    formatBet('line', 19, state.multipliers.ds19_24 * splitMin);

    // Dozen 3
    if (!state.removedSplits.includes(26)) formatBet('split', [26, 27], state.multipliers.s26_27 * splitMin);
    if (!state.removedSplits.includes(29)) formatBet('split', [29, 30], state.multipliers.s29_30 * splitMin);
    formatBet('line', 31, state.multipliers.ds31_36 * splitMin);

    return bets;
}