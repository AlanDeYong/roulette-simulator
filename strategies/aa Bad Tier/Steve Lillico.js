<<<<<<< HEAD
/**
 * Strategy: Steve Lillico's "Zero Loss" System
 * Source: The Roulette Master TV (https://www.youtube.com/watch?v=L0eJTiwcWOw)
 * * THE LOGIC:
 * This system places 4 simultaneous bets to cover a large portion of the table:
 * 1. First Dozen (1-12)
 * 2. Third Dozen (25-36)
 * 3. A "Linked" Column and Color Pair. 
 * - Pair A: Red + 3rd Column
 * - Pair B: Black + 2nd Column
 * * SWITCHING TRIGGER ("The Jackpot"):
 * - If you hit a "Jackpot" (Winning the Dozen + Column + Color simultaneously), 
 * you switch the Color/Column pair for the next spin.
 * - Otherwise, stay on the current pair.
 * * THE PROGRESSION (Defensive):
 * - Base unit: 1 unit on each of the 4 bets.
 * - Partial Win/Loss: Do NOT change the bet size. 
 * - Total Loss (Zero or missing all bets): Increase bet size by +1 unit.
 * - Reset: If the current bankroll exceeds the session starting bankroll (profit target reached), reset to base unit.
 * * THE GOAL:
 * - Generate steady small wins while surviving streaks via the "Total Loss Only" progression.
 * - Reset to minimum bets immediately upon recovering to a session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const BASE_CHIP = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;

    // 2. Initialize State
    if (state.unitSize === undefined) state.unitSize = 1;
    if (state.currentSet === undefined) state.currentSet = 'RED_SET'; // Starts with Red + Col 3
    if (state.startBankroll === undefined) state.startBankroll = bankroll;

    // 3. Process Last Spin (if it exists) to Determine Strategy Updates
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const color = lastSpin.winningColor;

        // -- Analyze coverage based on what we bet last time --
        
        // Did we hit the Dozens? (We always bet 1st and 3rd)
        const hitDozen = (num >= 1 && num <= 12) || (num >= 25 && num <= 36);

        // Did we hit the specific Color/Column pair we were betting?
        let hitColor = false;
        let hitColumn = false;

        if (state.currentSet === 'RED_SET') {
            hitColor = (color === 'red');
            hitColumn = (num % 3 === 0 && num !== 0); // 3rd Column (3, 6, 9...)
        } else { // BLACK_SET
            hitColor = (color === 'black');
            hitColumn = (num % 3 === 2); // 2nd Column (2, 5, 8...)
        }

        const isJackpot = hitDozen && hitColor && hitColumn;
        const isTotalLoss = !hitDozen && !hitColor && !hitColumn; // Hit nothing (e.g., 0, or the uncovered gap)

        // -- Logic 1: The Switch (Jackpot Trigger) --
        if (isJackpot) {
            // Toggle the set
            state.currentSet = (state.currentSet === 'RED_SET') ? 'BLACK_SET' : 'RED_SET';
        }

        // -- Logic 2: The Progression (Money Management) --
        
        // Check for profit reset first
        if (bankroll >= state.startBankroll) {
            state.unitSize = 1;
        } 
        // If no reset, handle progression logic
        else if (isTotalLoss) {
            state.unitSize += 1; // Increase units on total wipeout
        }
        // Note: On partial wins/losses, state.unitSize remains unchanged.
    }

    // 4. Calculate Bet Amounts
    // Ensure we respect table limits
    let chipAmount = state.unitSize * BASE_CHIP;
    
    // Clamp between minOutside and max
    chipAmount = Math.max(chipAmount, config.betLimits.minOutside);
    chipAmount = Math.min(chipAmount, config.betLimits.max);

    // 5. Construct Bets
    const bets = [];

    // Always bet First and Third Dozen
    bets.push({ type: 'dozen', value: 1, amount: chipAmount });
    bets.push({ type: 'dozen', value: 3, amount: chipAmount });

    // Conditional Bets based on Current Set
    if (state.currentSet === 'RED_SET') {
        // Red + 3rd Column
        bets.push({ type: 'red', amount: chipAmount });
        bets.push({ type: 'column', value: 3, amount: chipAmount });
    } else {
        // Black + 2nd Column
        bets.push({ type: 'black', amount: chipAmount });
        bets.push({ type: 'column', value: 2, amount: chipAmount });
    }

    return bets;
=======
/**
 * Strategy: Steve Lillico's "Zero Loss" System
 * Source: The Roulette Master TV (https://www.youtube.com/watch?v=L0eJTiwcWOw)
 * * THE LOGIC:
 * This system places 4 simultaneous bets to cover a large portion of the table:
 * 1. First Dozen (1-12)
 * 2. Third Dozen (25-36)
 * 3. A "Linked" Column and Color Pair. 
 * - Pair A: Red + 3rd Column
 * - Pair B: Black + 2nd Column
 * * SWITCHING TRIGGER ("The Jackpot"):
 * - If you hit a "Jackpot" (Winning the Dozen + Column + Color simultaneously), 
 * you switch the Color/Column pair for the next spin.
 * - Otherwise, stay on the current pair.
 * * THE PROGRESSION (Defensive):
 * - Base unit: 1 unit on each of the 4 bets.
 * - Partial Win/Loss: Do NOT change the bet size. 
 * - Total Loss (Zero or missing all bets): Increase bet size by +1 unit.
 * - Reset: If the current bankroll exceeds the session starting bankroll (profit target reached), reset to base unit.
 * * THE GOAL:
 * - Generate steady small wins while surviving streaks via the "Total Loss Only" progression.
 * - Reset to minimum bets immediately upon recovering to a session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const BASE_CHIP = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;

    // 2. Initialize State
    if (state.unitSize === undefined) state.unitSize = 1;
    if (state.currentSet === undefined) state.currentSet = 'RED_SET'; // Starts with Red + Col 3
    if (state.startBankroll === undefined) state.startBankroll = bankroll;

    // 3. Process Last Spin (if it exists) to Determine Strategy Updates
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const color = lastSpin.winningColor;

        // -- Analyze coverage based on what we bet last time --
        
        // Did we hit the Dozens? (We always bet 1st and 3rd)
        const hitDozen = (num >= 1 && num <= 12) || (num >= 25 && num <= 36);

        // Did we hit the specific Color/Column pair we were betting?
        let hitColor = false;
        let hitColumn = false;

        if (state.currentSet === 'RED_SET') {
            hitColor = (color === 'red');
            hitColumn = (num % 3 === 0 && num !== 0); // 3rd Column (3, 6, 9...)
        } else { // BLACK_SET
            hitColor = (color === 'black');
            hitColumn = (num % 3 === 2); // 2nd Column (2, 5, 8...)
        }

        const isJackpot = hitDozen && hitColor && hitColumn;
        const isTotalLoss = !hitDozen && !hitColor && !hitColumn; // Hit nothing (e.g., 0, or the uncovered gap)

        // -- Logic 1: The Switch (Jackpot Trigger) --
        if (isJackpot) {
            // Toggle the set
            state.currentSet = (state.currentSet === 'RED_SET') ? 'BLACK_SET' : 'RED_SET';
        }

        // -- Logic 2: The Progression (Money Management) --
        
        // Check for profit reset first
        if (bankroll >= state.startBankroll) {
            state.unitSize = 1;
        } 
        // If no reset, handle progression logic
        else if (isTotalLoss) {
            state.unitSize += 1; // Increase units on total wipeout
        }
        // Note: On partial wins/losses, state.unitSize remains unchanged.
    }

    // 4. Calculate Bet Amounts
    // Ensure we respect table limits
    let chipAmount = state.unitSize * BASE_CHIP;
    
    // Clamp between minOutside and max
    chipAmount = Math.max(chipAmount, config.betLimits.minOutside);
    chipAmount = Math.min(chipAmount, config.betLimits.max);

    // 5. Construct Bets
    const bets = [];

    // Always bet First and Third Dozen
    bets.push({ type: 'dozen', value: 1, amount: chipAmount });
    bets.push({ type: 'dozen', value: 3, amount: chipAmount });

    // Conditional Bets based on Current Set
    if (state.currentSet === 'RED_SET') {
        // Red + 3rd Column
        bets.push({ type: 'red', amount: chipAmount });
        bets.push({ type: 'column', value: 3, amount: chipAmount });
    } else {
        // Black + 2nd Column
        bets.push({ type: 'black', amount: chipAmount });
        bets.push({ type: 'column', value: 2, amount: chipAmount });
    }

    return bets;
>>>>>>> origin/main
}