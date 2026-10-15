/**
 * ============================================================================
 * Strategy: The Triple Double (Helix Progression + Corner Parachute)
 * Source:   https://youtu.be/-FxEVmKpd2A
 * Channel:  The Lucky Felt (Todd Hoover)
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. Board Coverage:
 *    - Covers 18 numbers across 3 double streets (six-line bets), choosing exactly
 *      one double street in each of the three dozens:
 *      * 1st Dozen (1-12):  Line 1 (1-6)   OR Line 7 (7-12)
 *      * 2nd Dozen (13-24): Line 13 (13-18) OR Line 19 (19-24)
 *      * 3rd Dozen (25-36): Line 25 (25-30) OR Line 31 (31-36)
 * 
 * 2. Dynamic Footprint Shift:
 *    - After any winning spin, the winning dozen shifts its bet to the opposite
 *      double street in that dozen to dodge cold zones and follow wheel momentum.
 *    - Dozens that did not hit keep their current double street selections.
 * 
 * THE FULL BET PROGRESSION IN DETAIL (The Helix Progression):
 * - Multiplier Sequence: [1, 2, 4, 8, 7, 5]
 *   * Level 1 (Step 0): 1 unit per double street (3 Line bets = 3 units total)
 *   * Level 2 (Step 1): 2 units per double street (3 Line bets = 6 units total)
 *   * Level 3 (Step 2): 4 units per double street (3 Line bets = 12 units total)
 *   * Level 4 (Step 3): 8 units per double street (3 Line bets = 24 units total)
 *   * Level 5 (Step 4 - Corner Parachute 1): 7 units on 1 Corner inside each active double street (3 Corner bets = 21 units total)
 *   * Level 6 (Step 5 - Corner Parachute 2): 5 units on 1 Corner inside each active double street (3 Corner bets = 15 units total)
 * 
 * - Win Rule: On any win at any level, reset progression index to 0 (Level 1).
 * - Loss Rule: On a loss, advance to the next step. If Level 6 loses, accept the hard stop and reset to Level 1.
 * 
 * THE GOAL:
 * - Target Profit: +20% session profit over starting bankroll (e.g., +$400 on $2,000 bankroll).
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State and Target Profit
    if (!state.initialized) {
        state.startingBankroll = config.startingBankroll || bankroll;
        state.targetProfit = state.startingBankroll * 0.20;
        state.progressionStep = 0; // Steps 0 to 5
        
        // Active line selection for each dozen (start num of the 6-line)
        state.activeLines = {
            d1: 7,   // 1st Dozen: 1 (1-6) or 7 (7-12)
            d2: 13,  // 2nd Dozen: 13 (13-18) or 19 (19-24)
            d3: 31   // 3rd Dozen: 25 (25-30) or 31 (31-36)
        };
        state.initialized = true;
    }

    // 2. Check Target Profit Goal (+20% Session Profit)
    if (bankroll >= state.startingBankroll + state.targetProfit) {
        return []; // Target achieved, stop betting
    }

    // 3. Process Last Spin Result (if any)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastStep = state.lastStep !== undefined ? state.lastStep : 0;
        const isCornerPhase = lastStep >= 4;

        let won = false;

        if (lastNum >= 1 && lastNum <= 36) {
            if (!isCornerPhase) {
                // Check if last winning number landed in any active double street
                if (lastNum >= state.activeLines.d1 && lastNum <= state.activeLines.d1 + 5) {
                    won = true;
                    state.activeLines.d1 = state.activeLines.d1 === 1 ? 7 : 1; // Flip Dozen 1
                } else if (lastNum >= state.activeLines.d2 && lastNum <= state.activeLines.d2 + 5) {
                    won = true;
                    state.activeLines.d2 = state.activeLines.d2 === 13 ? 19 : 13; // Flip Dozen 2
                } else if (lastNum >= state.activeLines.d3 && lastNum <= state.activeLines.d3 + 5) {
                    won = true;
                    state.activeLines.d3 = state.activeLines.d3 === 25 ? 31 : 25; // Flip Dozen 3
                }
            } else {
                // Corner Parachute Phase: corner values match the start of the active double street
                // Corner value X covers [X, X+1, X+3, X+4]
                const cornerD1 = [state.activeLines.d1, state.activeLines.d1 + 1, state.activeLines.d1 + 3, state.activeLines.d1 + 4];
                const cornerD2 = [state.activeLines.d2, state.activeLines.d2 + 1, state.activeLines.d2 + 3, state.activeLines.d2 + 4];
                const cornerD3 = [state.activeLines.d3, state.activeLines.d3 + 1, state.activeLines.d3 + 3, state.activeLines.d3 + 4];

                if (cornerD1.includes(lastNum)) {
                    won = true;
                    state.activeLines.d1 = state.activeLines.d1 === 1 ? 7 : 1;
                } else if (cornerD2.includes(lastNum)) {
                    won = true;
                    state.activeLines.d2 = state.activeLines.d2 === 13 ? 19 : 13;
                } else if (cornerD3.includes(lastNum)) {
                    won = true;
                    state.activeLines.d3 = state.activeLines.d3 === 25 ? 31 : 25;
                }
            }
        }

        // Progression State Machine
        if (won) {
            state.progressionStep = 0; // Reset on win
        } else {
            state.progressionStep++;
            // Hard stop / reset if progression exceeds step 5 (Level 6)
            if (state.progressionStep > 5) {
                state.progressionStep = 0;
            }
        }
    }

    // 4. Determine Current Bet Multipliers and Bet Type
    // Progression Multipliers: 1, 2, 4, 8, 7, 5
    const progressionMultipliers = [1, 2, 4, 8, 7, 5];
    const multiplier = progressionMultipliers[state.progressionStep];
    const baseUnit = config.betLimits.min; // Inside bet unit limit
    let betAmount = baseUnit * multiplier;

    // Clamp bet amount to configured table limits
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Track current step for the next spin evaluation
    state.lastStep = state.progressionStep;

    // 5. Construct Bets (Double Streets for Levels 1-4, Corners for Levels 5-6)
    const bets = [];
    if (state.progressionStep < 4) {
        // Double Street (Six Line) Bets
        bets.push({ type: 'line', value: state.activeLines.d1, amount: betAmount });
        bets.push({ type: 'line', value: state.activeLines.d2, amount: betAmount });
        bets.push({ type: 'line', value: state.activeLines.d3, amount: betAmount });
    } else {
        // Corner Parachute Bets (top-left number corresponds to active line value)
        bets.push({ type: 'corner', value: state.activeLines.d1, amount: betAmount });
        bets.push({ type: 'corner', value: state.activeLines.d2, amount: betAmount });
        bets.push({ type: 'corner', value: state.activeLines.d3, amount: betAmount });
    }

    return bets;
}