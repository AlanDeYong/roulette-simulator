/*
 * Strategy: Dragon Skin (User Modified)
 * Source: Bet With Mo (https://youtu.be/DA0qOZMYLfE?si=U8GqOW3wYQG7oTOx)
 * 
 * The Logic:
 * The strategy targets specific sections of the board using a full pattern of 
 * Straight Up, Split, and Double Street (Line) bets. After reaching a session high, 
 * it resets and alternates to the mirrored opposite side of the table.
 * - Pattern 1 (Left to Right): Base block focuses on middle straights and outer splits 
 *   of the double street (e.g., 1-6 block: Straights 3,4; Splits 1&2, 5&6).
 * - Pattern 2 (Right to Left): Base block focuses on outer straights and inner splits 
 *   of the double street (e.g., 31-36 block: Straights 31,36; Splits 32&33, 34&35).
 * 
 * The Progression:
 * A 7-level negative progression triggered on losses. A new level adds adjacent 
 * zones (full patterns) or increases bets:
 * - Level 1: S/Sp = 1 unit, DS = 2 units (1 Zone Active: 1-6 or 31-36)
 * - Level 2: S/Sp = 1 unit, DS = 2 units (2 Zones Active: adds 7-12 or 25-30)
 * - Level 3: S/Sp = 1 unit, DS = 4 units (3 Zones Active: adds 13-18 or 19-24)
 * - Level 4: S/Sp = 1 unit, DS = 4 units (4 Zones Active: adds 19-24 or 13-18)
 * - Level 5: S/Sp = 2 units, DS = 12 units (4 Zones Active)
 * - Level 6: S/Sp = 3 units, DS = 18 units (4 Zones Active)
 * - Level 7: S/Sp = 6 units, DS = 36 units (4 Zones Active)
 * 
 * The Goal:
 * Achieve a new session high. 
 * - On Win (New High): Reset to Level 1 and swap to the opposite pattern.
 * - On Win (No New High): Rebet at the current level.
 * - On Loss: Move to the next progression level (capped at 7).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.currentPattern = 1;
        state.sessionHigh = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Win / Loss Detection & Level Updates
    if (spinHistory.length > 0) {
        if (bankroll > state.lastBankroll) {
            // It's a win
            if (bankroll > state.sessionHigh) {
                // Session profit reached - reset and swap sides
                state.sessionHigh = bankroll;
                state.level = 1;
                state.currentPattern = state.currentPattern === 1 ? 2 : 1;
            } else {
                // Session profit not reached - stay at current level (rebet)
            }
        } else if (bankroll < state.lastBankroll) {
            // It's a loss - move up progression
            state.level++;
            if (state.level > 7) {
                state.level = 7; // Clamp at max level
            }
        }
    }
    
    // Update tracking bankroll
    state.lastBankroll = bankroll;

    // 3. Define the 7-Level Progression Matrix
    // s: Straight Up units, sp: Split units, ds: Double Street units, numZones: Active Pattern Zones
    const progressionMatrix = {
        1: { s: 1, sp: 1, ds: 2, numZones: 1 },
        2: { s: 1, sp: 1, ds: 2, numZones: 2 },
        3: { s: 1, sp: 1, ds: 4, numZones: 3 },
        4: { s: 1, sp: 1, ds: 4, numZones: 4 },
        5: { s: 2, sp: 2, ds: 12, numZones: 4 },
        6: { s: 3, sp: 3, ds: 18, numZones: 4 },
        7: { s: 6, sp: 6, ds: 36, numZones: 4 }
    };

    const currentProg = progressionMatrix[state.level];
    const baseUnit = config.betLimits.min;

    // Calculate exact amounts and clamp to configured table limits
    const sAmt = Math.min(Math.max(currentProg.s * baseUnit, config.betLimits.min), config.betLimits.max);
    const spAmt = Math.min(Math.max(currentProg.sp * baseUnit, config.betLimits.min), config.betLimits.max);
    const dsAmt = Math.min(Math.max(currentProg.ds * baseUnit, config.betLimits.min), config.betLimits.max);

    // 4. Define the Full Zone Patterns
    // Pattern 1 advances left to right (1-6 -> 7-12 -> 13-18 -> 19-24)
    const pattern1Zones = [
        { straights: [3, 4],   splits: [[1, 2], [5, 6]],     line: 1 },
        { straights: [9, 10],  splits: [[7, 8], [11, 12]],   line: 7 },
        { straights: [15, 16], splits: [[13, 14], [17, 18]], line: 13 },
        { straights: [21, 22], splits: [[19, 20], [23, 24]], line: 19 }
    ];

    // Pattern 2 advances right to left (31-36 -> 25-30 -> 19-24 -> 13-18)
    const pattern2Zones = [
        { straights: [31, 36], splits: [[32, 33], [34, 35]], line: 31 },
        { straights: [25, 30], splits: [[26, 27], [28, 29]], line: 25 },
        { straights: [19, 24], splits: [[20, 21], [22, 23]], line: 19 },
        { straights: [13, 18], splits: [[14, 15], [16, 17]], line: 13 }
    ];

    const activeZones = state.currentPattern === 1 ? pattern1Zones : pattern2Zones;
    const bets = [];

    // 5. Construct Bets based on Active Zones
    for (let i = 0; i < currentProg.numZones; i++) {
        const zone = activeZones[i];
        
        // Add Straight Up Bets
        zone.straights.forEach(num => {
            bets.push({ type: 'number', value: num, amount: sAmt });
        });
        
        // Add Split Bets
        zone.splits.forEach(splitArr => {
            bets.push({ type: 'split', value: splitArr, amount: spAmt });
        });
        
        // Add Double Street (Line) Bet
        bets.push({ type: 'line', value: zone.line, amount: dsAmt });
    }

    return bets;
}