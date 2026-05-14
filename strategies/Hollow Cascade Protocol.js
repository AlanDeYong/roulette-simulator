/*
 * Strategy: The Hollow Cascade Protocol
 * Source: The Lucky Felt / Todd Hoover (https://youtu.be/b9FN09scfkA?si=3xlkDxG0LY3euWHw)
 * 
 * The Logic:
 * Phase 1 (Sniper Bet): Identify the "coldest" bundle of 3 adjacent streets 
 * (1-9, 10-18, 19-27, or 28-36). Place equal bets on these 3 streets.
 * Phase 2 (Jackpot Bet): If Phase 1 wins on Level 1 or Level 2, take the entire 
 * payout and split it equally across 2 Line (Double Street) bets corresponding 
 * to the double streets of the last 2 winning numbers.
 *
 * The Progression:
 * Phase 1 uses a cascading progression to recover losses gracefully:
 * - Level 1: 1 unit per street. Up to 3 attempts (spins).
 * - Level 2: 2 units per street. Up to 2 attempts.
 * - Level 3+: +1 unit per street. Up to 2 attempts per level.
 * If Phase 1 wins at Level 3 or higher, we do not play Phase 2 because the win 
 * alone secures a session profit. Instead, reset to Phase 1, Level 1.
 * If Phase 2 is played, regardless of whether it wins or loses, reset back to 
 * Phase 1, Level 1.
 *
 * The Goal: Trigger massive wins on Phase 2 "jackpot" bets using only casino money, 
 * while utilizing a slow cascading loss-recovery structure in Phase 1.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min;

    function getColdestBundle(history) {
        let lastSeen = { 0: -1, 1: -1, 2: -1, 3: -1 };
        for (let i = 0; i < history.length; i++) {
            let num = history[i].winningNumber;
            if (num > 0) {
                let b = Math.floor((num - 1) / 9);
                if (b >= 0 && b <= 3) {
                    lastSeen[b] = i;
                }
            }
        }
        let coldest = 0;
        let minSeen = Infinity;
        for (let i = 0; i <= 3; i++) {
            if (lastSeen[i] < minSeen) {
                minSeen = lastSeen[i];
                coldest = i;
            }
        }
        return coldest;
    }

    function getRecentLines(history) {
        let lines = [];
        for (let i = history.length - 1; i >= 0; i--) {
            let num = history[i].winningNumber;
            if (num > 0) {
                let line = Math.floor((num - 1) / 6) * 6 + 1;
                if (!lines.includes(line)) {
                    lines.push(line);
                    if (lines.length === 2) break;
                }
            }
        }
        if (lines.length < 1) lines.push(1);
        if (lines.length < 2) lines.push(7);
        return lines;
    }

    function resetPhase1() {
        state.phase = 1;
        state.phase1Level = 1;
        state.phase1Attempt = 1;
        state.targetBundle = getColdestBundle(spinHistory);
    }

    if (spinHistory.length > 0 && state.lastPhase) {
        let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        let wonLast = false;

        if (state.lastPhase === 1) {
            let startNum = state.targetBundle * 9 + 1;
            let endNum = startNum + 8;
            if (lastNum >= startNum && lastNum <= endNum) {
                wonLast = true;
            }

            if (wonLast) {
                if (state.phase1Level <= 2) {
                    state.phase = 2;
                    state.phase2Amount = (state.phase1Level * baseUnit * 12) / 2;
                    state.phase2Lines = getRecentLines(spinHistory);
                } else {
                    resetPhase1();
                }
            } else {
                state.phase1Attempt++;
                if (state.phase1Level === 1 && state.phase1Attempt > 3) {
                    state.phase1Level = 2;
                    state.phase1Attempt = 1;
                } else if (state.phase1Level > 1 && state.phase1Attempt > 2) {
                    state.phase1Level++;
                    state.phase1Attempt = 1;
                }
            }
        } else if (state.lastPhase === 2) {
            resetPhase1();
        }
    } else if (!state.lastPhase) {
        resetPhase1();
    }

    let bets = [];
    
    if (state.phase === 1) {
        let amount = state.phase1Level * baseUnit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        let startStreet = state.targetBundle * 9 + 1;
        bets.push({ type: 'street', value: startStreet, amount: amount });
        bets.push({ type: 'street', value: startStreet + 3, amount: amount });
        bets.push({ type: 'street', value: startStreet + 6, amount: amount });
    } else if (state.phase === 2) {
        let amount = state.phase2Amount;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        state.phase2Lines.forEach(line => {
            bets.push({ type: 'line', value: line, amount: amount });
        });
    }

    state.lastPhase = state.phase;
    return bets;
}