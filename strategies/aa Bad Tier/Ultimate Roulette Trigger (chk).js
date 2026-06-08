/**
 * Source: https://youtu.be/WDq9L8YyStw?si=z7J-yLmaMxeOyDKV (The Roulette Master)
 * Strategy: The Ultimate Roulette Trigger! (MGM Joe's Strategy)
 *
 * The Full Logic in details:
 * - The system waits for a "trigger" before making large bets.
 * - Flat Betting: While waiting for the trigger, the strategy places a minimum 
 * flat bet on an Outside color (Red/Black) just to keep playing. It uses a 
 * "follow the winner" approach (betting the last hit color, defaults to Red).
 * - The Trigger: The trigger is activated when 3 consecutive spins fall into the 
 * SAME "Double Street" (a contiguous block of 6 numbers, e.g., 4-9 or 13-18).
 * - Trigger Bet: Once triggered, the strategy bets heavily against that double 
 * street by placing bets on all other numbers. To cleanly mimic this coverage 
 * using exact simulator bet types, we place Street bets on the 10 streets 
 * that are NOT part of the triggered double street.
 *
 * The Full Bet Progression in details:
 * - Flat Bet: 1 unit on Red or Black (using config.betLimits.minOutside).
 * - Level 1 Trigger: 5 units per street on the 10 non-trigger streets.
 * (At $10 base, this is $50 per street = $500 total risk, aiming for $100 profit).
 * - Level 2 Trigger (Martingale step): If Level 1 loses (meaning the same double 
 * street hit a 4th time), the bet is tripled to 15 units per street.
 * (At $10 base, this is $150 per street = $1500 total risk).
 * - If Level 2 loses, the progression resets. If any trigger level wins, it resets.
 *
 * The Goal:
 * - The creator stops after securing 2 trigger wins per session.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.hasOwnProperty('triggerActive')) {
        state.triggerActive = false;
        state.triggerWins = 0;
        state.lastTriggerSpin = 0;
        state.lastColor = 'red';
        state.progressionIndex = 0;
    }

    // 2. Check Goal Condition
    if (state.triggerWins >= 2) {
        return []; // Target reached, stop betting
    }

    const lastResult = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

    // 3. Update flat betting color (Follow the winner)
    if (lastResult) {
        if (lastResult.winningColor === 'red') state.lastColor = 'red';
        if (lastResult.winningColor === 'black') state.lastColor = 'black';
    }

    // 4. Resolve previous trigger bet if active
    if (state.triggerActive && lastResult) {
        const num = lastResult.winningNumber;
        const s = state.activeTriggerBlock;
        
        // Win condition: number is not 0/00 AND falls outside the triggered double street block [s, s+5]
        const won = num > 0 && num <= 36 && (num < s || num > s + 5);

        if (won) {
            state.triggerWins++;
            state.triggerActive = false;
            state.progressionIndex = 0;
            state.lastTriggerSpin = spinHistory.length; // Mark spin to prevent immediate re-trigger on old data
        } else {
            state.progressionIndex++;
            if (state.progressionIndex > 1) {
                // Lost both Level 1 and Level 2, reset progression
                state.triggerActive = false;
                state.progressionIndex = 0;
                state.lastTriggerSpin = spinHistory.length;
            }
        }
    }

    // Helper to identify if 3 numbers belong to the same Double Street (block of 6 numbers)
    function getCommonDoubleStreet(nums) {
        const validStarts = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31];
        for (let i = 0; i < validStarts.length; i++) {
            const s = validStarts[i];
            let allIn = true;
            for (let j = 0; j < nums.length; j++) {
                const num = nums[j];
                if (num === 0 || num > 36 || num < s || num > s + 5) {
                    allIn = false;
                    break;
                }
            }
            if (allIn) return s;
        }
        return null;
    }

    // 5. Check for new trigger if not active (Require at least 3 completely new spins since last trigger sequence)
    if (!state.triggerActive && spinHistory.length >= Math.max(3, state.lastTriggerSpin + 3)) {
        const last3 = [
            spinHistory[spinHistory.length - 1].winningNumber,
            spinHistory[spinHistory.length - 2].winningNumber,
            spinHistory[spinHistory.length - 3].winningNumber
        ];
        
        const block = getCommonDoubleStreet(last3);
        if (block !== null) {
            state.triggerActive = true;
            state.activeTriggerBlock = block;
            state.progressionIndex = 0;
        }
    }

    const bets = [];
    const baseUnit = config.betLimits.minOutside;

    // 6. Place Bets
    if (state.triggerActive) {
        // Trigger Bet (Level 1 or Level 2)
        const multiplier = state.progressionIndex === 0 ? 5 : 15;
        let streetBetAmount = baseUnit * multiplier;
        
        // Clamp inside bet to limits
        streetBetAmount = Math.max(streetBetAmount, config.betLimits.min);
        streetBetAmount = Math.min(streetBetAmount, config.betLimits.max);

        const triggerS = state.activeTriggerBlock;
        const allStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
        
        // Bet on all 10 streets outside the trigger block
        for (let i = 0; i < allStreets.length; i++) {
            const streetStart = allStreets[i];
            // The trigger block covers the street starting at triggerS and the one at triggerS + 3
            if (streetStart !== triggerS && streetStart !== triggerS + 3) {
                bets.push({ type: 'street', value: streetStart, amount: streetBetAmount });
            }
        }
    } else {
        // Flat Bet (Waiting for Trigger)
        let flatAmount = baseUnit;
        
        // Clamp outside bet to limits
        flatAmount = Math.max(flatAmount, config.betLimits.minOutside);
        flatAmount = Math.min(flatAmount, config.betLimits.max);
        
        bets.push({ type: state.lastColor, amount: flatAmount });
    }

    return bets;
}