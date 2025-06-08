// ─── BAMRT Task Script v48 ver48 (fixed full script + always side-by-side) ───

// 1) Global launcher
window.startBAMRT = function(participantId, yearGroup) {
  try {
    console.log(`[BAMRT WRAPPER_ver45] Called with participantId: ${participantId}, yearGroup: ${yearGroup}`);
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

  // --- IRT & Bayesian helpers ---
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

  // --- DOM setup ---
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
      /* Always side-by-side on wide, wrap buttons and labels */
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
          <button id="differentButton">Different</button>
        </div>
        <p>Trial: <span id="trialNumber"></span></p>
        <p>Difficulty: <span id="difficultyNumber"></span></p>
      </div>
    </div>`;
  document.getElementById('sameButton').onclick      = () => submitResponse(true);
  document.getElementById('differentButton').onclick = () => submitResponse(false);
}
