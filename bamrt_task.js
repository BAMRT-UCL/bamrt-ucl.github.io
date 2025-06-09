// ─── BAMRT Task Script v60 Complete ───

// 1) Global launcher
window.startBAMRT = function(participantId, yearGroup) {
  try {
    console.log(`[BAMRT WRAPPER_ver43] Called with participantId: ${participantId}, yearGroup: ${yearGroup}`);
    if (!participantId || !yearGroup) {
      console.error('[BAMRT WRAPPER] ❌ Missing participantId or yearGroup');
    }
    internalStartBAMRT(participantId, yearGroup);
  } catch (err) {
    console.error('[BAMRT WRAPPER] ❌ Error launching BAMRT:', err);
    document.body.innerHTML = `<h2>Something went wrong starting the BAMRT task.</h2><p>${err.message}</p>`;
  }
};
// Alias for controller compatibility
window.bamrtInternalStart = window.startBAMRT;

function internalStartBAMRT(participantId, yearGroup) {
  console.log(`[BAMRT v010] Starting task for ${participantId}, Year ${yearGroup}`);

  let trials = [];
  let availableIndices = [];
  let trialHistory = [];
  let currentIndex = -1;
  let trialStartTime = 0;

  const discrimination = 1.3;
  const guessRate      = 0.5;   // for a 2-choice task, g=0.5
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
  // 3-parameter logistic: P = g + (1–g)·σ(D(θ–b))
  const L = 1 / (1 + Math.exp(-discrimination * (th - b)));
  return guessRate + (1 - guessRate) * L;
}

function fisherInfo(th, b) {
  // raw logistic
  let L = 1 / (1 + Math.exp(-discrimination * (th - b)));
  // clamp to [ε, 1−ε]
  const eps = 1e-6;
  L = Math.min(Math.max(L, eps), 1 - eps);

  // 3PL
  const P     = guessRate + (1 - guessRate) * L;
  const dPdTh = (1 - guessRate) * discrimination * L * (1 - L);

  return (dPdTh * dPdTh) / (P * (1 - P));
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
      <style>
        #taskContainer { padding:1em; }
        #trial-container {
          text-align:center;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 1em;
        }
        #progressBar { width:80%; height:20px; margin:1em auto; background:#ddd; }
        #progressFill { height:100%; width:0%; background:#4caf50; }
        /* Always side-by-side on wide screens */
        #trial-container img {
          display: inline-block;
          max-width:45%;
          margin:0.5em;
          height:auto;
        }
        /* Buttons full row below images */
        .button-container {
          flex: 0 0 100%;
          text-align: center;
          margin:1em 0;
        }
        .button-container button {
          margin:0 1em;
          padding:0.5em 1em;
        }
        /* Trial info full row */
        #trial-container p {
          flex: 0 0 100%;
          margin:0.2em 0;
        }
      </style>
      <div id="taskContainer">
        <div id="trial-container">
          <div id="progressBar"><div id="progressFill"></div></div>
          <img id="image1" src="" alt="Base Image" />
          <img id="image2" src="" alt="Comparison Image" />
          <div class="button-container">
            <button id="sameButton">Same</button>
            <button id="differentButton">Mirrored</button>
          </div>
          <p>Trial: <span id="trialNumber"></span></p>
          <p>Difficulty: <span id="difficultyNumber"></span></p>
        </div>
      </div>`;
    document.getElementById('sameButton').onclick      = () => submitResponse(true);
    document.getElementById('differentButton').onclick = () => submitResponse(false);
  }

  function computeDifficulty(tr) {
    if (tr.dimensionality === "2D") return 10 + tr.shape + 0.1*(tr.z||0) + (tr.mirrored?4:0);
    if (tr.dimensionality === "3D") return 19.2 + 1.8*tr.shape + 0.2*(tr.z||0) + (tr.mirrored?10:0);
    if (tr.dimensionality === "4D") {
      let base4D = tr.shape===4?30:24+tr.shape;
      return base4D + 0.25*((tr.x||0)+(tr.z||0)) + (tr.mirrored?15:0);
    }
    throw new Error("Unsupported dimensionality: " + tr.dimensionality);
  }

  function fetchTrialsAndStart() {
    fetch("bamrt_trials.json")
      .then(r => r.json())
      .then(data => {
        trials = data;
        trials.forEach(tr => tr.difficulty = computeDifficulty(tr));
        console.log("[BAMRT] difficulty values recomputed.");
        availableIndices = [...trials.keys()];
        initializeTask();
      })
      .catch(err => { console.error("Failed to load trials", err); alert("Failed to load trials."); });
  }
  function initializeTask() {
    priorMean = ["1","2"].includes(yearGroup)?15:(["5","6"].includes(yearGroup)?50:30);
    posterior  = normalize(thetaGrid.map(th => normalPDF(th, priorMean, priorSD)));
    trialHistory = [];
    availableIndices = [...trials.keys()];
    showTrial();
  }

  function selectNextIndex() {
    if (!availableIndices.length) return -1;

    const mean     = posteriorMean();
    const variance = posteriorVariance();
    const sd       = Math.sqrt(variance);

    // VERY gentle for the first few trials
    const earlyBoostTrials = 3;
    const smallLambda      = 0.1;   // shrink that first jump
    const normalLambda     = 0.5;
    const lambda = trialHistory.length < earlyBoostTrials
      ? smallLambda
      : normalLambda;

    const targetTheta = mean + lambda * sd;

    // pick the item with max FisherInfo at targetTheta
    let bestIdx    = availableIndices[0];
    let bestFisher = fisherInfo(targetTheta, trials[bestIdx].difficulty);
    for (let j = 1; j < availableIndices.length; j++) {
      const idx = availableIndices[j];
      const f   = fisherInfo(targetTheta, trials[idx].difficulty);
      if (f > bestFisher) {
        bestFisher = f;
        bestIdx    = idx;
      }
    }
    return bestIdx;
  }

  function renderTrial(idx) {
    const t = trials[idx];
    document.getElementById("trialNumber").textContent     = trialHistory.length + 1;
    document.getElementById("difficultyNumber").textContent = t.difficulty.toFixed(2);
    document.getElementById("image1").src = `images/${t.base_image}`;
    document.getElementById("image2").src = `images/${t.comparison_image}`;
    document.getElementById("progressFill").style.width = `${Math.round((trialHistory.length/ MAX_TRIALS)*100)}%`;
    trialStartTime = Date.now();
  }

  function showTrial() {
    const varian = posteriorVariance();
    if (trialHistory.length < 30) {
      currentIndex = selectNextIndex(); if (currentIndex < 0) return endTask();
      renderTrial(currentIndex); return;
    }
    if (trialHistory.length >= 30 && varian < 5) return endTask();
    if (trialHistory.length >= MAX_TRIALS) return endTask();
    currentIndex = selectNextIndex(); if (currentIndex < 0) return endTask();
    renderTrial(currentIndex);
  }

  function submitResponse(chosenSame) {
    if (currentIndex < 0) return;
    const t = trials[currentIndex];
    const correct = (chosenSame === !t.mirrored);
    updatePosterior(correct, t.difficulty);
    trialHistory.push({
      trial:   trialHistory.length + 1,
      base:    t.base_image,
      comp:    t.comparison_image,
      correct: correct ? "Yes" : "No",
      difficulty: t.difficulty,
      theta:    posteriorMean().toFixed(2),
      variance: posteriorVariance().toFixed(2),
      info:     expectedFisherInfo(currentIndex).toFixed(2),
      rt:       ((Date.now() - trialStartTime)/1000).toFixed(2)
    });
    availableIndices = availableIndices.filter(i => i !== currentIndex);
    showTrial();
  }

  function endTask() {
    document.body.innerHTML = '<h2>BAMRT Task Complete. Uploading results...</h2>';
    if (typeof window.controllerBAMRTCallback === 'function') window.controllerBAMRTCallback(trialHistory);
  }

  setupDOM();                    // ← DOM is now live


  // ── keyboard shortcuts for “s”=Same, “m”=Mirrored ──
  window.addEventListener('keydown', e => {
    // don’t hijack typing if they ever add inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 's' || e.key === 'S') {
      document.getElementById('sameButton').click();
    }
    if (e.key === 'm' || e.key === 'M') {
      document.getElementById('differentButton').click();
    }
  });

  // ── PRACTICE BLOCK (must run *before* loading real trials) ──
  const practiceTrials = [
    { base_image: "2D_1_X0_Y0_Z0.jpg", comparison_image: "2D_1_X0_Y0_Z10R.jpg", mirrored: true },
    { base_image: "2D_1_X0_Y0_Z0.jpg", comparison_image: "2D_1_X0_Y0_Z20.jpg",   mirrored: false },
    { base_image: "2D_1_X0_Y0_Z0.jpg", comparison_image: "2D_1_X0_Y0_Z130.jpg", mirrored: false }
  ];
  let practiceIdx = 0;

  function runPractice() {
    const t = practiceTrials[practiceIdx];
    document.getElementById("trialNumber").textContent     = `Practice ${practiceIdx+1}`;
    document.getElementById("difficultyNumber").textContent = "";
    document.getElementById("image1").src                  = `images/${t.base_image}`;
    document.getElementById("image2").src                  = `images/${t.comparison_image}`;
  }

  function handlePracticeResponse(chosenSame) {
    const t = practiceTrials[practiceIdx];
    if (chosenSame !== !t.mirrored) {
      alert(
        "Let’s check your understanding of the task.\n\n" +
        "Ask the experimenter for help, then click OK to stop."
      );
      return;  // halts entirely
    }
    practiceIdx++;
    if (practiceIdx < practiceTrials.length) {
      runPractice();
    } else {
  // all practice correct → restore handlers and **then** load+start real trials
  document.getElementById('sameButton').onclick      = () => submitResponse(true);
  document.getElementById('differentButton').onclick = () => submitResponse(false);
  fetchTrialsAndStart();
}

  }

  // wire the buttons for practice
  document.getElementById('sameButton').onclick      = () => handlePracticeResponse(true);
  document.getElementById('differentButton').onclick = () => handlePracticeResponse(false);

    runPractice();
// ── END PRACTICE BLOCK ──

// (real trials will start only after practice completes)
}
