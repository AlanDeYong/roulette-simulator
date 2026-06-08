/**
 * Strategy: The Debt Collector
 * Source: https://youtu.be/f9uNvrym33Q?si=Io6wsmfn9yypyuqX (Channel: The Lucky Felt)
 * * Full Logic:
 * - This system treats the roulette table as a grid of 6 Double Streets (neighborhoods).
 * - Out of the 6 Double Streets, we constantly place bets on 5 of them, leaving 1 un-netted.
 * - Initially, we place a 1-unit bet on 5 Double Streets.
 * - On every spin, if one of our covered Double Streets hits, we collect standard "rent" (a win), 
 * but the underlying progression shifts. The Double Street that just hit is left uncovered for 
 * the next spin, and the previous uncovered Double Street is brought into play.
 * - Rent Accumulation (Loss Progression): If a neighborhood refuses to pay rent (our uncovered 
 * Double Street hits, or a 0/00 hits), we increase the rent across all properties. We add 1 unit 
 * to every sector that missed.
 * - Main Dynamic:
 * - After a Win on a covered property: We add +1 unit to all 4 covered properties that DID NOT hit on the last spin. 
 * The property that hit is reset back down to 1 unit and remains covered *unless* it was the absolute last winner, 
 * in which case the exact property that just hit becomes the one left uncovered on the subsequent round.
 * * Unique Recovery System (Double-Loss Protection):
 * - If our uncovered Double Street hits, it results in a net loss for the round. To protect against back-to-back 
 * misses on the exact same uncovered spot, we deploy a temporary freeze recovery mechanism:
 * - We freeze all existing Double Street bet amounts as they are.
 * - We calculate a recovery bet amount based on the net loss of that missing round: 
 * (Round Loss Amount + 1 Unit) / 5.
 * - We temporarily place this recovery bet directly onto the uncovered Double Street alongside our regular bets.
 * - Outcome A: If the uncovered street hits again, it pays 5:1, instantly wiping out the loss of the previous round 
 * and putting us back on track. We then remove the recovery bet and resume standard progression.
 * - Outcome B: If one of our covered streets hits instead, we resume the standard progression game.
 * - Zero Rule: If a green 0 or 00 hits, it counts as an overall round loss, and everything resets flat back to 1 unit.
 * * Goal:
 * - The original configuration targets a session profit goal of 100 units.
 * - When approaching within striking distance of the target profit, the strategy utilizes a safe landing adjustment, 
 * scaling bets down uniformly to the minimum necessary amount required to hit the exact milestone target safely.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Determine table type and configuration boundaries
    const isAmerican = config.tableType === 'american';
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 50000;
    const unit = minOutside; // Double street behaves with outside-level boundaries in standard setups

    // Map numbers (0-36) to their corresponding Double Street definitions
    // Value represents the lowest starting number of that specific 6-number line
    function getDoubleStreet(num) {
        if (num === 0 || num === 37) return -1; // Green positions
        if (num >= 1 && num <= 6) return 1;
        if (num >= 7 && num <= 12) return 7;
        if (num >= 13 && num <= 18) return 13;
        if (num >= 19 && num <= 24) return 19;
        if (num >= 25 && num <= 30) return 25;
        if (num >= 31 && num <= 36) return 31;
        return -1;
    }

    const doubleStreets = [1, 7, 13, 19, 25, 31];

    // Initialize state objects on the first spin
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.targetProfit = 1000000 * unit;
        state.baseBetUnits = {};
        doubleStreets.forEach(ds => {
            state.baseBetUnits[ds] = 1;
        });
        state.uncoveredStreet = 31; // Default initial uncovered zone
        state.inRecovery = false;
        state.recoveryAmount = 0;
        state.initialized = true;
    }

    // Check for target profit achievement
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetProfit) {
        return null; // Stop betting after hitting session goal
    }

    // Process history data if it exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const winningStreet = getDoubleStreet(winningNum);

        // Safe landing calculation: Adjust unit sizes down if near the target goal
        const remainingProfitNeeded = state.targetProfit - currentProfit;
        if (remainingProfitNeeded > 0 && remainingProfitNeeded <= 5 * unit) {
            const lowUnit = Math.max(config.betLimits.min, 1);
            const lowBets = [];
            doubleStreets.forEach(ds => {
                if (ds !== state.uncoveredStreet) {
                    lowBets.push({ type: 'line', value: ds, amount: lowUnit });
                }
            });
            return lowBets;
        }

        if (winningStreet === -1) {
            // Green Zero Hit: Complete reset condition
            doubleStreets.forEach(ds => {
                state.baseBetUnits[ds] = 1;
            });
            state.inRecovery = false;
            state.recoveryAmount = 0;
        } else if (state.inRecovery) {
            // Evaluate recovery mode outcomes
            if (winningStreet === state.uncoveredStreet) {
                // Recovery bet won: Losses cleared, exit recovery mode
                state.inRecovery = false;
                state.recoveryAmount = 0;
                
                // standard shift update
                state.uncoveredStreet = winningStreet;
                state.baseBetUnits[winningStreet] = 1;
            } else {
                // Main game covered bet won instead: Resume standard progression logic
                state.inRecovery = false;
                state.recoveryAmount = 0;

                // Adjust units for the hit properties
                doubleStreets.forEach(ds => {
                    if (ds === winningStreet) {
                        state.baseBetUnits[ds] = 1;
                    } else if (ds !== state.uncoveredStreet) {
                        state.baseBetUnits[ds] += 1;
                    }
                });
                state.uncoveredStreet = winningStreet;
            }
        } else {
            // Standard non-recovery mode execution
            if (winningStreet === state.uncoveredStreet) {
                // Uncovered street was hit: Calculate round loss parameters and activate recovery
                let roundLoss = 0;
                doubleStreets.forEach(ds => {
                    if (ds !== state.uncoveredStreet) {
                        roundLoss += state.baseBetUnits[ds] * unit;
                    }
                });

                // Calculate hedging protection amount for the gap property
                const recAmt = Math.ceil((roundLoss + unit) / 5);
                state.inRecovery = true;
                state.recoveryAmount = recAmt;
            } else {
                // Covered street won: Increment unhit property rent tokens, reset winner to baseline
                doubleStreets.forEach(ds => {
                    if (ds === winningStreet) {
                        state.baseBetUnits[ds] = 1;
                    } else if (ds !== state.uncoveredStreet) {
                        state.baseBetUnits[ds] += 1;
                    }
                });
                state.uncoveredStreet = winningStreet;
            }
        }
    }

    // Build the final optimized bets payload array
    const bets = [];
    doubleStreets.forEach(ds => {
        let finalAmount = 0;

        // Add standard property position unit allocation
        if (ds !== state.uncoveredStreet) {
            finalAmount += state.baseBetUnits[ds] * unit;
        }

        // Overlay recovery counter-measure if active on this cell
        if (state.inRecovery && ds === state.uncoveredStreet) {
            finalAmount += state.recoveryAmount;
        }

        // Clamp bet within specified limit parameters
        if (finalAmount > 0) {
            finalAmount = Math.max(finalAmount, minOutside);
            finalAmount = Math.min(finalAmount, maxBet);
            bets.push({
                type: 'line',
                value: ds,
                amount: finalAmount
            });
        }
    });

    return bets.length > 0 ? bets : null;
}