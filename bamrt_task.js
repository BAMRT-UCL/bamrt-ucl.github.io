window.startBAMRT = function(participantId, yearGroup) {
    try {
        console.log(`[BAMRT WRAPPER_ver27] Called with participantId: ${participantId}, yearGroup: ${yearGroup}`);
        if (!participantId || !yearGroup) {
            console.error('[BAMRT WRAPPER] ❌ Missing participantId or yearGroup');
        }
        internalStartBAMRT(participantId, yearGroup);
    } catch (err) {
        console.error('[BAMRT WRAPPER] ❌ Error launching BAMRT:', err);
        document.body.innerHTML = `<h2>Something went wrong starting the BAMRT task.</h2><p>${err.message}</p>`;
    }
};


function internalStartBAMRT(participantId, yearGroup) {

    console.log(`[BAMRT v010] Starting task for ${participantId}, Year ${yearGroup}`);

    let trials = [];
    let availableIndices = [];
    let trialHistory = [];
    let currentIndex = -1;
    let trialStartTime = 0;

    const discrimination = 1.5;
    const thetaGrid = Array.from({ length: 1501 }, (_, i) => i * 0.1);
    let posterior = [];
    let priorMean = 30;
    let priorSD = 15;
    const MAX_TRIALS = 50;

    function normalPDF(x, mean, sd) {
        const z = (x - mean) / sd;
        return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
    }

    function normalize(arr) {
        const sum = arr.reduce((a, b) => a + b, 0);
        return arr.map(x => x / sum);
    }

    function irtProbability(th, b) {
        return 1 / (1 + Math.exp(-discrimination * (th - b)));
    }

    function fisherInfo(th, b) {
        const p = irtProbability(th, b);
        return discrimination ** 2 * p * (1 - p);
    }

    function expectedFisherInfo(idx) {
        const b = trials[idx].difficulty;
        return thetaGrid.reduce((sum, th, i) => sum + posterior[i] * fisherInfo(th, b), 0);
    }

    function updatePosterior(correct, difficulty) {
        const likelihoods = thetaGrid.map(th => {
            const p = irtProbability(th, difficulty);
            return correct ? p : (1 - p);
        });
        posterior = normalize(posterior.map((p, i) => p * likelihoods[i]));
    }

    function posteriorMean() {
        return thetaGrid.reduce((sum, th, i) => sum + th * posterior[i], 0);
    }

    function posteriorVariance() {
        const mean = posteriorMean();
        return thetaGrid.reduce((sum, th, i) => sum + posterior[i] * (th - mean) ** 2, 0);
    }

    function setupDOM() {
    document.body.innerHTML = `
        <div id="taskContainer">
            <div id="trial-container">
                <div id="progressBar" style="width:80%;height:20px;margin:1em auto;background:#ddd;">
                    <div id="progressFill" style="height:100%;width:0%;background:#4caf50;"></div>
                </div>

                <img id="image1" src="" alt="Base Image" />
                <img id="image2" src="" alt="Comparison Image" />

                <div class="button-container">
                    <button id="sameButton">Same</button>
                    <button id="differentButton">Different</button>
                </div>

                <p>Trial: <span id="trialNumber"></span></p>
                <p>Difficulty: <span id="difficultyNumber"></span></p>
            </div>
        </div>
    `;

        document.getElementById('sameButton').onclick = () => submitResponse(true);
        document.getElementById('differentButton').onclick = () => submitResponse(false);
    }

/**
 * computeDifficulty(tr) returns a numeric difficulty for ANY trial object,
 * based on these fields in bamrt_trials.json:
 *   tr.dimensionality  → "2D" | "3D" | "4D"
 *   tr.shape           → integer
 *   tr.x, tr.y, tr.z   → rotation angles (in degrees 0–180)
 *   tr.mirrored        → boolean
 *
 * Once you call this, you no longer need the JSON’s hard-wired "difficulty" values.
 * To tweak scoring, just adjust the numbers inside this function.
 */
function computeDifficulty(tr) {
  // ── 2D: keep these very low so 2D is always easiest. ──
  if (tr.dimensionality === "2D") {
    const shape = tr.shape;          // (e.g. 1..5)
    const angleZ = tr.z || 0;        // rotation about the 2D plane
    const mirrorBonus = tr.mirrored ? 4 : 0;
    // “2D base” = 10 + shape, rotation cost = 0.1·z
    return 10 + shape + 0.1 * angleZ + mirrorBonus;
  }

  // ── 3D: the old linear fit you already have in JSON. ──
  if (tr.dimensionality === "3D") {
    const shape = tr.shape;         // 1..10
    const angleZ = tr.z || 0;       // single-plane rotation
    const mirrorBonus = tr.mirrored ? 10 : 0;
    // 19.2 + 1.8·shape + 0.2·z + (mirrored?10:0)
    return 19.2 + 1.8 * shape + 0.2 * angleZ + mirrorBonus;
  }

  // ── 4D: slightly lower the rotation weight so “easy 4D” fall below mid-range 3D. ──
  if (tr.dimensionality === "4D") {
    const shape = tr.shape;                // 1..10
    const angle1 = tr.x || 0;              // first plane’s rotation
    const angle2 = tr.z || 0;              // second plane’s rotation
    const mirrorBonus = tr.mirrored ? 15 : 0;

    // Force “4D shape 4 @ (0,0)” = 30 (so it matches “3D shape 6 @ 0”).
    // All other shapes get “base4D = 24 + shapeID,” which is slightly lower
    // than 26+shapeID used previously. Then rotation-weight R4D=0.25.
    let base4D;
    if (shape === 4) {
      base4D = 30;
    } else {
      base4D = 24 + shape;
      // so “4D shape 1 @ (0,0)” = 25, and at (30,30) it becomes 40 instead of 46.
    }

    // combine base + rotation cost + mirrored
    return base4D + 0.25 * (angle1 + angle2) + mirrorBonus;
  }

  throw new Error("Unsupported dimensionality: " + tr.dimensionality);
}


	function fetchTrialsAndStart() {
  fetch("bamrt_trials.json")
    .then(r => r.json())
    .then(data => {
      trials = data;

      // ─── Overwrite each trial’s difficulty with computeDifficulty(tr) ───
      trials.forEach(tr => {
        tr.difficulty = computeDifficulty(tr);
      });
      console.log("[BAMRT] difficulty values recomputed via formula.");

      availableIndices = [...trials.keys()];
      initializeTask();
    })
    .catch(err => {
      console.error("❌ Failed to load trial data", err);
      alert("Failed to load trial data.");
    });
}


    function initializeTask() {
        priorMean = ["1", "2"].includes(yearGroup) ? 15 : ["5", "6"].includes(yearGroup) ? 50 : 30;
        posterior = normalize(thetaGrid.map(th => normalPDF(th, priorMean, priorSD)));

        trialHistory = [];
        availableIndices = [...trials.keys()];
        currentIndex = -1;

        showTrial();
    }

    /**
 * Return the index of the available item that best matches a "boosted" theta.
 * We pick a λ > 0 (e.g. 0.5 or 1.0) so that targetTheta = posteriorMean + λ·sqrt(posteriorVariance).
 * Then we simply choose the item whose single‐theta FisherInfo(targetTheta, b_i) is maximal.
 */
function selectNextIndex() {
  if (!availableIndices.length) return -1;

  // 1) compute "target theta" above the current estimate
  const mean   = posteriorMean();
  const variance = posteriorVariance();
  const sd     = Math.sqrt(variance);

  const lambda = 0.5;  // ↔ push half an SD above the mean; adjust up/down as needed
  const targetTheta = mean + lambda * sd;

  // 2) find the available idx whose fisherInfo(targetTheta, b_i) is largest
  let bestIdx     = availableIndices[0];
  let bestFisher  = fisherInfo(targetTheta, trials[bestIdx].difficulty);

  for (let j = 1; j < availableIndices.length; j++) {
    const idx       = availableIndices[j];
    const b         = trials[idx].difficulty;
    const thisFisher = fisherInfo(targetTheta, b);
    if (thisFisher > bestFisher) {
      bestFisher = thisFisher;
      bestIdx    = idx;
    }
  }
  return bestIdx;
}


function showTrial() {
  // ── 1) If posterior is already narrow enough, end early ──
  if (posteriorVariance() < 5) {
    console.log("[BAMRT] Posterior variance < 5 → ending early (confident).");
    return endTask();
  }

  // ── 2) If we’ve reached MAX_TRIALS, end ──
  if (trialHistory.length >= MAX_TRIALS) {
    return endTask();
  }

  // ── 3) Debug: print current posterior mean/variance ──
  const mean     = posteriorMean();
  const variance = posteriorVariance();
  const sd       = Math.sqrt(variance);
  console.log("──── NEW TRIAL ────");
  console.log(
    "Posterior mean:",  mean.toFixed(2),
    "| Variance:",       variance.toFixed(2)
  );

  // ── 4) Debug: compute expected Fisher info for each remaining index ──
  const infos = availableIndices.map(i => ({
    idx:  i,
    diff: trials[i].difficulty.toFixed(2),
    info: expectedFisherInfo(i).toFixed(3)
  }));
  infos.sort((a, b) => b.info - a.info);
  console.log(
    "Top 5 candidates by expected Fisher info:",
    infos.slice(0, 5)
  );

  // ── 5) Compute “targetTheta” to push upward (λ=0.5) ──
  const lambda = 0.5;
  const targetTheta = mean + lambda * sd;

  // ── 6) Ceiling check: if targetTheta exceeds the hardest item left, stop as top score ──
  const maxRemainingDiff = Math.max(
    ...availableIndices.map(i => trials[i].difficulty)
  );
  if (targetTheta >= maxRemainingDiff - 0.1) {
    console.log(
      `[BAMRT] targetTheta (${targetTheta.toFixed(2)}) ≥ ` +
      `maxRemainingDiff (${maxRemainingDiff.toFixed(2)}) → Ending with top score.`
    );
    return endTask();
  }

  // ── 7) Zero-info check: if all remaining items have negligible info, end ──
  // Compute the maximum expected-Fisher-info among remaining items
  const maxInfo = Math.max(
    ...availableIndices.map(i => expectedFisherInfo(i))
  );
  // If even the best remaining item has info < 0.001, stop here
  if (maxInfo < 1e-3) {
    console.log(
      `[BAMRT] All remaining items have near-zero info ` +
      `under θ≈${mean.toFixed(2)} (maxInfo=${maxInfo.toFixed(6)}). Ending test.`
    );
    return endTask();
  }

  // ── 8) Otherwise, pick the next item via boosted Fisher (selectNextIndex) ──
  currentIndex = selectNextIndex();
  if (currentIndex === -1) {
    // No items left; end the task
    return endTask();
  }

  // ── 9) Display the chosen trial on screen ──
  const t = trials[currentIndex];
  document.getElementById("trialNumber").textContent     = trialHistory.length + 1;
  document.getElementById("difficultyNumber").textContent = t.difficulty.toFixed(2);
  document.getElementById("image1").src                   = `images/${t.base_image}`;
  document.getElementById("image2").src                   = `images/${t.comparison_image}`;

  const percent = Math.round((trialHistory.length / MAX_TRIALS) * 100);
  document.getElementById("progressFill").style.width = `${percent}%`;

  trialStartTime = Date.now();
}



    function submitResponse(chosenSame) {
        if (currentIndex === -1) return;

        const t = trials[currentIndex];
        const isCorrect = (chosenSame === !t.mirrored);
        console.log(`🧪 Trial ${trialHistory.length + 1} — Chose: ${chosenSame}, Mirrored: ${t.mirrored}, Correct: ${isCorrect}`);

        const responseTime = (Date.now() - trialStartTime) / 1000;

        updatePosterior(isCorrect, t.difficulty);

        trialHistory.push({
            trial: trialHistory.length + 1,
            base: t.base_image,
            comp: t.comparison_image,
            correct: isCorrect ? "Yes" : "No",
            difficulty: t.difficulty,
            theta: posteriorMean().toFixed(2),
            variance: posteriorVariance().toFixed(2),
            info: expectedFisherInfo(currentIndex).toFixed(2),
            rt: responseTime.toFixed(2)
        });

        availableIndices = availableIndices.filter(i => i !== currentIndex);
        showTrial();
    }

    function endTask() {
        console.log(`[BAMRT v008] Task completed, uploading results.`);
        document.body.innerHTML = '<h2>BAMRT Task Complete. Uploading results...</h2>';
        if (typeof window.controllerBAMRTCallback === 'function') {
            window.controllerBAMRTCallback(trialHistory);
        } else {
            console.warn('[BAMRT v008] No controller callback found for BAMRT');
        }
    }

    setupDOM();
    fetchTrialsAndStart();
}

// ✅ Only register global launcher — don’t auto-run
window.bamrtInternalStart = startBAMRT;
