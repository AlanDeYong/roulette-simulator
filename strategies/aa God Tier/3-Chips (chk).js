/**
 * Strategy Name: The 3-Chip Roulette Glitch: The Sith Revenge Trap (Randomized Variation)
 * Source: https://youtu.be/Yi6GEm2ZAZ0 (Channel: The Lucky Felt)
 * ============================================================================
 * THE FULL LOGIC & CONDITIONS
 * ============================================================================
 * The strategy covers exactly half of the wheel layout using a combination of 
 * a 1:1 Outside bet, a 2:1 Dozen bet, and progressive Inside Straight-up number bets.
 * * The system can be played on either the LOW side or the HIGH side:
 * 1. LOW SIDE SELECTION:
 * - Main Outside: 'low' (numbers 1-18)
 * - Main Dozen: 'dozen' value 1 (numbers 1-12)
 * - Inside Numbers: Placed RANDOMLY on straight-up numbers inside the 1st Dozen (1-12).
 * - Hedging/Trigger Street: Numbers 13-18.
 * 2. HIGH SIDE SELECTION:
 * - Main Outside: 'high' (numbers 19-36)
 * - Main Dozen: 'dozen' value 3 (numbers 25-36)
 * - Inside Numbers: Placed RANDOMLY on straight-up numbers inside the 3rd Dozen (25-36).
 * - Hedging/Trigger Street: Numbers 19-24.
 * * TRIGGERS & PLACEMENT PROGRESSIONS:
 * - Base State: Start with 2 units on Outside (low/high) and 1 unit on Dozen (1st/3rd). No number bets.
 * - Double Street Hit: If the wheel lands on the unhedged double street (13-18 for low, 19-24 for high), 
 * add 1 unit to a RANDOM unhit straight-up number inside your targeted dozen.
 * - Dozen Hit: If the wheel lands inside your targeted dozen (1-12 for low, 25-36 for high):
 * - The main progression increases: Add 2 units to the Outside bet, add 1 unit to the Dozen bet, 
 * and add 1 unit to a RANDOM unhit straight-up number inside that dozen.
 * - Inside Number Hit: Hitting any of the covered inside straight-up numbers yields a massive payout 
 * and signals a session profit, triggering a complete strategy reset back to the base setup.
 * - Losses: On absolute missed losses (or zeroes), do NOT increase the bet sizes. Keep the amounts 
 * exactly the same. The player alternates sides on a loss to chase layout streaks. 
 * CRITICAL LOGIC UPGRADE: When switching sides, the active accumulated number count is noted, 
 * the old side's numbers are cleared, and an equal number of straight-up bets are immediately 
 * regenerated randomly within the new opposite side's dozen.
 * * ============================================================================
 * THE GOAL & STOP-LOSS
 * ============================================================================
 * - Target Profit: Profit >= 100 units from the start of the session.
 * - Reset Condition: Any net positive session win from hitting an inside straight-up 
 * number triggers an immediate strategy reset to safeguard profit.
 * - Stop-Loss: Complete bankroll depletion (bankruptcy).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Determine configuration properties or fall back to standard defaults
    const minInside = config.betLimits.min || 2;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;
    
    const minIncrementalBet = config.minIncrementalBet || 1;
    const incrementMode = config.incrementMode || 'fixed';

    // 1. Initialize State Tracking Variables
    if (!state.isInitialized) {
        state.currentSide = 'low'; // Default starting layout selection ('low' or 'high')
        state.outsideUnits = 2;   // Base initial units for Outside bet
        state.dozenUnits = 1;     // Base initial units for Dozen bet
        state.numbersCovered = []; // Tracking straight-up numbers active in progression
        state.targetProfit = 100000 * minOutside; 
        state.initialBankroll = bankroll;
        state.isInitialized = true;
    }

    // Helper to pick a random available number from the active dozen layout
    function addRandomNumberFromDozen(isLowSide) {
        const targetDozenMin = isLowSide ? 1 : 25;
        const targetDozenMax = isLowSide ? 12 : 36;
        
        const availableNumbers = [];
        for (let i = targetDozenMin; i <= targetDozenMax; i++) {
            if (!state.numbersCovered.includes(i)) {
                availableNumbers.push(i);
            }
        }
        
        if (availableNumbers.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            state.numbersCovered.push(availableNumbers[randomIndex]);
        }
    }

    // Helper to regenerate a specific amount of random numbers for a brand new side
    function populateRandomPoolForSide(isLowSide, targetCount) {
        state.numbersCovered = [];
        for (let i = 0; i < targetCount; i++) {
            addRandomNumberFromDozen(isLowSide);
        }
    }

    // 2. Handle Strategy Reset Logic
    function resetStrategy() {
        state.outsideUnits = 2;
        state.dozenUnits = 1;
        state.numbersCovered = [];
    }

    // 3. Process Spin History Findings
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Verify if a covered straight-up inside number hit
        if (state.numbersCovered.includes(num)) {
            resetStrategy();
        } else {
            // Determine logical tracking boundaries depending on active selection side
            const isLowSide = state.currentSide === 'low';
            const targetDozenMin = isLowSide ? 1 : 25;
            const targetDozenMax = isLowSide ? 12 : 36;
            const triggerStreetMin = isLowSide ? 13 : 19;
            const triggerStreetMax = isLowSide ? 18 : 24;

            if (num >= targetDozenMin && num <= targetDozenMax) {
                // Targeted Dozen Hit: Violently expand layout coverage using casino winnings
                state.outsideUnits += 2;
                state.dozenUnits += 1;
                addRandomNumberFromDozen(isLowSide);
            } else if (num >= triggerStreetMin && num <= triggerStreetMax) {
                // Unhedged Double Street Trigger Hit: Add 1 straight-up inside number unit
                addRandomNumberFromDozen(isLowSide);
            } else {
                // Absolute loss or layout miss: Keep bet sizes the same. 
                // Save current accumulated count of straight numbers before clearing
                const activeCountToTransfer = state.numbersCovered.length;
                
                // Dynamically alternate sides to proactively chase layout streaks
                state.currentSide = isLowSide ? 'high' : 'low';
                
                // Regenerate an equal number of random straight numbers for the new opposite side's dozen
                populateRandomPoolForSide(state.currentSide === 'low', activeCountToTransfer);
            }
        }
    }

    // Check if target profit objective has been completed or bankroll is depleted
    if ((bankroll - state.initialBankroll) >= state.targetProfit || bankroll < minOutside) {
        return null;
    }

    // 4. Construct Operational Bet Placements Array
    const bets = [];
    const isLow = state.currentSide === 'low';

    // Calculate Outside & Dozen bet sizing allocations
    let outsideAmount = state.outsideUnits * minOutside;
    let dozenAmount = state.dozenUnits * minOutside;

    outsideAmount = Math.min(Math.max(outsideAmount, minOutside), maxBet);
    dozenAmount = Math.min(Math.max(dozenAmount, minOutside), maxBet);

    bets.push({
        type: isLow ? 'low' : 'high',
        amount: outsideAmount
    });

    bets.push({
        type: 'dozen',
        value: isLow ? 1 : 3,
        amount: dozenAmount
    });

    // Handle calculation and assignment for progressive Inside straight-up numbers
    if (state.numbersCovered.length > 0) {
        // Distribute single unit sizing across numbers tracking with respect to limit rules
        let insideUnitBase = minInside;
        if (incrementMode === 'fixed') {
            insideUnitBase += (state.numbersCovered.length - 1) * minIncrementalBet;
        } else {
            insideUnitBase = insideUnitBase * state.numbersCovered.length;
        }

        const individualNumberAmount = Math.min(Math.max(Math.floor(insideUnitBase / state.numbersCovered.length), minInside), maxBet);

        state.numbersCovered.forEach(num => {
            bets.push({
                type: 'number',
                value: num,
                amount: individualNumberAmount
            });
        });
    }

    return bets;
}