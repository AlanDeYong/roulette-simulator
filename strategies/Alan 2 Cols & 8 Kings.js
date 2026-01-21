/**
 * STRATEGY: Alan's 2 Col & 8 Kings
 * * SOURCE: 
 * - Concept based on "Alan's 2 Col & 8 Kings" Roulette Strategy.
 * - Logic derived from common cover-the-table strategies aimed at high win rates.
 * * THE LOGIC:
 * 1. Normal Play (Active Mode):
 * - Analyze the Result of the previous spin.
 * - COLUMNS: Place bets on the 2 columns that did NOT win.
 * - KINGS (Straight Up): In the column that DID win, bet on specific numbers.
 * Selection: Pick numbers that are NOT in the Dozen that just won.
 * (e.g., If 14 wins [Col 2, Doz 2], bet Col 1 & 3. In Col 2, bet numbers from Doz 1 & 3).
 * - This covers a massive portion of the table.
 * * 2. Loss Recovery (Waiting Mode):
 * - Trigger: Any spin that results in a net loss.
 * - Action: Stop betting immediately (Wait).
 * - Exit Condition: Observe the wheel. Resume betting only after numbers appear in the 
 * SAME DOZEN for 2 consecutive spins.
 * * THE PROGRESSION:
 * - Flat betting structure is used by default.
 * - Column Bets: $12 base (or minOutside limit).
 * - Straight Up Bets: $1 base (or min limit).
 * - On Loss: Enter "Waiting" state. No martingale multiplier is applied, just a pause to avoid streaks.
 * * THE GOAL:
 * - Grind small, consistent profits ($4 to $12 per win) while avoiding long losing streaks via the "Wait" mechanic.
 * - Stop Loss: Implied by bankroll limits (or manual intervention).
 */

function bet(spinHistory, bankroll, config, state) {
    // --- 1. Helper Functions ---
    
    // Get Column (1, 2, 3) and Dozen (1, 2, 3) for a number
    const getNumProps = (n) => {
        n = parseInt(n, 10);
        if (isNaN(n) || n === 0 || n === 37) return { column: 0, dozen: 0 }; // 0/00 handling
        
        // Col: 1,4,7..=1 | 2,5,8..=2 | 3,6,9..=3
        const col = (n % 3 === 0) ? 3 : (n % 3);
        
        // Dozen: 1-12=1 | 13-24=2 | 25-36=3
        const doz = Math.ceil(n / 12);
        
        return { column: col, dozen: doz };
    };

    // Calculate winnings from previous bets to determine Win/Loss
    const didWinLastSpin = (winningNum, previousBets) => {
        if (!previousBets || previousBets.length === 0) return true; // No bets = no loss
        
        let totalBet = 0;
        let totalWin = 0;
        const props = getNumProps(winningNum);

        previousBets.forEach(b => {
            totalBet += b.amount;
            // Check Column Win (Pays 2:1)
            if (b.type === 'column' && b.value === props.column) {
                totalWin += b.amount * 3; // Return = stake + 2*stake
            }
            // Check Number Win (Pays 35:1)
            if (b.type === 'number' && b.value === winningNum) {
                totalWin += b.amount * 36; // Return = stake + 35*stake
            }
        });

        return totalWin > totalBet;
    };

    // --- 2. Initialize State ---
    
    // Defaults
    state.recoveryMode = state.recoveryMode || false;
    state.lastDozen = state.lastDozen !== undefined ? state.lastDozen : null;
    state.dozenStreak = state.dozenStreak || 0;
    state.previousBets = state.previousBets || [];

    // --- 3. Process History (Update State) ---

    const lastSpin = spinHistory[spinHistory.length - 1];

    // If no history, we can't play this strategy yet (needs prev result)
    if (!lastSpin) return [];

    const winningNumber = lastSpin.winningNumber;
    const { column: lastCol, dozen: lastDoz } = getNumProps(winningNumber);

    // A. Update Dozen Streak Logic (Crucial for Recovery Exit)
    if (lastDoz !== 0) {
        if (lastDoz === state.lastDozen) {
            state.dozenStreak++;
        } else {
            state.dozenStreak = 1;
            state.lastDozen = lastDoz;
        }
    } else {
        // Zero resets the streak usually
        state.dozenStreak = 0;
        state.lastDozen = null;
    }

    // B. Check for Loss Trigger (Did we lose our money last spin?)
    if (state.previousBets.length > 0) {
        const won = didWinLastSpin(winningNumber, state.previousBets);
        if (!won) {
            state.recoveryMode = true; // Enter Waiting Mode
            // Reset streak count so we force a fresh "2 in a row" observation
            // (Optional interpretation: strictly wait for 2 NEW same dozens)
             state.dozenStreak = Math.min(state.dozenStreak, 1); 
        }
    }

    // C. Check Recovery Exit Condition
    if (state.recoveryMode) {
        if (state.dozenStreak >= 2) {
            state.recoveryMode = false; // Resume Betting
        } else {
            // Still recovering/waiting
            state.previousBets = []; // Record that we made no bets
            return [];
        }
    }

    // D. Edge Case: Previous was Zero
    // If 0 hit, we don't have a "Last Column" to base our anti-betting on. Wait.
    if (lastCol === 0) {
        state.previousBets = [];
        return [];
    }

    // --- 4. Calculate Bets (Active Mode) ---

    const bets = [];

    // Define Base Amounts based on Limits
    // The strategy traditionally uses a 12:1 ratio (12 units on Columns vs 1 unit on Numbers).
    // We try to respect the user's config "Min Inside" as the base unit for numbers,
    // and scale the column bet accordingly to maintain the ratio.
    
    // Base unit = Min Inside (e.g., $1)
    const baseUnit = Math.max(1, config.betLimits.min);
    
    // Calculate Column Bet (12 * Base Unit)
    // However, we also must respect "Min Outside".
    // So we take the higher of (12 * Base) OR (Min Outside).
    const colBetAmount = Math.max(12 * baseUnit, config.betLimits.minOutside);
    const numBetAmount = baseUnit;
    
    // Cap at max limit
    const finalColBet = Math.min(colBetAmount, config.betLimits.max);
    const finalNumBet = Math.min(numBetAmount, config.betLimits.max);

    // LOGIC STEP 1: Bet on the 2 Columns that did NOT win
    [1, 2, 3].forEach(col => {
        if (col !== lastCol) {
            bets.push({
                type: 'column',
                value: col,
                amount: finalColBet
            });
        }
    });

    // LOGIC STEP 2: Bet on Numbers in the winning column, EXCEPT those in the winning Dozen
    // We iterate numbers 1-36
    for (let n = 1; n <= 36; n++) {
        const p = getNumProps(n);
        
        // Must be in the Last Column
        if (p.column === lastCol) {
            // Must NOT be in the Last Dozen
            if (p.dozen !== lastDoz) {
                bets.push({
                    type: 'number',
                    value: n,
                    amount: finalNumBet
                });
            }
        }
    }

    // --- 5. Persist & Return ---
    
    state.previousBets = bets;
    return bets;
}
