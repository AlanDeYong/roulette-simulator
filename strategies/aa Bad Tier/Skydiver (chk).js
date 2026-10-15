/**
 * Strategy: The Skydiver Protocol (Modified/Strict Progression)
 * Source: https://youtu.be/F4jo86PrwTI (Channel: The Lucky Felt)
 * 
 * --- Full Logic Description ---
 * 1. Waiting Phase:
 *    - Do not place any bets at the start of the session or after a hard reset.
 *    - Wait until at least 2 distinct dozens have won in the spin history.
 * 
 * 2. Phase 1: Freefall (Two Dozens)
 *    - Trigger: 2 different dozens have been recorded.
 *    - Bet: 1 base unit each on the last 2 winning dozens.
 *    - Progression on Loss: Rebet the same positions and increase their bet sizes by the step amount 
 *      (determined by config.incrementMode: either a fixed unit or the base bet amount).
 *    - Progression on Win: Move to Phase 2.
 * 
 * 3. Phase 2: Parachute (One Column)
 *    - Trigger: One of our dozens won in Phase 1.
 *    - Bet: Place a bet on the very last winning column. The bet amount matches the base unit size.
 *    - Progression on Loss: Hard reset back to Phase 1 (Waiting state).
 *    - Progression on Win: Move to Phase 3.
 * 
 * 4. Phase 3: Bullseye (Three Streets)
 *    - Trigger: The column bet in Phase 2 won.
 *    - Bet: Place a 1-unit bet each on the last 3 distinct winning streets.
 *    - Progression on Win/Loss: Hard reset back to Phase 1 (Waiting state).
 * 
 * --- Goal & Safety ---
 * The strategy aims to safely leverage house money during Phases 2 and 3. 
 * All bets are strictly clamped within the table's minimum and maximum limits.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- Helper Math Mapping Functions ---
    function getDozen(num) {
        if (num === 0 || num === 37) return null; // 37 handles '00' if american
        return Math.ceil(num / 12); // 1, 2, or 3
    }

    function getColumn(num) {
        if (num === 0 || num === 37) return null;
        const mod = num % 3;
        return mod === 0 ? 3 : mod; // 1, 2, or 3
    }

    function getStreet(num) {
        if (num === 0 || num === 37) return null;
        // Returns starting number of the street row (1, 4, 7, 10, ..., 34)
        return Math.floor((num - 1) / 3) * 3 + 1;
    }

    // --- State Initialization ---
    if (!state.phase) {
        state.phase = 'WAITING'; // 'WAITING', 'DOZENS', 'COLUMN', 'STREETS'
        state.currentLevel = 1;  // Multiplier level for Dozens phase progression
    }

    // If there is no spin history, we must wait
    if (!spinHistory || spinHistory.length === 0) {
        state.phase = 'WAITING';
        return [];
    }

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    // --- Phase Transitions & Internal Win Tracking ---
    if (state.phase === 'DOZENS') {
        const wonDozensBet = state.activeBets && state.activeBets.some(b => b.type === 'dozen' && b.value === getDozen(lastNum));
        if (wonDozensBet) {
            // Win -> Go to Column Phase
            state.phase = 'COLUMN';
        } else {
            // Loss -> Increase progression level
            state.currentLevel++;
        }
    } 
    else if (state.phase === 'COLUMN') {
        const wonColumnBet = state.activeBets && state.activeBets.some(b => b.type === 'column' && b.value === getColumn(lastNum));
        if (wonColumnBet) {
            // Win -> Go to Streets Phase
            state.phase = 'STREETS';
        } else {
            // Loss -> Reset to Waiting
            state.phase = 'WAITING';
            state.currentLevel = 1;
        }
    } 
    else if (state.phase === 'STREETS') {
        // Streets phase resets immediately after 1 spin regardless of outcome
        state.phase = 'WAITING';
        state.currentLevel = 1;
    }

    // --- Process History for Strategy Targets ---
    // Extract unique tracking sequences from spin history
    const historyDozen = [];
    const historyColumn = [];
    const historyStreet = [];

    for (let i = spinHistory.length - 1; i >= 0; i--) {
        const num = spinHistory[i].winningNumber;
        const d = getDozen(num);
        const c = getColumn(num);
        const s = getStreet(num);

        if (d !== null && !historyDozen.includes(d)) historyDozen.push(d);
        if (c !== null && !historyColumn.includes(c)) historyColumn.push(c);
        if (s !== null && !historyStreet.includes(s)) historyStreet.push(s);
    }

    // If waiting, check if we have 2 distinct dozens in history to unlock Phase 1
    if (state.phase === 'WAITING') {
        if (historyDozen.length >= 2) {
            state.phase = 'DOZENS';
            state.currentLevel = 1;
        } else {
            state.activeBets = [];
            return []; // Remain waiting, no bets placed
        }
    }

    // --- Calculate and Generate Bets ---
    let generatedBets = [];

    if (state.phase === 'DOZENS') {
        const baseUnit = config.betLimits.minOutside;
        let increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);
        
        // Calculate bet amount based on multiplier progression level
        let betAmount = baseUnit + (state.currentLevel - 1) * increment;
        betAmount = Math.max(betAmount, config.betLimits.minOutside);
        betAmount = Math.min(betAmount, config.betLimits.max);

        // Target the last 2 unique winning dozens
        if (historyDozen.length >= 2) {
            generatedBets.push({ type: 'dozen', value: historyDozen[0], amount: betAmount });
            generatedBets.push({ type: 'dozen', value: historyDozen[1], amount: betAmount });
        }
    } 
    else if (state.phase === 'COLUMN') {
        let betAmount = config.betLimits.minOutside;
        betAmount = Math.max(betAmount, config.betLimits.minOutside);
        betAmount = Math.min(betAmount, config.betLimits.max);

        // Target the last winning column
        if (historyColumn.length >= 1) {
            generatedBets.push({ type: 'column', value: historyColumn[0], amount: betAmount });
        }
    } 
    else if (state.phase === 'STREETS') {
        let betAmount = config.betLimits.min; // Inside bet limit unit
        betAmount = Math.max(betAmount, config.betLimits.min);
        betAmount = Math.min(betAmount, config.betLimits.max);

        // Target up to the last 3 unique winning streets
        const totalStreetsToBet = Math.min(historyStreet.length, 3);
        for (let i = 0; i < totalStreetsToBet; i++) {
            generatedBets.push({ type: 'street', value: historyStreet[i], amount: betAmount });
        }
    }

    // Save currently placed bets to state so we can evaluate wins/losses on the next spin
    state.activeBets = generatedBets;
    return generatedBets;
}