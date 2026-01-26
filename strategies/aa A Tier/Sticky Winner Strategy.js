/**
 * Strategy: Sticky Winner Safety Cap
 *
 * Source: Derived from user analysis and simulation data.
 *
 * The Logic:
 * 1. Sequence: Iterate through Even Money bets in a fixed Left-to-Right (L2R) order:
 * [1-18 (Low), Even, Red, Black, Odd, 19-36 (High)].
 * 2. Sticky Movement:
 * - WIN: STAY on the same spot.
 * - LOSS: MOVE to the next spot in the sequence.
 * 3. Peak Reset (Safety Valve 1):
 * - Track the 'Peak Bankroll' (highest bankroll ever achieved).
 * - If current Bankroll >= Peak Bankroll, reset bet amount to base unit and reset position to start.
 * 4. Pivot (Safety Valve 2):
 * - If 5 consecutive losses occur, reverse the movement direction (L2R becomes R2L).
 * - Keep the bet amount the same (do not reset).
 * 5. Safety Cap (Safety Valve 3 - The "Circuit Breaker"):
 * - If the *next* required bet exceeds $95 (Safety Cap):
 * - STOP real betting immediately.
 * - Enter "Virtual Mode": Simulate wins/losses internally without placing real bets.
 * - Continue in Virtual Mode until the Virtual Bankroll >= Last Peak Bankroll (Recovered).
 * - Once recovered, resume real betting with a fixed $20 recovery bet.
 *
 * The Progression:
 * - Base Unit: $5 (or table minimum).
 * - Step Size: $15 (3 units).
 * - On Win: Decrease bet by $15 (Min $5).
 * - On Loss: Increase bet by $15.
 *
 * The Goal:
 * - Profit preservation by "sticking" to winning streaks.
 * - Survival by capping losses at $95 and waiting for the strategy to recover virtually before risking money again.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION ---
    const BASE_UNIT = config.betLimits.minOutside || 5;
    const STEP_SIZE = BASE_UNIT * 3; // $15 step if unit is $5
    const SAFETY_CAP = 95; // Stop real betting if bet > $95
    const RECOVERY_BET = 20; // Bet size upon resuming from virtual mode
    const PIVOT_TRIGGER = 5; // Reverse direction after 5 losses

    const SEQUENCE = [
        { type: 'low', label: '1-18' },
        { type: 'even', label: 'Even' },
        { type: 'red', label: 'Red' },
        { type: 'black', label: 'Black' },
        { type: 'odd', label: 'Odd' },
        { type: 'high', label: '19-36' }
    ];

    // --- 2. INITIALIZE STATE ---
    if (state.betIndex === undefined) {
        // Core Strategy State
        state.betIndex = 0;          // Current position in SEQUENCE
        state.direction = 1;         // 1 = Forward (L2R), -1 = Backward (R2L)
        state.currentBet = BASE_UNIT;
        state.consecutiveLosses = 0;
        state.peakBankroll = bankroll; // Track ATH (All-Time High)

        // Safety Cap / Virtual Mode State
        state.isVirtual = false;     // Are we in "Sim" mode?
        state.virtualBankroll = 0;   // Tracks hypothetical bankroll during sim
        state.recoveryTarget = 0;    // Target to hit before resuming
        state.lastRealBet = 0;       // For logging/tracking
    }

    // --- 3. PROCESS LAST SPIN (If applicable) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Helper to check win for the specific bet types in our sequence
        const checkWin = (num, type) => {
            if (num === 0 || num === '00') return false; // Zero kills all outside bets
            const RED_NUMS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
            
            switch (type) {
                case 'low': return num <= 18;
                case 'high': return num >= 19;
                case 'even': return num % 2 === 0;
                case 'odd': return num % 2 !== 0;
                case 'red': return RED_NUMS.includes(num);
                case 'black': return !RED_NUMS.includes(num);
                default: return false;
            }
        };

        const lastBetType = SEQUENCE[state.betIndex].type;
        const won = checkWin(lastNum, lastBetType);

        // --- UPDATE VIRTUAL OR REAL STATE ---
        if (state.isVirtual) {
            // Update Virtual Bankroll
            if (won) {
                state.virtualBankroll += state.currentBet;
                state.consecutiveLosses = 0;
            } else {
                state.virtualBankroll -= state.currentBet;
                state.consecutiveLosses++;
            }
        } else {
            // Update Real State logic (Bankroll is updated by the system, we update Peak)
            if (won) {
                state.consecutiveLosses = 0;
            } else {
                state.consecutiveLosses++;
            }
            // Update Peak Bankroll (Real only)
            if (bankroll > state.peakBankroll) {
                state.peakBankroll = bankroll;
            }
        }

        // --- CALCULATE NEXT MOVE (Common Logic) ---
        
        // 1. Check Recovery (Virtual Only)
        // Rule: Resume ONLY if Virtual Bankroll >= Last Peak Bankroll
        let recoveredNow = false;
        if (state.isVirtual && state.virtualBankroll >= state.recoveryTarget) {
            state.isVirtual = false; // RESUME REAL BETTING
            state.currentBet = RECOVERY_BET; // Reset to fixed $20
            recoveredNow = true;
            // Note: We maintain position/direction flow from virtual
        }

        if (!recoveredNow) {
            // 2. Peak Reset (Real Only)
            // If Real Bankroll hits new Peak, reset everything
            if (!state.isVirtual && bankroll >= state.peakBankroll) {
                state.currentBet = BASE_UNIT;
                state.betIndex = 0;
                state.direction = 1;
                state.consecutiveLosses = 0;
            } 
            else {
                // 3. Standard Progression
                if (won) {
                    state.currentBet = Math.max(BASE_UNIT, state.currentBet - STEP_SIZE);
                } else {
                    state.currentBet += STEP_SIZE;
                }

                // 4. Pivot Logic
                if (state.consecutiveLosses >= PIVOT_TRIGGER) {
                    state.direction *= -1; // Reverse
                    state.consecutiveLosses = 0; // Reset counter so we don't flip every spin
                    // Keep bet size same
                }
            }
        }

        // 5. Sticky Movement Logic (Always applies)
        // Win = Stay (Do nothing to index). Loss = Move.
        if (!won) {
            state.betIndex = (state.betIndex + state.direction) % SEQUENCE.length;
            // Handle negative modulo for JS
            if (state.betIndex < 0) state.betIndex += SEQUENCE.length;
        }
    }

    // --- 4. SAFETY CAP CHECK (Pre-Bet) ---
    // If the calculated next bet is unsafe, switch to Virtual
    if (!state.isVirtual && state.currentBet > SAFETY_CAP) {
        state.isVirtual = true;
        state.virtualBankroll = bankroll; // Sync start of sim
        state.recoveryTarget = state.peakBankroll; // Target is LAST PEAK
    }

    // --- 5. PLACE BET (If not Virtual) ---
    if (state.isVirtual) {
        return null; // Do not place real bets in virtual mode
    }

    // Clamp bet to table limits
    let finalAmount = state.currentBet;
    finalAmount = Math.max(finalAmount, config.betLimits.minOutside);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    const target = SEQUENCE[state.betIndex].type;

    return [{ type: target, amount: finalAmount }];
}