/**
 * Indestructible Dozens & Columns Strategy
 * * Source: https://youtu.be/Pu_dZSBSdBo (The Roulette Master, originally by Trenton)
 * * Logic:
 * This strategy looks at the previous spins to identify either a dozen OR a column 
 * that has not hit for the absolute longest amount of time (the "longest sleeping" among all 6 options).
 * - We wait (spin without betting) until a single, unique longest-sleeper emerges. 
 * - If there's a tie for the longest sleeper, we continue to spin without betting until the tie is broken.
 * - Once identified, we LOCK IN that specific dozen or column as our target. We do NOT change targets 
 *   during a losing streak.
 * - AFTER A RESET (either a full profit reset or a partial recovery reset), we clear the target and 
 *   look at the past spins again to identify the new longest sleeping dozen or column, spinning without 
 *   betting if necessary until a clear sleeper is found.
 * * Bet Progression:
 * 1. Start with a base unit (table minimum for outside bets).
 * 2. After every loss, increase the next bet on the locked target by 1 current unit (e.g., 5, 10, 15...).
 * 3. After a win, calculate the overall net profit for the current session:
 *    - If session profit >= 0: Full reset. Reset to base unit, clear target, and find the new longest sleeper.
 *    - If session profit < 0: Partial reset. Double the base unit, clear target, and find the new longest sleeper.
 * * Goal:
 * Safely grind out profits by waiting for deep sleepers and avoiding geometric multipliers, preserving 
 * the bankroll for a longer, safer grind.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.sessionProfit === undefined) {
        state.sessionProfit = 0;
        state.baseUnit = config.betLimits.minOutside || 5;
        state.currentUnit = state.baseUnit;
        state.betAmount = state.currentUnit;
        state.lastBet = null;
        state.target = null; // Holds our locked-in dozen or column
    }

    // 2. Process the previous spin if we had an active bet
    if (spinHistory.length > 0 && state.lastBet) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        
        // Check if our bet won
        let isWin = false;
        let bType = state.lastBet.type;
        let bVal = state.lastBet.value;

        if (winNum !== 0 && winNum !== '00' && winNum !== '0') {
            let num = parseInt(winNum, 10);
            if (bType === 'dozen') {
                if (bVal === 1 && num >= 1 && num <= 12) isWin = true;
                if (bVal === 2 && num >= 13 && num <= 24) isWin = true;
                if (bVal === 3 && num >= 25 && num <= 36) isWin = true;
            } else if (bType === 'column') {
                if (bVal === 1 && num % 3 === 1) isWin = true;
                if (bVal === 2 && num % 3 === 2) isWin = true;
                if (bVal === 3 && num % 3 === 0) isWin = true;
            }
        }

        if (isWin) {
            // Dozens and Columns both pay 2:1
            state.sessionProfit += (state.lastBet.amount * 2);
            
            if (state.sessionProfit >= 0) {
                // Full Reset: Back in profit. Reset unit and clear target to re-evaluate history.
                state.sessionProfit = 0;
                state.currentUnit = state.baseUnit;
                state.betAmount = state.currentUnit;
                state.target = null; 
            } else {
                // Partial Reset: Won, but still negative. Double unit and clear target to re-evaluate history.
                state.currentUnit *= 2;
                state.betAmount = state.currentUnit;
                state.target = null; 
            }
        } else {
            // Lost: Keep the target locked in, increase bet amount by 1 unit
            state.sessionProfit -= state.lastBet.amount;
            state.betAmount += state.currentUnit;
            // state.target remains the same (locked in during the loss streak)
        }
    }

    // 3. Identification Phase: Look at past spins to find the longest sleeper
    // This only runs initially or AFTER A RESET when state.target has been cleared.
    if (!state.target) {
        let lastSeen = {
            'dozen-1': -1, 'dozen-2': -1, 'dozen-3': -1,
            'column-1': -1, 'column-2': -1, 'column-3': -1
        };

        // Scan entire history to find the absolute oldest hit for each
        for (let i = 0; i < spinHistory.length; i++) {
            let numStr = spinHistory[i].winningNumber;
            if (numStr === 0 || numStr === '00' || numStr === '0') continue;
            
            let num = parseInt(numStr, 10);
            
            // Track Dozens
            if (num >= 1 && num <= 12) lastSeen['dozen-1'] = i;
            else if (num >= 13 && num <= 24) lastSeen['dozen-2'] = i;
            else if (num >= 25 && num <= 36) lastSeen['dozen-3'] = i;
            
            // Track Columns
            if (num % 3 === 1) lastSeen['column-1'] = i;
            else if (num % 3 === 2) lastSeen['column-2'] = i;
            else if (num % 3 === 0) lastSeen['column-3'] = i;
        }

        // Find the absolute minimum last seen index (the longest sleeper)
        let minSeen = Infinity;
        let candidates = [];
        
        for (let key in lastSeen) {
            if (lastSeen[key] < minSeen) {
                minSeen = lastSeen[key];
                candidates = [key];
            } else if (lastSeen[key] === minSeen) {
                candidates.push(key); // Keep track if there are ties
            }
        }

        // If we have exactly one clear longest sleeper, lock it in.
        if (candidates.length === 1) {
            let parts = candidates[0].split('-');
            state.target = { type: parts[0], value: parseInt(parts[1], 10) };
        } else {
            // Tie exists (or no history yet). Spin without betting until tie breaks.
            state.lastBet = null;
            return [];
        }
    }

    // 4. Place Bet on Locked Target
    let amount = state.betAmount;
    
    // Clamp to table limits and bankroll
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);
    amount = Math.min(amount, bankroll);

    // Stop betting if bankroll cannot cover the minimum
    if (amount < config.betLimits.minOutside) {
        state.lastBet = null;
        return [];
    }

    // Save for next spin processing
    state.lastBet = { 
        type: state.target.type, 
        value: state.target.value, 
        amount: amount 
    };

    return [state.lastBet];
}