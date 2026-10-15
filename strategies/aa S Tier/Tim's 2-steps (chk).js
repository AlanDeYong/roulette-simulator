/**
 * Tim's TwoStep Strategy
 * 
 * Source: The Roulette Master (https://youtu.be/SVKr0xWkSaQ)
 * 
 * The Full Logic:
 * This is a dozen-betting strategy that transitions through a 3-state progression system to 
 * safely recover losses linearly without aggressive Martingale doubling.
 * 
 * The Full Bet Progression:
 * - State 1 (Single Initial): Bet 1 base unit on the Dozen that has slept the longest.
 *   - Win: Sequence resolves. Reset.
 *   - Loss: Move to State 2.
 * - State 2 (Two Dozens): Bet on the TWO Dozens that did NOT just hit. 
 *   - Initial bet is 2 units on each of the two dozens.
 *   - Loss: Stay in State 2. Keep the same targets (the non-hitting dozens). Increase the bet on EACH by 1 unit.
 *   - Win: 
 *     - If this was the first step (2 units), sequence resolves, reset.
 *     - If this was escalated (> 2 units), move to State 3.
 * - State 3 (Single Recovery): Bet on the ONE Dozen from State 2 that did NOT just win.
 *   - Bet amount is the previous State 2 bet + 1 unit.
 *   - Win: Sequence resolves. Reset.
 *   - Loss: Move back to State 2, targeting the two non-hitting dozens. Add 1 unit to the bet.
 * 
 * The Goal:
 * Safely generate steady profit. If a sequence resolves but the session profit was largely wiped out
 * by a deep recovery hole (e.g., total bankroll is barely above the start), the strategy doubles the base unit 
 * for the next sequence to build profit back up faster.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Helper: Determine dozen from a number (1-36, 0 returns null)
    const getDozen = (num) => {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null;
    };

    // 2. Helper: Find the sleeping dozens (sorted from longest asleep to most recent)
    const getSleepingDozens = () => {
        let lastSeen = { 1: -1, 2: -1, 3: -1 };
        for (let i = 0; i < spinHistory.length; i++) {
            let num = spinHistory[i].winningNumber;
            let d = getDozen(num);
            if (d !== null) {
                lastSeen[d] = i;
            }
        }
        return [1, 2, 3].sort((a, b) => lastSeen[a] - lastSeen[b]);
    };

    // 3. Initialize state
    if (!state.initialized) {
        state.initialized = true;
        state.mode = 'SINGLE_INITIAL';
        state.baseUnit = config.betLimits.minOutside;
        state.targets = [getSleepingDozens()[0]];
        state.currentBet = state.baseUnit;
        state.placedBets = false;
    }

    // 4. State Transitions (process previous spin if we placed bets)
    if (spinHistory.length > 0 && state.placedBets) {
        let lastSpin = spinHistory[spinHistory.length - 1];
        let lastDozen = getDozen(lastSpin.winningNumber);
        
        let won = false;
        let winningTarget = null;
        
        if (lastDozen !== null && state.targets.includes(lastDozen)) {
            won = true;
            winningTarget = lastDozen;
        }

        const resetSequence = () => {
            // Check if profit is low after a long sequence (bankroll is less than 2 units above start)
            if (bankroll <= config.startingBankroll + (2 * config.betLimits.minOutside)) {
                state.baseUnit = Math.min(state.baseUnit * 2, config.betLimits.max / 10);
            } else {
                state.baseUnit = config.betLimits.minOutside;
            }
            state.mode = 'SINGLE_INITIAL';
            state.targets = [getSleepingDozens()[0]];
            state.currentBet = state.baseUnit;
        };

        if (state.mode === 'SINGLE_INITIAL') {
            if (won) {
                resetSequence();
            } else {
                state.mode = 'TWO_DOZENS';
                // Target the two dozens that didn't just hit
                if (lastDozen !== null) {
                    state.targets = [1, 2, 3].filter(d => d !== lastDozen);
                } else {
                    let sleepers = getSleepingDozens();
                    state.targets = sleepers.filter(d => d !== state.targets[0]).slice(0, 2);
                }
                state.currentBet = 2 * state.baseUnit;
            }
        } else if (state.mode === 'TWO_DOZENS') {
            if (won) {
                if (state.currentBet === 2 * state.baseUnit) {
                    // Won on the first step of Two Dozens, Sequence Resolves
                    resetSequence();
                } else {
                    // Won after escalating, transition to Single Recovery
                    state.mode = 'SINGLE_RECOVERY';
                    // Target the one we bet on that didn't win
                    state.targets = state.targets.filter(d => d !== winningTarget);
                    state.currentBet = state.currentBet + state.baseUnit;
                }
            } else {
                // Lost. Stay in TWO_DOZENS, targets stay the same, increase bet linearly
                state.currentBet = state.currentBet + state.baseUnit;
            }
        } else if (state.mode === 'SINGLE_RECOVERY') {
            if (won) {
                resetSequence();
            } else {
                state.mode = 'TWO_DOZENS';
                // Transition back to Two Dozens: target the two that didn't hit
                if (lastDozen !== null) {
                    state.targets = [1, 2, 3].filter(d => d !== lastDozen);
                } else {
                    let sleepers = getSleepingDozens();
                    let otherTarget = sleepers.find(d => d !== state.targets[0]);
                    state.targets = [state.targets[0], otherTarget];
                }
                state.currentBet = state.currentBet + state.baseUnit;
            }
        }
    }

    // 5. Build and Clamp Bets
    let bets = [];
    for (let target of state.targets) {
        let clampedAmount = Math.max(state.currentBet, config.betLimits.minOutside);
        clampedAmount = Math.min(clampedAmount, config.betLimits.max);
        
        bets.push({
            type: 'dozen',
            value: target,
            amount: clampedAmount
        });
    }

    state.placedBets = true;
    return bets;
}