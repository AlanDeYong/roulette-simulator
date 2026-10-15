/**
 * Strategy Name: Too Easy to Win Roulette Strategy
 * Source: https://www.youtube.com/watch?v=ZThwHdZXTdI (Channel: Bet With Mo)
 * * The Full Logic:
 * - This strategy targets 7 consecutive rows (streets) on the roulette table.
 * - Every time a new session starts or the session's peak profit is met or exceeded,
 * a new set of 7 consecutive random rows and a random priority order of the 3 columns is chosen.
 * - Level 1 bets on the 7 numbers in Column 1.
 * - Level 2 adds bets on the same 7 rows in Column 2.
 * - Level 3 adds street bets on all 7 rows.
 * - Level 4 adds bets on Column 3, covering all inside numbers and streets for those 7 rows.
 * - Levels 5-8 increase and double the units systematically according to the progression.
 * - A win is triggered if the rolled number falls within the active betting layout of the level.
 * * The Full Bet Progression:
 * - Level 1: 7 numbers in Col 1 (1 unit each). Total = 7 units.
 * - Level 2: 7 numbers in Col 1 (1 unit each) + 7 numbers in Col 2 (1 unit each). Total = 14 units.
 * - Level 3: 7 numbers in Col 1 & 2 (1 unit each) + 7 streets (2 units each). Total = 28 units.
 * - Level 4: 7 numbers in Col 1, 2, & 3 (1 unit each) + 7 streets (4 units each). Total = 49 units.
 * - Level 5: 7 numbers in Col 1, 2, & 3 (2 units each) + 7 streets (8 units each). Total = 98 units.
 * - Level 6: 7 numbers in Col 1, 2, & 3 (2 units each) + 7 streets (12 units each). Total = 126 units.
 * - Level 7: 7 numbers in Col 1, 2, & 3 (4 units each) + 7 streets (24 units each). Total = 252 units.
 * - Level 8: 7 numbers in Col 1, 2, & 3 (8 units each) + 7 streets (48 units each). Total = 504 units.
 * * Progression Hierarchy:
 * - On Loss: Advance to the next level (1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8). If Level 8 loses, reset to Level 1.
 * - On Win: If the current bankroll reaches or exceeds the session's peak profit, fully reset to Level 1 and shuffle positions.
 * Otherwise, drop down exactly 1 level.
 * * The Goal:
 * - Reach a new session peak profit and safely reset or cash out.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const U = config.betLimits.min;

    // Helper to determine if the last spin was a win under the previous layout
    function checkLastSpinWin(lastNumber, currentState) {
        if (lastNumber === 0) return false;
        const col = ((lastNumber - 1) % 3) + 1;
        const row = Math.floor((lastNumber - 1) / 3);
        const rowMatch = (row >= currentState.startRow && row < currentState.startRow + 7);
        if (!rowMatch) return false;

        if (currentState.level === 1) {
            return col === currentState.col1;
        } else if (currentState.level === 2) {
            return col === currentState.col1 || col === currentState.col2;
        } else {
            // Levels 3 to 8 have street bets covering all 3 columns for these rows
            return true;
        }
    }

    // Helper to pick a new layout sequence
    function resetLayout(currentState) {
        currentState.startRow = Math.floor(Math.random() * 6); // 0 to 5 allows 7 consecutive rows up to index 11
        const cols = [1, 2, 3];
        for (let i = cols.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = cols[i];
            cols[i] = cols[j];
            cols[j] = temp;
        }
        currentState.col1 = cols[0];
        currentState.col2 = cols[1];
        currentState.col3 = cols[2];
    }

    // Initialize state on first spin
    if (state.level === undefined) {
        state.level = 1;
        state.peakProfit = bankroll;
        resetLayout(state);
    }

    // Process win/loss tracking from previous spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        const isWin = checkLastSpinWin(lastNumber, state);

        if (isWin) {
            if (bankroll >= state.peakProfit) {
                state.level = 1;
                resetLayout(state);
            } else {
                state.level = Math.max(1, state.level - 1);
            }
        } else {
            state.level += 1;
            if (state.level > 8) {
                state.level = 1;
                resetLayout(state);
            }
        }
    }

    // Keep peak profit tracking updated
    if (bankroll > state.peakProfit) {
        state.peakProfit = bankroll;
    }

    const bets = [];

    // Helper to safely construct and push inside bets with limits clamping
    function addInsideBet(type, value, amount) {
        const clampedAmount = Math.min(Math.max(amount, config.betLimits.min), config.betLimits.max);
        bets.push({ type: type, value: value, amount: clampedAmount });
    }

    // Generate active rows sequence
    const activeRows = [];
    for (let i = 0; i < 7; i++) {
        activeRows.push(state.startRow + i);
    }

    const lvl = state.level;

    // Build the specific bet array based on current level configuration
    if (lvl === 1) {
        activeRows.forEach(r => {
            addInsideBet('number', r * 3 + state.col1, U * 1);
        });
    } else if (lvl === 2) {
        activeRows.forEach(r => {
            addInsideBet('number', r * 3 + state.col1, U * 1);
            addInsideBet('number', r * 3 + state.col2, U * 1);
        });
    } else if (lvl === 3) {
        activeRows.forEach(r => {
            addInsideBet('number', r * 3 + state.col1, U * 1);
            addInsideBet('number', r * 3 + state.col2, U * 1);
            addInsideBet('street', r * 3 + 1, U * 2);
        });
    } else if (lvl === 4) {
        activeRows.forEach(r => {
            addInsideBet('number', r * 3 + state.col1, U * 1);
            addInsideBet('number', r * 3 + state.col2, U * 1);
            addInsideBet('number', r * 3 + state.col3, U * 1);
            addInsideBet('street', r * 3 + 1, U * 4);
        });
    } else if (lvl === 5) {
        activeRows.forEach(r => {
            addInsideBet('number', r * 3 + state.col1, U * 2);
            addInsideBet('number', r * 3 + state.col2, U * 2);
            addInsideBet('number', r * 3 + state.col3, U * 2);
            addInsideBet('street', r * 3 + 1, U * 8);
        });
    } else if (lvl === 6) {
        activeRows.forEach(r => {
            addInsideBet('number', r * 3 + state.col1, U * 2);
            addInsideBet('number', r * 3 + state.col2, U * 2);
            addInsideBet('number', r * 3 + state.col3, U * 2);
            addInsideBet('street', r * 3 + 1, U * 12);
        });
    } else if (lvl === 7) {
        activeRows.forEach(r => {
            addInsideBet('number', r * 3 + state.col1, U * 4);
            addInsideBet('number', r * 3 + state.col2, U * 4);
            addInsideBet('number', r * 3 + state.col3, U * 4);
            addInsideBet('street', r * 3 + 1, U * 24);
        });
    } else if (lvl === 8) {
        activeRows.forEach(r => {
            addInsideBet('number', r * 3 + state.col1, U * 8);
            addInsideBet('number', r * 3 + state.col2, U * 8);
            addInsideBet('number', r * 3 + state.col3, U * 8);
            addInsideBet('street', r * 3 + 1, U * 48);
        });
    }

    return bets;
}