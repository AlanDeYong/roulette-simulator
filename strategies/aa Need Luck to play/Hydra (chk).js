/**
 * Strategy: "Hydra" Roulette Strategy
 * Source: CEG Dealer School (https://youtu.be/NqIXaF7wITg)
 * 
 * Logic & Betting Overview:
 * -------------------------
 * The Hydra strategy is designed as an aggressive, high-upside alternative to 
 * standard 50/50 outside betting (Red/Black). It divides a $500 session bankroll 
 * into four $125 bullets.
 * 
 * 1. Base Setup (Stage 1):
 *    - Place 5 non-touching corner bets across the layout ($25 each = $125 total).
 *    - Covering 20 total numbers without any overlap.
 * 
 * 2. Progression Triggers:
 *    - On Loss (Miss):
 *      - All corner bets lose ($125 loss). Reset back to Stage 1 base corner bets.
 *    - On Corner Hit in Stage 1:
 *      - Corner pays 8:1 ($200 win + $25 bet returned = $225 return, +$100 net profit).
 *      - Reinvest the $100 profit into the "Hydra Attack" (Stage 2).
 *    - Stage 2 ("Hydra Attack"):
 *      - Maintain the 5 corner bets ($25 each = $125).
 *      - Add 7 straight-up bets covering numbers inside the active corners:
 *        * 6 straight-up bets @ $15 each ($90)
 *        * 1 straight-up bet @ $10 ($10)
 *        * Total table exposure in Stage 2 = $225 ($125 corners + $100 straight-ups).
 *    - Outcomes in Stage 2:
 *      - Straight-Up Hit (Jackpot): Pays 35:1 on the straight up ($525+) plus the corner 
 *        payout ($200+), yielding $500–$700+ single-spin profit. Reset back to Stage 1.
 *      - Corner-Only Hit: Returns $225, exactly breaking even on the $225 bet. Stay in Stage 2.
 *      - Total Miss: Both corners and straight-ups lose. Reset back to Stage 1.
 * 
 * 3. Goal & Stop Conditions:
 *    - Target Profit: +$500 (doubling the $500 buy-in) or hitting the big straight-up jackpot.
 *    - Stop Loss: Depletion of allocated bullets / bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Non-Touching Corner Positions (Top-Left numbers)
    // C1: 1 covers [1, 2, 4, 5]
    // C2: 8 covers [8, 9, 11, 12]
    // C3: 16 covers [16, 17, 19, 20]
    // C4: 22 covers [22, 23, 25, 26]
    // C5: 32 covers [32, 33, 35, 36]
    const CORNERS = [1, 8, 16, 22, 32];
    
    // The pool of numbers covered by these 5 disjoint corners (20 numbers)
    const CORNER_NUMBERS = [
        1, 2, 4, 5,
        8, 9, 11, 12,
        16, 17, 19, 20,
        22, 23, 25, 26,
        32, 33, 35, 36
    ];

    // Numbers targeted for Straight-Up press in Stage 2 (6 numbers @ 15, 1 number @ 10)
    const STRAIGHT_UPS_MAJOR = [2, 8, 17, 23, 26, 32]; // 6 numbers
    const STRAIGHT_UP_MINOR = 35;                        // 1 number

    // 2. Initialize State
    if (state.stage === undefined) {
        state.stage = 1; // 1 = Base Corners, 2 = Hydra Attack (Corners + Straight-Ups)
        state.targetBankroll = (config.startingBankroll || bankroll) + 50000;
        state.stopLossBankroll = Math.max(0, (config.startingBankroll || bankroll) - 500);
    }

    // 3. Profit / Stop Loss Verification
    if (bankroll >= state.targetBankroll || bankroll < (config.betLimits.min * 5)) {
        return []; // Target reached or insufficient funds to continue
    }

    // 4. Evaluate Previous Spin Result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const hitCorner = CORNER_NUMBERS.includes(lastNum);
        const hitStraightUp = state.stage === 2 && (STRAIGHT_UPS_MAJOR.includes(lastNum) || lastNum === STRAIGHT_UP_MINOR);

        if (state.stage === 1) {
            if (hitCorner) {
                // Won $100 profit in Stage 1 -> Advance to Hydra Stage 2
                state.stage = 2;
            } else {
                // Missed -> Stay in Stage 1
                state.stage = 1;
            }
        } else if (state.stage === 2) {
            if (hitStraightUp) {
                // Massive hit! Lock in profit and reset to Stage 1
                state.stage = 1;
            } else if (hitCorner) {
                // Corner hit only: breaks even on the $225 bet, keep pressing
                state.stage = 2;
            } else {
                // Complete miss -> Reset to Stage 1
                state.stage = 1;
            }
        }
    }

    // 5. Calculate Scaled Bet Units
    // Default base: Corner = $25. Straight-ups = $15 (60%) and $10 (40%)
    let baseCorner = 25;
    if (config.betLimits && config.betLimits.min) {
        baseCorner = Math.max(baseCorner, config.betLimits.min);
    }

    // Stage 2 straight up bet sizing
    let betStraightMajor = Math.max(config.betLimits.min, Math.round(baseCorner * 0.6));
    let betStraightMinor = Math.max(config.betLimits.min, Math.round(baseCorner * 0.4));

    // Clamp corner bet to table maximum
    baseCorner = Math.min(baseCorner, config.betLimits.max);
    betStraightMajor = Math.min(betStraightMajor, config.betLimits.max);
    betStraightMinor = Math.min(betStraightMinor, config.betLimits.max);

    // 6. Build Bet Array
    const bets = [];

    // Always place the 5 non-touching corner bets
    for (const cornerVal of CORNERS) {
        bets.push({
            type: 'corner',
            value: cornerVal,
            amount: baseCorner
        });
    }

    // If in Stage 2 (Hydra Attack), overlay the 7 straight-up bets
    if (state.stage === 2) {
        for (const num of STRAIGHT_UPS_MAJOR) {
            bets.push({
                type: 'number',
                value: num,
                amount: betStraightMajor
            });
        }
        bets.push({
            type: 'number',
            value: STRAIGHT_UP_MINOR,
            amount: betStraightMinor
        });
    }

    // 7. Verify Bankroll Sufficiency
    const totalRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalRequired > bankroll) {
        // Fall back to just base corners or stop if unable to afford
        if (state.stage === 2) {
            state.stage = 1;
            return bets.slice(0, 5); // Return only the 5 corners
        }
        return [];
    }

    return bets;
}