// ─── BAMRT Task Script v44 (v44 baseline + always side-by-side) ───

// 1) Global launcher
window.startBAMRT = function(participantId, yearGroup) {
  try {
    console.log(`[BAMRT WRAPPER_ver44] Called with participantId: ${participantId}, yearGroup: ${yearGroup}`);
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
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  // Build CSS rule string based on mobile detection
  const flexDirection = isMobile ? 'column' : 'row';
  const imgWidth = isMobile ? '100%' : '45%';

  document.body.innerHTML = `
    <style>
      #taskContainer { padding:1em; }
      #trial-container {
        display: flex;
        flex-wrap: nowrap;
        justify-content: center;
        align-items: center;
        gap: 1em;
        flex-direction: ${flexDirection};
      }
      #trial-container img {
        display: inline-block;
        width: ${imgWidth};
        height: auto;
        margin: 0.5em;
      }
      #progressBar { width:80%; height:20px; margin:1em auto; background:#ddd; }
      #progressFill { height:100%; width:0%; background:#4caf50; }
      .button-container { margin:1em 0; }
      .button-container button { margin:0 1em; padding:0.5em 1em; }
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
        console.log("[BAMRT] difficulty values recomputed.");
        availableIndices = [...trials.keys()];
        initializeTask();
      })
      .catch(err => { console.error("Failed to load trials", err); alert("Failed to load trials."); });
  }

  function initializeTask() {
    priorMean = ["1","2"].includes(yearGroup)?15:(["5","6"].includes(yearGroup)?50:30);
    posterior = normalize(thetaGrid.map(th=>normalPDF(th, priorMean, priorSD)));
    trialHistory = [];
    availableIndices = [...trials.keys()];
    showTrial();
  }

  function selectNextIndex() {
    if (!availableIndices.length) return -1;
    const mean = posteriorMean(), sd = Math.sqrt(posteriorVariance());
    const targetTheta = mean + 0.5*sd;
    let best = availableIndices[0], bestF = fisherInfo(targetTheta, trials[best].difficulty);
    availableIndices.forEach(idx=>{
      const f = fisherInfo(targetTheta, trials[idx].difficulty);
      if (f>bestF) { bestF=f; best=idx; }
    });
    return best;
  }

  function renderTrial(idx) {
    const t = trials[idx];
    document.getElementById("trialNumber").textContent = trialHistory.length+1;
    document.getElementById("difficultyNumber").textContent = t.difficulty.toFixed(2);
    document.getElementById("image1").src = `images/${t.base_image}`;
    document.getElementById("image2").src = `images/${t.comparison_image}`;
    document.getElementById("progressFill").style.width = `${Math.round((trialHistory.length/ MAX_TRIALS)*100)}%`;
    trialStartTime = Date.now();
  }

  function showTrial() {
    const varian = posteriorVariance();
    if (trialHistory.length<30) { currentIndex=selectNextIndex(); if(currentIndex<0) return endTask(); renderTrial(currentIndex); return; }
    if(trialHistory.length>=30&&varian<5) return endTask();
    if(trialHistory.length>=MAX_TRIALS) return endTask();
    currentIndex=selectNextIndex(); if(currentIndex<0) return endTask(); renderTrial(currentIndex);
  }

  function submitResponse(chosenSame){
    if(currentIndex<0) return;
    const t=trials[currentIndex], correct=(chosenSame===!t.mirrored);
    updatePosterior(correct,t.difficulty);
    trialHistory.push({trial:trialHistory.length+1,base:t.base_image,comp:t.comparison_image,correct:correct?"Yes":"No",difficulty:t.difficulty,theta:posteriorMean().toFixed(2),variance:posteriorVariance().toFixed(2),info:expectedFisherInfo(currentIndex).toFixed(2),rt:((Date.now()-trialStartTime)/1000).toFixed(2)});
    availableIndices=availableIndices.filter(i=>i!==currentIndex);
    showTrial();
  }

  function endTask(){
    document.body.innerHTML='<h2>BAMRT Task Complete. Uploading results...</h2>';
    if(typeof window.controllerBAMRTCallback==='function') window.controllerBAMRTCallback(trialHistory);
  }

  setupDOM();
  fetchTrialsAndStart();
}
