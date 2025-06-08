// ─── BAMRT Task Script v42 (Base PC side-by-side, mobile stack CSS) ───

// 1) Global launcher
window.startBAMRT = function(participantId, yearGroup) {
    try {
        console.log(`[BAMRT WRAPPER_v42] Called with participantId: ${participantId}, yearGroup: ${yearGroup}`);
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
    const thetaGrid = Array.from({ length: 1501 }, (_, i) => i * 0.1);
    let posterior = [];
    let priorMean = 30;
    let priorSD = 15;
    const MAX_TRIALS = 50;

    // Utility functions
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

    // DOM setup: side-by-side on PC, stack under 600px
    function setupDOM() {
    document.body.innerHTML = `
        <style>
          #taskContainer { padding:1em; box-sizing:border-box; }
          #trial-container {
            display: flex;
            flex-wrap: nowrap;
            justify-content: center;
            align-items: center;
            gap: 1em;
          }
          #trial-container img {
            width: calc(50% - 1em);
            max-width: calc(50% - 1em);
            height: auto;
          }
          /* Stack vertically only on small screens */
          @media (max-width: 600px) {
            #trial-container {
              flex-direction: column;
            }
            #trial-container img {
              width: 100%;
              max-width: 100%;
            }
          }
          #progressBar { width:80%; height:20px; margin:1em auto; background:#ddd; }
          #progressFill { height:100%; width:0%; background:#4caf50; }
          .button-container { display:flex; gap:1em; justify-content:center; margin:1em 0; }
          .button-container button { padding:0.8em 1.2em; font-size:1rem; }
        </style>
        <div id="taskContainer">
          <div id="trial-container">
            <div id="progressBar"><div id="progressFill"></div></div>
            <img id="image1" src="" alt="Base Image" />
            <img id="image2" src="" alt="Comparison Image" />
            <div class="button-container">
              <button id="sameButton">Same</button>
              <button id="differentButton">Different</button>
            </div>
            <p>Trial: <span id="trialNumber"></span></p>
            <p>Difficulty: <span id="difficultyNumber"></span></p>
          </div>
        </div>`;
    document.getElementById('sameButton').onclick = () => submitResponse(true);
    document.getElementById('differentButton').onclick = () => submitResponse(false);
}

// Continue with existing fetchTrialsAndStart() {
        fetch("bamrt_trials.json")
            .then(r => r.json())
            .then(data => {
                trials = data;
                trials.forEach(tr => tr.difficulty = computeDifficulty(tr));
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
        priorMean = ["1","2"].includes(yearGroup) ? 15 : ["5","6"].includes(yearGroup) ? 50 : 30;
        posterior = normalize(thetaGrid.map(th => normalPDF(th, priorMean, priorSD)));
        trialHistory = [];
        availableIndices = [...trials.keys()];
        showTrial();
    }

    // Select next trial by boosted-Fisher
    function selectNextIndex() {
        if (!availableIndices.length) return -1;
        const mean = posteriorMean();
        const sd = Math.sqrt(posteriorVariance());
        const targetTheta = mean + 0.5 * sd;
        let bestIdx = availableIndices[0];
        let bestF = fisherInfo(targetTheta, trials[bestIdx].difficulty);
        for (let idx of availableIndices) {
            const f = fisherInfo(targetTheta, trials[idx].difficulty);
            if (f > bestF) { bestF = f; bestIdx = idx; }
        }
        return bestIdx;
    }

    // Render a trial
    function renderTrial(idx) {
        const t = trials[idx];
        document.getElementById("trialNumber").textContent = trialHistory.length + 1;
        document.getElementById("difficultyNumber").textContent = t.difficulty.toFixed(2);
        document.getElementById("image1").src = `images/${t.base_image}`;
        document.getElementById("image2").src = `images/${t.comparison_image}`;
        document.getElementById("progressFill").style.width = `${Math.round((trialHistory.length / MAX_TRIALS) * 100)}%`;
        trialStartTime = Date.now();
    }

    // Main adaptive loop with 30–50 enforcement
    function showTrial() {
        const variance = posteriorVariance();
        if (trialHistory.length < 30) {
            currentIndex = selectNextIndex();
            if (currentIndex === -1) return endTask();
            renderTrial(currentIndex);
            return;
        }
        if (trialHistory.length >= 30 && variance < 5) {
            console.log(`[BAMRT] Variance ${variance.toFixed(2)} < 5 after ${trialHistory.length} trials → end`);
            return endTask();
        }
        if (trialHistory.length >= MAX_TRIALS) return endTask();

        const mean = posteriorMean();
        const sd = Math.sqrt(variance);
        const targetTheta = mean + 0.5 * sd;
        const maxDiff = Math.max(...availableIndices.map(i => trials[i].difficulty));
        if (targetTheta >= maxDiff - 0.1) { console.log(`[BAMRT] targetθ ≥ maxDiff → end`); return endTask(); }
        if (!availableIndices.some(i => Math.abs(trials[i].difficulty - mean) <= 5)) {
            console.log(`[BAMRT] no items within ±5 of θ≈${mean.toFixed(2)} → end`);
            return endTask();
        }

        currentIndex = selectNextIndex();
        if (currentIndex === -1) return endTask();
        renderTrial(currentIndex);
    }

    // Handle responses
    function submitResponse(chosenSame) {
        if (currentIndex === -1) return;
        const t = trials[currentIndex];
        const correct = (chosenSame === !t.mirrored);
        const rt = (Date.now() - trialStartTime) / 1000;
        updatePosterior(correct, t.difficulty);
        trialHistory.push({
            trial: trialHistory.length + 1,
            base: t.base_image,
            comp: t.comparison_image,
            correct: correct ? "Yes" : "No",
            difficulty: t.difficulty,
            theta: posteriorMean().toFixed(2),
            variance: posteriorVariance().toFixed(2),
            info: expectedFisherInfo(currentIndex).toFixed(2),
            rt: rt.toFixed(2)
        });
        availableIndices = availableIndices.filter(i => i !== currentIndex);
        showTrial();
    }

    // End task
    function endTask() {
        console.log(`[BAMRT v008] Task completed, uploading results.`);
        document.body.innerHTML = '<h2>BAMRT Task Complete. Uploading results...</h2>';
        if (typeof window.controllerBAMRTCallback === 'function') {
            window.controllerBAMRTCallback(trialHistory);
        } else {
            console.warn('[BAMRT v008] No controller callback found for BAMRT');
        }
    }

    // DOM setup and fetch data
    setupDOM();
    fetchTrialsAndStart();
}
