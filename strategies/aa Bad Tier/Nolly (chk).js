/**
 * Roulette Strategy Function
 * * Source:
 * - URL: https://youtu.be/unyygTJNqik?si=23tWj4q9DS3UWNJ-
 * - Channel Name: Ninja Gamblers
 * - Strategy Name: Nolly Roulette Progression
 * * The Full Logic in Details:
 * - This strategy dynamically covers 2 out of the 3 available dozens (covering 24 out of 37 numbers on a European wheel, approx. 65% board coverage).
 * - There are no complex triggers based on past tracking; bets are initiated right away on any chosen two dozens.
 * - This is a profit-reinvestment system designed to scale up heavily utilizing past winnings while capping individual downside exposure on any single sequence to a maximum loss of 4 base units.
 * * The Full Bet Progression in Details:
 * - Stage 1 (Base Level): 
 * - Bet 2 units on Dozen A and 2 units on Dozen B (Total stake: 4 units).
 * - Loss (uncovered dozen or 0 hits): Stay at Stage 1, repeating the 2-unit / 2-unit bet pattern.
 * - Win on either dozen: Advance to Stage 1 Press.
 * * - Stage 1 Press (Rolling forward win profit):
 * - Choose one of the previously bet dozens to "press" (double) to 4 units, while keeping the other dozen at 2 units (Total stake: 6 units).
 * - If the un-pressed dozen hits (2-unit bet): It results in a net push ($2 bet pays $4 profit + $2 back = $6 total return, matching the $6 stake). The pattern is repeated exactly as it is without shifting state.
 * - If a Loss occurs: Reset completely back to Stage 1 Base (2 units on each).
 * - If the pressed dozen hits (4-unit bet): The cycle is completed! Lock in profits and step up the base tier to Stage 2.
 * * - Stage 2 Base:
 * - Increase the base by 1 unit on both sides: Bet 3 units on Dozen A and 3 units on Dozen B (Total stake: 6 units).
 * - Loss: Reset completely back to Stage 1 Base.
 * - Win: Advance to Stage 2 Press.
 * * - Stage 2 Press:
 * - Double one side: Bet 6 units on one dozen, 3 units on the other (Total stake: 9 units).
 * - Push (smaller dozen hits): Repeat the bet.
 * - Loss: Reset back to Stage 1 Base.
 * - Win (pressed dozen hits): Cycle completed! Advance base tier to Stage 3.
 * * - Stage 3 Base:
 * - Increase base by another unit: Bet 4 units on Dozen A and 4 units on Dozen B (Total stake: 8 units).
 * - Loss: Reset back to Stage 1 Base.
 * - Win: Advance to Stage 3 Press.
 * * - Stage 3 Press (The "Jackpot Zone"):
 * - Double one side: Bet 8 units on one dozen, 4 units on the other (Total stake: 12 units).
 * - Push (smaller dozen hits): Repeat the bet.
 * - Loss: Reset back to Stage 1 Base.
 * - Win (pressed dozen hits): Final Target Cycle completed!
 * * The Goal:
 * - Target Profit: Secure a win on the highest pressed level (such as hitting the Stage 3 Pressed bet of 8 units / 4 units) which translates into an execution target of converting a tiny initial capital run into scaled gains within 6 continuous compounding spins.
 * - Stop-Loss: Driven organically by bankroll exhaustion or terminating the session once target milestone runs are capped.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Setup Base Betting Units
    const baseUnit = config.betLimits.minOutside;

    // 2. Initialize Persistent Strategy State Variables
    if (!state.currentStage) {
        state.currentStage = 1;        // Progression Base Tier: 1, 2, or 3
        state.isPressedState = false;  // False = Base Layer, True = Pressed Layer
        state.targetDozens = [1, 2];   // Tracks the specific dozens currently being targeted (1, 2, or 3)
        state.pressedDozen = null;     // Tracks which specific dozen is being doubled during a press stage
        state.previousBets = null;     // Holds exact composition of the last placed round for push evaluations
    }

    // 3. Process the Result of the Last Spin to Calculate Transitions
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Find out which dozen won (1 for 1-12, 2 for 13-24, 3 for 25-36, 0 for 0/00)
        let winningDozen = 0;
        if (lastNumber >= 1 && lastNumber <= 12) winningDozen = 1;
        else if (lastNumber >= 13 && lastNumber <= 24) winningDozen = 2;
        else if (lastNumber >= 25 && lastNumber <= 36) winningDozen = 3;

        if (state.isPressedState) {
            // Evaluated outcomes during a pressed sequence
            if (winningDozen === state.pressedDozen) {
                // Success: Pressed dozen won! Progress to the next tier up or complete the run
                if (state.currentStage < 3) {
                    state.currentStage += 1;
                    state.isPressedState = false;
                    state.pressedDozen = null;
                    // Adapt dynamically to include the last successful winning dozen
                    state.targetDozens = winningDozen === 3 ? [2, 3] : [winningDozen, winningDozen + 1];
                } else {
                    // Maximum milestone reached (Stage 3 Pressed win complete) -> Reset safely
                    state.currentStage = 1;
                    state.isPressedState = false;
                    state.pressedDozen = null;
                    state.targetDozens = [1, 2];
                }
            } else if (state.targetDozens.includes(winningDozen)) {
                // Push: The smaller un-pressed dozen hit. Maintain exact structure and re-spin
                // No alterations to stage, isPressedState, or target mappings
            } else {
                // Loss: Uncovered space hit. Reset completely back to base units
                state.currentStage = 1;
                state.isPressedState = false;
                state.pressedDozen = null;
                state.targetDozens = [1, 2];
            }
        } else {
            // Evaluated outcomes during a uniform baseline sequence
            if (state.targetDozens.includes(winningDozen)) {
                // Win: Advance to the pressed structure within the current active stage tier
                state.isPressedState = true;
                state.pressedDozen = winningDozen; // Press the dozen that just triggered the win
            } else {
                // Loss: Uncovered space hit. Reset completely back to Stage 1 Base
                state.currentStage = 1;
                state.isPressedState = false;
                state.pressedDozen = null;
                state.targetDozens = [1, 2];
            }
        }
    }

    // 4. Construct Next Round Bets Based on Persistent Mappings
    let bets = [];
    const currentTierMultiplier = state.currentStage + 1; // Stage 1 = 2 units, Stage 2 = 3 units, Stage 3 = 4 units

    state.targetDozens.forEach(dozen => {
        let unitsToPlace = currentTierMultiplier;

        if (state.isPressedState && dozen === state.pressedDozen) {
            // Double the allocated units on the chosen press channel
            unitsToPlace = currentTierMultiplier * 2;
        }

        let finalAmount = baseUnit * unitsToPlace;

        // Apply robust safety clamps enforcing configurations limit integrity
        finalAmount = Math.max(finalAmount, config.betLimits.minOutside);
        finalAmount = Math.min(finalAmount, config.betLimits.max);

        bets.push({
            type: 'dozen',
            value: dozen,
            amount: finalAmount
        });
    });

    // Save history data frame hook for precision tracking on the next round execution loop
    state.previousBets = bets;
    return bets;
}