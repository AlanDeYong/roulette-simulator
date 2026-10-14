/**
 * Strategy: The Grandmaster Protocol (Randomized Non-Overlapping Sets Mod)
 * Source: https://youtu.be/J4-JBIXfc-g
 * Channel: The Lucky Felt (Todd Hoover)
 *
 * MODIFICATIONS:
 * 1. Set Definition: Each set = 1 Corner bet + 4 straight-up numbers of that corner.
 * 2. Randomized Selection: Sets are chosen at random when initialized/needed.
 * 3. Mutual Exclusivity: Sets never share numbers with any other active set.
 * 4. Non-Overlapping Splits: Split bets are selected at random from board numbers
 *    that do not belong to any chosen set.
 * 5. Rules, progressions (1 -> 2 -> 3 -> 4 -> Chess Phase), doubling, and
 *    tactical piece sacrifices remain identical.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Helper: return all valid roulette corners
  const getAllPossibleCorners = () => {
    const list = [];
    for (let col = 0; col < 11; col++) {
      const base = col * 3;
      // Row 1 corner: [base+1, base+2, base+4, base+5]
      list.push({ corner: base + 1, numbers: [base + 1, base + 2, base + 4, base + 5] });
      // Row 2 corner: [base+2, base+3, base+5, base+6]
      list.push({ corner: base + 2, numbers: [base + 2, base + 3, base + 5, base + 6] });
    }
    return list;
  };

  // Helper: check if two number arrays share any number
  const hasOverlap = (arr1, arr2) => arr1.some((n) => arr2.includes(n));

  // Helper: generate 4 mutually non-overlapping sets and 2 non-overlapping splits
  const generateRandomBoardSetup = () => {
    const allCorners = getAllPossibleCorners();
    // Shuffle corners
    const shuffled = [...allCorners].sort(() => Math.random() - 0.5);

    const selectedSets = [];
    const usedNumbers = new Set();

    for (const c of shuffled) {
      const overlaps = c.numbers.some((num) => usedNumbers.has(num));
      if (!overlaps) {
        selectedSets.push(c);
        c.numbers.forEach((num) => usedNumbers.add(num));
      }
      if (selectedSets.length === 4) break;
    }

    // Build all possible legal adjacent splits on the layout that do not touch usedNumbers
    const candidateSplits = [];
    for (let n = 1; n <= 36; n++) {
      // Horizontal neighbor (n + 3)
      if (n + 3 <= 36 && !usedNumbers.has(n) && !usedNumbers.has(n + 3)) {
        candidateSplits.push([n, n + 3]);
      }
      // Vertical neighbor (n + 1, unless crossing column edge)
      if (n % 3 !== 0 && !usedNumbers.has(n) && !usedNumbers.has(n + 1)) {
        candidateSplits.push([n, n + 1]);
      }
    }

    // Shuffle and pick 2 non-overlapping splits
    const shuffledSplits = candidateSplits.sort(() => Math.random() - 0.5);
    const selectedSplits = [];
    const splitUsed = new Set();

    for (const sp of shuffledSplits) {
      if (!splitUsed.has(sp[0]) && !splitUsed.has(sp[1])) {
        selectedSplits.push(sp);
        splitUsed.add(sp[0]);
        splitUsed.add(sp[1]);
      }
      if (selectedSplits.length === 2) break;
    }

    // Fallback if layout density left fewer than 2 standard inside splits
    if (selectedSplits.length < 1) selectedSplits.push([0, 2]);
    if (selectedSplits.length < 2) selectedSplits.push([0, 3]);

    return { selectedSets, selectedSplits };
  };

  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.startBankroll = bankroll;
    state.targetProfitUnits = 100;
    state.step = 1;
    state.inChessPhase = false;
    state.highestBankroll = bankroll;
    state.unit = config.betLimits.min;
    state.sacrificeIndex = 0;

    const setup = generateRandomBoardSetup();
    state.sets = setup.selectedSets;
    state.splits = setup.selectedSplits;
  }

  // 2. Evaluate previous spin outcomes and progression
  if (spinHistory && spinHistory.length > 0) {
    const profit = bankroll - state.startBankroll;
    const targetProfit = state.targetProfitUnits * state.unit;

    if (profit >= targetProfit || (state.inChessPhase && bankroll > state.startBankroll)) {
      // Reached goal or recovered: reset board setup and return to Step 1
      state.step = 1;
      state.inChessPhase = false;
      state.sacrificeIndex = 0;
      state.startBankroll = bankroll;

      const setup = generateRandomBoardSetup();
      state.sets = setup.selectedSets;
      state.splits = setup.selectedSplits;
    } else if (!state.inChessPhase) {
      if (bankroll < state.highestBankroll) {
        if (state.step < 4) {
          state.step += 1;
        } else {
          // Transition into Phase 2
          state.inChessPhase = true;
          state.sacrificeIndex = 0;
        }
      } else {
        // Partial win brought to peak: reset to Step 1
        state.step = 1;
        const setup = generateRandomBoardSetup();
        state.sets = setup.selectedSets;
        state.splits = setup.selectedSplits;
      }
    } else {
      // Inside Chess Phase: advance tactical piece sacrifice
      state.sacrificeIndex += 1;
      if (state.sacrificeIndex > 6) {
        // Sacrifices exhausted: restart cycle
        state.step = 1;
        state.inChessPhase = false;
        state.sacrificeIndex = 0;
        state.startBankroll = bankroll;

        const setup = generateRandomBoardSetup();
        state.sets = setup.selectedSets;
        state.splits = setup.selectedSplits;
      }
    }
  }

  if (bankroll > state.highestBankroll) {
    state.highestBankroll = bankroll;
  }

  // 3. Assemble bets
  const bets = [];
  const unit = state.unit;

  const clampBet = (amt) => {
    let clamped = Math.max(amt, config.betLimits.min);
    clamped = Math.min(clamped, config.betLimits.max);
    return clamped;
  };

  const sets = state.sets;
  const splits = state.splits;

  if (!state.inChessPhase) {
    // PHASE 1: Board Development
    if (state.step === 1) {
      // Step 1: 1 random set @ 1 unit (5 bets)
      const s = sets[0];
      bets.push({ type: 'corner', value: s.corner, amount: clampBet(unit) });
      s.numbers.forEach((num) => bets.push({ type: 'number', value: num, amount: clampBet(unit) }));
    } else if (state.step === 2) {
      // Step 2: 2 non-overlapping sets @ 1 unit (10 bets)
      for (let i = 0; i < 2; i++) {
        const s = sets[i];
        bets.push({ type: 'corner', value: s.corner, amount: clampBet(unit) });
        s.numbers.forEach((num) => bets.push({ type: 'number', value: num, amount: clampBet(unit) }));
      }
    } else if (state.step === 3) {
      // Step 3: 3 non-overlapping sets + 1 non-overlapping split @ 2 units each (16 bets * 2 = 32 units)
      const chipSize = clampBet(unit * 2);
      for (let i = 0; i < 3; i++) {
        const s = sets[i];
        bets.push({ type: 'corner', value: s.corner, amount: chipSize });
        s.numbers.forEach((num) => bets.push({ type: 'number', value: num, amount: chipSize }));
      }
      bets.push({ type: 'split', value: splits[0], amount: chipSize });
    } else if (state.step === 4) {
      // Step 4: 4 non-overlapping sets + 2 non-overlapping splits @ 4 units each (22 bets * 4 = 88 units)
      const chipSize = clampBet(unit * 4);
      for (let i = 0; i < 4; i++) {
        const s = sets[i];
        bets.push({ type: 'corner', value: s.corner, amount: chipSize });
        s.numbers.forEach((num) => bets.push({ type: 'number', value: num, amount: chipSize }));
      }
      bets.push({ type: 'split', value: splits[0], amount: chipSize });
      bets.push({ type: 'split', value: splits[1], amount: chipSize });
    }
  } else {
    // PHASE 2: Chess Phase (Tactical Decay @ 4 units per position)
    const chipSize = clampBet(unit * 4);

    const activeCorners = [sets[0].corner, sets[1].corner, sets[2].corner, sets[3].corner];
    const activeSplits = [splits[0], splits[1]];
    const activeNumbers = [];
    sets.forEach((s) => activeNumbers.push(...s.numbers));

    // Order of sacrifices:
    // Sacrifice 1: Split 1
    // Sacrifice 2: Split 2
    // Sacrifice 3-6: Straight-up numbers from set 4
    if (state.sacrificeIndex >= 1) {
      activeSplits.splice(0, 1);
    }
    if (state.sacrificeIndex >= 2) {
      activeSplits.splice(0, 1);
    }
    if (state.sacrificeIndex >= 3) {
      activeNumbers.pop();
    }
    if (state.sacrificeIndex >= 4) {
      activeNumbers.pop();
    }
    if (state.sacrificeIndex >= 5) {
      activeNumbers.pop();
    }
    if (state.sacrificeIndex >= 6) {
      activeNumbers.pop();
    }

    activeCorners.forEach((cornerVal) => {
      bets.push({ type: 'corner', value: cornerVal, amount: chipSize });
    });
    activeSplits.forEach((splitVal) => {
      bets.push({ type: 'split', value: splitVal, amount: chipSize });
    });
    activeNumbers.forEach((num) => {
      bets.push({ type: 'number', value: num, amount: chipSize });
    });
  }

  // 4. Verify required bankroll
  const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
  if (bankroll < totalBet) {
    return [];
  }

  return bets;
}