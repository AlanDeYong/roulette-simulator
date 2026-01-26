/**
 * STRATEGY: Double Street Virtual Loss & Back-Reference
 * * SOURCE: 
 * - Logic derived from general "Double Street/Line" strategies found in roulette communities.
 * - Adapted for "Man on the Street" viability with low starting units.
 * * THE LOGIC:
 * - Bet Selection: Double Streets (Line bets covering 6 numbers).
 * Options: 1-6, 7-12, 13-18, 19-24, 25-30, 31-36.
 * - Triggers (Entry Points):
 * 1. Virtual Loss: Wait for a specific Double Street to miss 4 times in a row.
 * 2. Back-Reference: Bet on the Double Street that won 2 spins ago (e.g., if current is Spin 10, check result of Spin 8).
 * - Constraints: Maximum of 4 Double Streets active at any one time.
 * - Conflict Resolution: If candidates > 4, prioritize the "Back-Reference" trigger over the "Virtual Loss" trigger.
 * * THE PROGRESSION (Independent per Double Street):
 * - Type: Basic Incremental Sequence.
 * - Logic: 1 unit, 2 units, 3 units, 4 units...
 * - On Loss: Increase bet by 1 unit for the next spin.
 * - On Win: Reset progression for that specific Double Street, clear "active" status, and wait for a new trigger.
 * * THE GOAL:
 * - Secure small, consistent profits using the 5:1 payout of Double Streets to cover the slow progression.
 * - Minimize risk by limiting exposure to maximum 4 lines.
 * * @param {Array} spinHistory - Array of past spin objects
 * @param {number} bankroll - Current wallet balance
 * @param {Object} config - Configuration including betLimits
 * @param {Object} state - Persistent state object
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & HELPER FUNCTIONS ---

    // Define the 6 Double Streets (Lines) by their starting number
    const doubleStreets = [1, 7, 13, 19, 25, 31];
    const unit = config.betLimits.min; // Line bets are Inside bets, use min
    const maxActiveStreets = 4;

    // Helper: Find which Double Street start-number a winning number belongs to
    // Returns null for 0, otherwise returns 1, 7, 13, etc.
    const getStreetStart = (num) => {
        if (num === 0 || num === '0' || num === '00') return null;
        for (let start of doubleStreets) {
            if (num >= start && num < start + 6) return start;
        }
        return null;
    };

    // --- 2. INITIALIZE STATE ---

    if (!state.trackers) {
        state.trackers = {};
        // Initialize a tracker for each Double Street
        doubleStreets.forEach(startNum => {
            state.trackers[startNum] = {
                misses: 0,       // Virtual loss counter
                level: 1,        // Current betting unit level
                active: false    // Whether we are currently betting on this line
            };
        });
        state.lastProcessedIndex = -1;
    }

    // --- 3. PROCESS HISTORY (Update State) ---

    // We only process new spins since the last time this function ran
    for (let i = state.lastProcessedIndex + 1; i < spinHistory.length; i++) {
        const spin = spinHistory[i];
        const winningNum = spin.winningNumber;
        const winningStreetStart = getStreetStart(winningNum);

        doubleStreets.forEach(startNum => {
            const tracker = state.trackers[startNum];

            if (startNum === winningStreetStart) {
                // HIT
                tracker.misses = 0; // Reset virtual miss count
                if (tracker.active) {
                    // We were betting and won: Reset and Stop
                    tracker.active = false;
                    tracker.level = 1;
                }
            } else {
                // MISS (includes Zero)
                tracker.misses++;
                if (tracker.active) {
                    // We were betting and lost: Increase progression
                    tracker.level++;
                }
            }
        });
    }

    // Update index so we don't re-process history next time
    state.lastProcessedIndex = spinHistory.length - 1;


    // --- 4. IDENTIFY BET CANDIDATES ---

    // A. Priority 1: Keep betting on currently active progressions (Commitment)
    let activeBets = [];
    doubleStreets.forEach(startNum => {
        if (state.trackers[startNum].active) {
            activeBets.push(startNum);
        }
    });

    // If we already have 4 active bets, we cannot add new ones.
    // If fewer than 4, we look for triggers.
    if (activeBets.length < maxActiveStreets) {
        
        let potentialNewBets = [];

        // B. Trigger 2: Back-Reference (Winner from 2 spins ago)
        // High priority entry trigger
        let backRefTarget = null;
        if (spinHistory.length >= 2) {
            const twoSpinsAgo = spinHistory[spinHistory.length - 2];
            backRefTarget = getStreetStart(twoSpinsAgo.winningNumber);
            
            // If valid target and not already active, add to potential
            if (backRefTarget !== null && !state.trackers[backRefTarget].active) {
                // Mark this as high priority in our logic
                potentialNewBets.push({ start: backRefTarget, priority: 2 });
            }
        }

        // C. Trigger 1: Virtual Loss (Misses >= 4)
        doubleStreets.forEach(startNum => {
            const tracker = state.trackers[startNum];
            // If misses >= 4, not active, and not the backRefTarget we just added
            if (tracker.misses >= 4 && !tracker.active && startNum !== backRefTarget) {
                potentialNewBets.push({ start: startNum, priority: 1 });
            }
        });

        // Sort potential bets by priority (High priority first)
        potentialNewBets.sort((a, b) => b.priority - a.priority);

        // Add potential bets to activeBets until we hit maxActiveStreets
        for (let betObj of potentialNewBets) {
            if (activeBets.length < maxActiveStreets) {
                activeBets.push(betObj.start);
                // Mark state as active immediately for next loop logic
                state.trackers[betObj.start].active = true; 
            } else {
                break;
            }
        }
    }

    // --- 5. CONSTRUCT BET OBJECTS ---

    const bets = activeBets.map(startNum => {
        const tracker = state.trackers[startNum];
        
        // Calculate Amount: Level * Base Unit
        let amount = tracker.level * unit;

        // Respect Limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        return {
            type: 'line',
            value: startNum,
            amount: amount
        };
    });

    return bets;
}