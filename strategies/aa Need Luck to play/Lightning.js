/**
 * STRATEGY: Lightning / 7-Level System
 * * SOURCE:
 * Channel: Bet With Mo
 * Video: https://www.youtube.com/watch?v=AtMg_EUjBmc
 * * LOGIC:
 * This strategy uses a specific coverage pattern involving 4 Straight Up bets and 
 * 1 Double Street (Line) bet. The idea is to cover a cluster of numbers and a 
 * surrounding block to maximize coverage while maintaining high payout potential 
 * on the specific straight-up numbers.
 * * PATTERNS:
 * - Pattern A (Low): Straight Ups on [8, 9, 11, 12] + Double Street on [13-18]
 * - Pattern B (High): Straight Ups on [26, 27, 29, 30] + Double Street on [31-36]
 * * PROGRESSION (7 Levels):
 * The strategy alternates between Pattern A and Pattern B while increasing stakes 
 * to recover losses (Negative Progression).
 * * Level 1: Pattern A | Multiplier x1
 * Level 2: Pattern B | Multiplier x1
 * Level 3: Pattern A | Multiplier x2
 * Level 4: Pattern B | Multiplier x2
 * Level 5: Pattern A | Multiplier x4
 * Level 6: Pattern B | Multiplier x10 (Aggressive jump)
 * Level 7: Pattern A | Multiplier x20
 * * TRIGGERS:
 * - Win: Reset to Level 1.
 * - Loss: Move to the next Level. 
 * - End of Progression: If Level 7 is lost, reset to Level 1 (Stop Loss).
 * * NOTE ON BET LIMITS:
 * The function automatically scales the "Video Unit" ($1) to the `config.betLimits.min`.
 * If min bet is $2, the base Straight Up is $2 and the Line is $8.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MAX_LEVEL = 7;
    
    // Define the bet ratio: 1 unit on Straights, 4 units on Line
    const RATIO_STRAIGHT = 1;
    const RATIO_LINE = 4;

    // Progression Multipliers based on the video analysis
    const LEVEL_MULTIPLIERS = [1, 1, 2, 2, 4, 10, 20];

    // Define the two patterns
    // Pattern A: Lower board coverage
    const PATTERN_A = {
        straights: [8, 9, 11, 12],
        lineStart: 13 // Covers 13, 14, 15, 16, 17, 18
    };

    // Pattern B: Upper board coverage
    const PATTERN_B = {
        straights: [26, 27, 29, 30],
        lineStart: 31 // Covers 31, 32, 33, 34, 35, 36
    };

    // Map levels to patterns (Alternating A/B)
    // Levels 1, 3, 5, 7 use Pattern A
    // Levels 2, 4, 6 use Pattern B
    const LEVEL_PATTERNS = [
        PATTERN_A, // Level 1 (Index 0)
        PATTERN_B, // Level 2 (Index 1)
        PATTERN_A, // Level 3
        PATTERN_B, // Level 4
        PATTERN_A, // Level 5
        PATTERN_B, // Level 6
        PATTERN_A  // Level 7
    ];

    // --- 2. STATE INITIALIZATION ---
    if (!state.level) state.level = 1;

    // --- 3. PROCESS LAST SPIN (WIN/LOSS LOGIC) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        // We need to calculate if the *previous* bet won. 
        // Since we don't have the explicit 'lastBet' object passed in standard args,
        // we assume standard progression logic:
        // If bankroll increased compared to previous state -> Win. 
        // Otherwise -> Loss.
        
        // However, a robust way in this simulator context without external tracking
        // is to check if the winning number was covered by the previous pattern.
        // We look at state.level from the *previous* turn (which is current state.level)
        
        // BUT: Standard simulation flow updates state *after* this function runs usually.
        // We need to determine if we should advance or reset based on the *result* of the bet 
        // we placed *last time*.
        
        // Let's rely on a helper check using the previous pattern index.
        // Note: The level stored in state is the one we *just played*.
        const prevLevelIndex = state.level - 1;
        const prevPattern = LEVEL_PATTERNS[prevLevelIndex];
        
        const num = lastSpin.winningNumber;
        let isWin = false;

        // Check Straight Ups
        if (prevPattern.straights.includes(num)) isWin = true;

        // Check Line (Line covers start -> start + 5)
        if (num >= prevPattern.lineStart && num <= prevPattern.lineStart + 5) isWin = true;

        if (isWin) {
            // Reset on Win
            state.level = 1;
        } else {
            // Progress on Loss
            if (state.level < MAX_LEVEL) {
                state.level++;
            } else {
                // Hard reset if we bust the progression (Level 7 lost)
                state.level = 1;
            }
        }
    }

    // --- 4. CALCULATE BET AMOUNTS ---
    // Use min limit as the base unit ($1 in video becomes config.min)
    const baseUnit = config.betLimits.min; 
    
    // Get current multiplier
    const currentMult = LEVEL_MULTIPLIERS[state.level - 1];
    
    // Calculate raw amounts
    let straightAmount = baseUnit * RATIO_STRAIGHT * currentMult;
    let lineAmount = baseUnit * RATIO_LINE * currentMult;

    // --- 5. CLAMP TO TABLE LIMITS ---
    // Ensure we don't exceed max limits
    straightAmount = Math.min(straightAmount, config.betLimits.max);
    lineAmount = Math.min(lineAmount, config.betLimits.max);

    // Ensure we meet minimums (already covered by baseUnit, but safe to check)
    straightAmount = Math.max(straightAmount, config.betLimits.min);
    lineAmount = Math.max(lineAmount, config.betLimits.min); // Lines are Inside bets too

    // --- 6. CONSTRUCT BETS ---
    const currentPattern = LEVEL_PATTERNS[state.level - 1];
    const bets = [];

    // Add Straight Up Bets
    currentPattern.straights.forEach(num => {
        bets.push({
            type: 'number',
            value: num,
            amount: straightAmount
        });
    });

    // Add Double Street (Line) Bet
    bets.push({
        type: 'line',
        value: currentPattern.lineStart,
        amount: lineAmount
    });

    return bets;
}