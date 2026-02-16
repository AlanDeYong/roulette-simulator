/**
 * STRATEGY: Four Double Street "Turtle" System
 * * SOURCE: 
 * URL: https://www.youtube.com/watch?v=r5UaAhg9oE8
 * Channel: Roulette Software
 * * THE LOGIC:
 * This is a low-volatility "wait for trigger" strategy.
 * 1. Virtual Loss Trigger: We monitor all 6 "Double Streets" (Lines) on the board.
 * - Line 1: 1-6, Line 2: 7-12, etc.
 * 2. Activation: If a specific Line misses 4 times in a row (Virtual Loss count >= 4),
 * we start betting on it.
 * 3. Simultaneous Play: We can bet on up to 4 Lines simultaneously, but each runs its
 * own independent game/progression.
 * * THE PROGRESSION:
 * - Independent Linear Progression: [1, 2, 3, 4, 5, 6, 7...] units.
 * - On Win: The progression for that specific Line resets/stops (Hit and Run). We stop betting
 * on that Line and wait for it to get "cold" (4 misses) again.
 * - On Loss: We move to the next step in the progression for that specific Line.
 * * THE GOAL:
 * - Secure small, consistent wins while minimizing drawdown by avoiding "hot" lines 
 * and only entering when a line is "due" (statistically cold).
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_BET = config.betLimits.min; // 'line' is an Inside bet
    const MAX_BET = config.betLimits.max;
    const WAIT_TRIGGER = 4; // Misses required before betting
    const MAX_ACTIVE_LINES = 4; // Max simultaneous double streets
    
    // Progression sequence (Units)
    const PROGRESSION = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    // Definition of Double Streets (Lines) by their starting number
    const LINE_STARTS = [1, 7, 13, 19, 25, 31];

    // Helper: Determine which line a number belongs to (returns start num or null)
    const getLineFromNumber = (num) => {
        if (num === 0 || num === '00') return null; // 0 is a loss for all lines
        // Numbers 1-36
        return LINE_STARTS.find(start => num >= start && num < start + 6) || null;
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.lineMisses = {};    // Track misses for all 6 lines: { "1": 0, "7": 4... }
        state.activeBets = {};    // Track active betting threads: { "1": { progIndex: 0 } }
        state.lastProcessedSpin = 0; // To sync history processing
        
        // Init misses to 0
        LINE_STARTS.forEach(start => state.lineMisses[start] = 0);
        state.initialized = true;
    }

    // --- 3. SYNC STATE WITH HISTORY ---
    // We iterate from where we left off to ensure counters are accurate
    // This handles cases where spinHistory is pre-populated or updates happen in batches.
    for (let i = state.lastProcessedSpin; i < spinHistory.length; i++) {
        const spin = spinHistory[i];
        const winningNum = spin.winningNumber;
        const winningLineStart = getLineFromNumber(winningNum);

        // Update all 6 lines
        LINE_STARTS.forEach(lineStart => {
            const isHit = (lineStart === winningLineStart);

            // A. Update Virtual Loss Counters
            if (isHit) {
                state.lineMisses[lineStart] = 0;
            } else {
                state.lineMisses[lineStart]++;
            }

            // B. Manage Active Bets (Resolution)
            if (state.activeBets[lineStart]) {
                if (isHit) {
                    // WIN: Clear the bet (Hit and Run logic)
                    delete state.activeBets[lineStart]; 
                } else {
                    // LOSS: Advance progression
                    state.activeBets[lineStart].progIndex++;
                }
            }
        });

        // C. Check for New Activations (Triggers)
        // We do this AFTER processing the spin results
        const currentActiveCount = Object.keys(state.activeBets).length;
        
        // If we have room for more bets
        if (currentActiveCount < MAX_ACTIVE_LINES) {
            // Check all lines to see if any qualify
            // We shuffle or just iterate. Standard iteration is fine.
            for (let lineStart of LINE_STARTS) {
                // If we are already full, stop looking
                if (Object.keys(state.activeBets).length >= MAX_ACTIVE_LINES) break;

                const isBetting = !!state.activeBets[lineStart];
                const misses = state.lineMisses[lineStart];

                // Trigger: Not currently betting AND misses >= Trigger Threshold
                if (!isBetting && misses >= WAIT_TRIGGER) {
                    state.activeBets[lineStart] = { progIndex: 0 };
                }
            }
        }
    }

    // Update the tracker so we don't re-process these spins next time
    state.lastProcessedSpin = spinHistory.length;

    // --- 4. GENERATE BETS ---
    const bets = [];

    // Iterate through all currently active betting threads
    for (const lineStart in state.activeBets) {
        const lineInfo = state.activeBets[lineStart];
        
        // Safety: Cap progression at end of array (or loop, here we clamp to max index)
        const pIndex = Math.min(lineInfo.progIndex, PROGRESSION.length - 1);
        const units = PROGRESSION[pIndex];
        
        // Calculate Amount
        let amount = units * MIN_BET;

        // Respect Limits
        amount = Math.max(amount, MIN_BET); // Clamp Min
        amount = Math.min(amount, MAX_BET); // Clamp Max

        // If bankroll is too low to cover, bet whatever is left (optional safety)
        if (amount > bankroll) amount = bankroll;

        if (amount > 0) {
            bets.push({
                type: 'line',
                value: parseInt(lineStart), // 'line' bet uses the start number
                amount: amount
            });
        }
    }

    return bets;
}