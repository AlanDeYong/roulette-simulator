/**
 * Strategy: WillVegas Low Bankroll 5 Double Streets
 * Source: https://youtu.be/5TdKSiL1iUo (Channel: WillVegas)
 * * Logic:
 * - The strategy covers 5 "Double Streets" (Line bets), covering 30 numbers total (approx 80% win rate).
 * - It avoids one Line bet (6 numbers) and the Zero(es).
 * - "Follow the Winner": If a loss occurs because the avoided line hits, the strategy moves the 
 * empty spot to an adjacent line, effectively "moving a chip over" to cover the new winning number.
 * * Bet Progression:
 * - Employs a specific 4-level multiplier tier: 1x, 5x, 10x, 25x.
 * - After a Loss: Move up one level in the progression.
 * - After a Win: 
 * - If at Level 1, stay at Level 1.
 * - If at Level > 1, wait for TWO consecutive wins at the current level before 
 * dropping down one level. This conservative recovery prevents rapid bankroll depletion.
 * * Goal / Stop Loss:
 * - Goal is slow and steady profit (e.g., target +$50 for a session with a $25-$200 bankroll).
 * - Stop loss is implicit based on bankroll limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and valid lines
    const unit = config.betLimits.min; 
    const lines = [1, 7, 13, 19, 25, 31];

    // 2. Initialize State
    if (!state.initialized) {
        state.avoidedLine = 31; // Initially avoid the 31-36 line
        state.multipliers = [1, 5, 10, 25]; // The specific tiers from the video
        state.currentLevel = 0;
        state.winsAtCurrentLevel = 0;
        state.initialized = true;
    }

    // 3. Process History
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        
        let isWin = false;
        let hitLine = null;
        
        if (winNum !== 0 && winNum !== '00') {
            hitLine = Math.floor((winNum - 1) / 6) * 6 + 1;
            if (hitLine !== state.avoidedLine) {
                isWin = true;
            }
        }

        if (isWin) {
            if (state.currentLevel > 0) {
                state.winsAtCurrentLevel++;
                if (state.winsAtCurrentLevel >= 2) {
                    state.currentLevel--;
                    state.winsAtCurrentLevel = 0;
                }
            }
        } else {
            // Loss occurred
            state.currentLevel = Math.min(state.currentLevel + 1, state.multipliers.length - 1);
            state.winsAtCurrentLevel = 0;
            
            // "Follow the Winner" logic: cover the line that just hit by avoiding an adjacent one
            if (hitLine !== null && hitLine === state.avoidedLine) {
                const adjacentAbove = hitLine + 6;
                const adjacentBelow = hitLine - 6;
                
                if (lines.includes(adjacentAbove)) {
                    state.avoidedLine = adjacentAbove;
                } else if (lines.includes(adjacentBelow)) {
                    state.avoidedLine = adjacentBelow;
                }
            }
        }
    }

    // 4. Calculate Bet Amount
    let multiplier = state.multipliers[state.currentLevel];
    let amount = unit * multiplier;

    // 5. CLAMP TO LIMITS (Crucial)
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Construct and Return Bets
    const bets = [];
    for (const line of lines) {
        if (line !== state.avoidedLine) {
            bets.push({ type: 'line', value: line, amount: amount });
        }
    }
    
    return bets;
}