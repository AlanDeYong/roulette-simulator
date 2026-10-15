/**
 * Strategy: Professor's 3x3=27 Street Strategy
 * Source: WillVegas YouTube Channel
 * https://youtu.be/LZ6gXVW05QM?si=8bKRKKXsy8fnTPZv
 * 
 * Logic:
 * - This strategy bets on streets (3 numbers each) using a "follow the winner" dozen progression.
 * - The roulette table is divided into three dozens (1-12, 13-24, 25-36). Each dozen contains 4 streets.
 * - We cover a subset of streets across active dozens, increasing coverage and bet size on losses.
 * 
 * Progression Tiers:
 * - Tier 1: Bet on 3 streets in the dozen of the last winning number (9 numbers covered). Bet size = 1 unit per street.
 * - Tier 2: If Tier 1 loses, bet on 6 streets (18 numbers covered): 3 in the dozen of the last winning number, and 3 in the previous dozen. Bet size = 1 unit per street.
 * - Tier 3: If Tier 2 loses, bet on 9 streets (27 numbers covered): 3 streets in each of the three dozens. Bet size = 2 units per street.
 * - Tier 4+: If we continue to lose at Tier 3 (9 streets), we stay at 9 streets but double the bet size per street (multiplier goes 2 -> 4 -> 8 -> 16 -> 32...) on each subsequent loss.
 * 
 * Session Reset:
 * - Once we achieve a net profit for the session (current bankroll > session start bankroll), we reset back to Tier 1 with 1 unit per street.
 * 
 * Target Goal:
 * - Target profit is set to $100. Once reached, the strategy stops to lock in the session profits.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min;
    const targetProfit = 100000;

    // Helper: Determine dozen of a number
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null; // 0 or 00
    }

    // Helper: Get 3 streets for a given dozen, ensuring the winning street is included
    function getStreetsForDozen(dozen, lastWinningNumber) {
        let allStreets = [];
        if (dozen === 1) allStreets = [1, 4, 7, 10];
        else if (dozen === 2) allStreets = [13, 16, 19, 22];
        else if (dozen === 3) allStreets = [25, 28, 31, 34];
        
        let winStreet = null;
        if (lastWinningNumber >= 1 && lastWinningNumber <= 36) {
            winStreet = Math.floor((lastWinningNumber - 1) / 3) * 3 + 1;
        }
        
        let selected = [];
        if (winStreet && allStreets.includes(winStreet)) {
            selected.push(winStreet);
        }
        
        for (let street of allStreets) {
            if (selected.length >= 3) break;
            if (!selected.includes(street)) {
                selected.push(street);
            }
        }
        return selected;
    }

    // 1. Initialize State
    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
        state.tier = 1;
        state.lossesAtMaxCoverage = 0;
        state.activeDozens = [1];
        state.lastBets = [];
    }

    // 2. Check for Session Goal
    if (bankroll >= state.sessionStartBankroll + targetProfit) {
        console.log(`Target profit of $${targetProfit} reached. Stopping session.`);
        return [];
    }

    // 3. Process Spin History & Progression Transitions
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Determine if last spin was a win
        let won = false;
        if (state.lastBets && state.lastBets.length > 0) {
            won = state.lastBets.some(b => lastNum >= b.value && lastNum <= b.value + 2);
        }

        // Check if we hit session profit to trigger reset
        if (bankroll >= state.sessionStartBankroll) {
            state.sessionStartBankroll = bankroll;
            state.tier = 1;
            state.lossesAtMaxCoverage = 0;
            let lastDozen = getDozen(lastNum) || 1;
            state.activeDozens = [lastDozen];
        } else {
            // Manage tier transitions on loss/win
            if (!won) {
                if (state.tier === 1) {
                    state.tier = 2;
                } else if (state.tier === 2) {
                    state.tier = 3;
                    state.lossesAtMaxCoverage = 1;
                } else if (state.tier === 3) {
                    state.lossesAtMaxCoverage += 1;
                }
            }
            
            // Update active dozens based on current tier
            let lastDozen = getDozen(lastNum);
            if (state.tier === 3) {
                // Tier 3 must cover all three dozens
                state.activeDozens = [1, 2, 3];
            } else if (state.tier === 2) {
                if (lastDozen !== null) {
                    let nextDozens = [lastDozen];
                    for (let d of state.activeDozens) {
                        if (!nextDozens.includes(d)) {
                            nextDozens.push(d);
                        }
                    }
                    // Ensure exactly 2 unique dozens
                    if (nextDozens.length < 2) {
                        for (let d of [1, 2, 3]) {
                            if (!nextDozens.includes(d)) nextDozens.push(d);
                        }
                    }
                    state.activeDozens = nextDozens.slice(0, 2);
                } else {
                    // Null dozen (0/00 hit), keep existing selection but guarantee size of 2
                    if (state.activeDozens.length < 2) {
                        for (let d of [1, 2, 3]) {
                            if (!state.activeDozens.includes(d)) state.activeDozens.push(d);
                        }
                    }
                    state.activeDozens = state.activeDozens.slice(0, 2);
                }
            } else {
                // Tier 1 covers exactly 1 dozen
                if (lastDozen !== null) {
                    state.activeDozens = [lastDozen];
                } else {
                    if (state.activeDozens.length === 0) state.activeDozens = [1];
                    state.activeDozens = [state.activeDozens[0]];
                }
            }
        }
    }

    // 4. Calculate Bet Multiplier
    let multiplier = 1;
    if (state.tier === 3) {
        if (state.lossesAtMaxCoverage <= 1) {
            multiplier = 2;
        } else {
            multiplier = 2 * Math.pow(2, state.lossesAtMaxCoverage - 1);
        }
    }

    let betAmount = multiplier * baseUnit;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 5. Generate Bets
    const lastWinningNumber = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1].winningNumber : null;
    let streetsToBet = [];
    for (let dozen of state.activeDozens) {
        let dozenStreets = getStreetsForDozen(dozen, lastWinningNumber);
        streetsToBet = streetsToBet.concat(dozenStreets);
    }
    
    // Deduplicate active streets
    streetsToBet = [...new Set(streetsToBet)];

    let currentBets = [];
    for (let street of streetsToBet) {
        currentBets.push({
            type: 'street',
            value: street,
            amount: betAmount
        });
    }

    state.lastBets = currentBets;
    return currentBets;
}