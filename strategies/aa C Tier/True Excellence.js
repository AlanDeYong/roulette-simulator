/**
 * STRATEGY: True Excellence (Two Dozens + Street Recovery)
 * * SOURCE: 
 * CEG Dealer School (YouTube) - "True Excellence" Strategy
 * * LOGIC:
 * This is a high-coverage grinding strategy that aims to capture streaks of "repeating dozens".
 * 1. Base Game: Bet on two Dozens (24 numbers). The selection is dynamic:
 * bet on the last two unique Dozens that hit.
 * 2. Coverage: Starts covering 64% of the board. Increases to 73% (Level 1) 
 * and 81% (Level 2) during recovery.
 * * PROGRESSION (Recovery Levels):
 * - Level 0 (Base): 
 * - Bet 1 unit on two Dozens.
 * - Trigger: Start here. If won, stay here. If lost, go to Level 1.
 * * - Level 1 (Recovery):
 * - Trigger: A loss at Level 0.
 * - Bets: Increase Dozens to 2 units each. ADD 1 Street bet (0.5 - 1 unit) on the "coldest" street.
 * - Reset Condition: Must win 2 times at this level to return to Level 0.
 * - Progression: If lost here, go to Level 2.
 * * - Level 2 (Recovery):
 * - Trigger: A loss at Level 1.
 * - Bets: Increase Dozens to 4 units each. ADD 2 Street bets (1 unit each) on the two "coldest" streets.
 * - Reset Condition: Must win 3 times at this level to return to Level 0.
 * - Safety: If lost here, strict reset to Level 0 (Stop Loss).
 * * GOAL:
 * Grind out small profits using high probability (dozens) while using Street bets
 * during losses to increase coverage and recover the bankroll faster.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- HELPER FUNCTIONS ---
    
    // Get Dozen (1, 2, 3) or 0
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    };

    // Get Street Index (1-12)
    // Street 1 (1-3), Street 2 (4-6)...
    const getStreetIdx = (num) => {
        if (num === 0 || num === '00') return 0;
        return Math.ceil(num / 3);
    };

    // Get Street Start Number for betting (e.g., Street 1 starts at 1, Street 2 starts at 4)
    const getStreetStart = (idx) => (idx - 1) * 3 + 1;

    // --- 1. CONFIGURATION & SETUP ---

    // Define Base Units based on limits
    // We use minOutside for Dozens and min (Inside) for Streets
    const unitOutside = config.betLimits.minOutside; 
    const unitInside = config.betLimits.min; 

    // Initialize State
    if (typeof state.level === 'undefined') state.level = 0; // 0=Base, 1=Rec1, 2=Rec2
    if (typeof state.winsNeeded === 'undefined') state.winsNeeded = 0;
    if (typeof state.lastBets === 'undefined') state.lastBets = [];

    // --- 2. PROCESS PREVIOUS SPIN (Update State) ---

    // If we have history and made bets last time, check result
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        let wonSpin = false;

        // Determine if we won
        let payout = 0;
        let totalBet = 0;

        for (const b of state.lastBets) {
            totalBet += b.amount;
            // Check Dozen Win
            if (b.type === 'dozen') {
                if (getDozen(lastNum) === b.value) {
                    payout += b.amount * 3; // 2:1 pays 3 total
                }
            }
            // Check Street Win
            else if (b.type === 'street') {
                const streetIdx = getStreetIdx(lastNum); // 1-12
                const betStreetIdx = Math.ceil(b.value / 3); // Convert start num back to index
                if (streetIdx === betStreetIdx) {
                    payout += b.amount * 12; // 11:1 pays 12 total
                }
            }
        }
        
        const net = payout - totalBet;
        wonSpin = net > 0;

        // --- PROGRESSION LOGIC ---
        if (state.level === 0) {
            if (!wonSpin) {
                state.level = 1;
                state.winsNeeded = 2; // Need 2 wins to clear Level 1
            }
        } 
        else if (state.level === 1) {
            if (wonSpin) {
                state.winsNeeded--;
                if (state.winsNeeded <= 0) state.level = 0;
            } else {
                state.level = 2;
                state.winsNeeded = 3; // Need 3 wins to clear Level 2
            }
        } 
        else if (state.level === 2) {
            if (wonSpin) {
                state.winsNeeded--;
                if (state.winsNeeded <= 0) state.level = 0;
            } else {
                // Hard Stop Loss: Reset to Base if we lose Level 2
                state.level = 0;
                state.winsNeeded = 0;
            }
        }
    }

    // --- 3. DETERMINE BET TARGETS ---

    // A. FIND TARGET DOZENS (Follow the trend)
    // Look backwards to find the last 2 unique dozens that hit
    let targetDozens = [];
    let historyPtr = spinHistory.length - 1;
    
    while (targetDozens.length < 2 && historyPtr >= 0) {
        const num = spinHistory[historyPtr].winningNumber;
        const doz = getDozen(num);
        if (doz !== 0 && !targetDozens.includes(doz)) {
            targetDozens.push(doz);
        }
        historyPtr--;
    }

    // Fallbacks if history is short or only 0s hit
    if (targetDozens.length === 0) targetDozens = [2, 3]; // Default to 2nd and 3rd
    else if (targetDozens.length === 1) {
        // If we have Dozen 2, add 3. If we have 1, add 2.
        targetDozens.push(targetDozens[0] === 2 ? 3 : 2);
    }
    // Ensure strictly 2 targets (though logic above handles it)
    targetDozens = targetDozens.slice(0, 2);


    // B. FIND TARGET STREETS (Find the coldest/least recent)
    // Map of Street Index (1-12) -> spins since last hit
    let streetRecency = Array.from({length: 12}, (_, i) => ({ id: i + 1, lastSeenIndex: -1 }));
    
    // Scan history to find last hit index for each street
    // We scan entire history (or last 100 for perf)
    const limit = Math.max(0, spinHistory.length - 100);
    for (let i = spinHistory.length - 1; i >= limit; i--) {
        const num = spinHistory[i].winningNumber;
        const sIdx = getStreetIdx(num);
        if (sIdx > 0 && streetRecency[sIdx - 1].lastSeenIndex === -1) {
            streetRecency[sIdx - 1].lastSeenIndex = i;
        }
    }

    // Sort: Streets never seen (index -1) come first, then oldest indices
    streetRecency.sort((a, b) => a.lastSeenIndex - b.lastSeenIndex);
    
    // Top 2 coldest streets
    const targetStreet1 = getStreetStart(streetRecency[0].id);
    const targetStreet2 = getStreetStart(streetRecency[1].id);


    // --- 4. CONSTRUCT BETS ---

    let bets = [];

    // Helper to add clamped bet
    const addBet = (type, val, rawAmount, isInside) => {
        const min = isInside ? config.betLimits.min : config.betLimits.minOutside;
        const max = config.betLimits.max;
        
        // Clamp
        let finalAmt = Math.max(rawAmount, min);
        finalAmt = Math.min(finalAmt, max);

        bets.push({ type: type, value: val, amount: finalAmt });
    };

    if (state.level === 0) {
        // LEVEL 0: 1 Unit on two Dozens
        addBet('dozen', targetDozens[0], unitOutside * 1, false);
        addBet('dozen', targetDozens[1], unitOutside * 1, false);
    } 
    else if (state.level === 1) {
        // LEVEL 1: 2 Units on Dozens, 1 Unit on Coldest Street
        // Note: Strategy usually calls for smaller street bet, but we must hit minInside
        addBet('dozen', targetDozens[0], unitOutside * 2, false);
        addBet('dozen', targetDozens[1], unitOutside * 2, false);
        addBet('street', targetStreet1, unitInside * 1, true);
    } 
    else if (state.level === 2) {
        // LEVEL 2: 4 Units on Dozens, 1 Unit on TWO Coldest Streets
        addBet('dozen', targetDozens[0], unitOutside * 4, false);
        addBet('dozen', targetDozens[1], unitOutside * 4, false);
        addBet('street', targetStreet1, unitInside * 2, true); // Strategy often doubles street here too
        addBet('street', targetStreet2, unitInside * 2, true);
    }

    // --- 5. FINALIZE ---
    
    // Save bets to state for next spin validation
    state.lastBets = bets;
    
    return bets;
}