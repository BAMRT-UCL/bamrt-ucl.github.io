// =============================================================
//  Mental Rotation Task (True Bayesian Adaptive - 2PL IRT)
//  Fully Bayesian: Posterior over theta, info-max selection
//  + Progress Bar + Response Time Tracking
// =============================================================
console.log("Loaded task.js - Full Bayesian Build 005");

/********************
 *  GLOBAL STATE   *
 *******************/
let participantID = "";
let yearGroup     = "";

let trials           = [];   // full item bank loaded from JSON
let availableIndices = [];   // indices not yet administered
let trialHistory     = [];   // response records
let currentIndex     = -1;
let trialStartTime   = 0;    // time each trial starts (for RT)

/********************
 *  IRT + BAYESIAN  *
 *******************/
const discrimination = 1.0;  // 2-PL a-parameter
const thetaGrid = Array.from({length: 1501}, (_, i) => i * 0.1); // 0 to 150
let posterior    = [];   // probability over theta
let priorMean    = 30;
let priorSD      = 20;

/********************
 *  STOPPING RULES  *
 *******************/
const MAX_TRIALS = 50;
const MIN_ENTROPY = 1.0;

/********************
 *  HELPERS         *
 *******************/
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

function posteriorEntropy() {
  return -posterior.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
}

/********************
 *  DATA LOADING    *
 *******************/
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("startButton").disabled = true;

  fetch("bamrt_trials.json")
    .then(r => r.json())
    .then(data => {
      trials = data;
      availableIndices = [...trials.keys()];
      console.log(`✅ Loaded ${trials.length} trials`);
      document.getElementById("startButton").disabled = false;
    })
    .catch(err => {
      console.error("❌ Failed to load trial data", err);
      alert("Failed to load trial data. Make sure you are using a local server.");
    });
});

/********************
 *  TASK FLOW       *
 *******************/
function startTask() {
  participantID = document.getElementById("participantId").value.trim();
  yearGroup     = document.getElementById("yearGroup").value;
  if (!participantID || !yearGroup) {
    alert("Please enter Participant ID and Year Group");
    return;
  }

  priorMean = ["1","2"].includes(yearGroup) ? 15 : ["5","6"].includes(yearGroup) ? 50 : 30;
  posterior = normalize(thetaGrid.map(th => normalPDF(th, priorMean, priorSD)));

  trialHistory     = [];
  availableIndices = [...trials.keys()];
  currentIndex     = -1;

  document.getElementById("setup-container").style.display = "none";
  document.getElementById("taskContainer").style.display  = "block";

  showTrial();
}

function selectNextIndex() {
  if (!availableIndices.length) return -1;

  return availableIndices.reduce((best, idx) => {
    const infoBest = expectedFisherInfo(best);
    const infoThis = expectedFisherInfo(idx);
    return infoThis > infoBest ? idx : best;
  }, availableIndices[0]);
}

function showTrial() {
  const currentVar = posteriorVariance();
  const currentEntropy = posteriorEntropy();
  const currentTheta = posteriorMean();

  // Stop if maximum trials reached
  if (trialHistory.length >= MAX_TRIALS) return endTask();

  // Stop if model is confident (low variance + low entropy)
  if (currentVar < 5.0 && currentEntropy < 2.0) return endTask();

  // Stop if we’ve clearly topped out (ceiling logic)
  if (currentTheta > 125 && currentVar < 15) {
    console.log("🔺 Ceiling reached — task ending");
    return endTask();
  }

  // Continue with next trial
  currentIndex = selectNextIndex();
  if (currentIndex === -1) return endTask();

  const t = trials[currentIndex];
  document.getElementById("trialNumber").textContent = trialHistory.length + 1;
  document.getElementById("difficultyNumber").textContent = t.difficulty.toFixed(2);
  document.getElementById("image1").src = `images/${t.base_image}`;
  document.getElementById("image2").src = `images/${t.comparison_image}`;

  const percent = Math.round((trialHistory.length / MAX_TRIALS) * 100);
  document.getElementById("progressFill").style.width = `${percent}%`;

  trialStartTime = Date.now();
  console.log(`🟡 presenting idx=${currentIndex}  diff=${t.difficulty}`);
}


function submitResponse(chosenSame) {
  if (currentIndex === -1) return;

  const t = trials[currentIndex];
  const isCorrect = chosenSame !== t.mirrored;
  const responseTime = (Date.now() - trialStartTime) / 1000; // in seconds

  updatePosterior(isCorrect, t.difficulty);

  const mean = posteriorMean();
  const variance = posteriorVariance();
  const info = expectedFisherInfo(currentIndex);

  trialHistory.push({
    base: t.base_image,
    comp: t.comparison_image,
    correct: isCorrect,
    difficulty: t.difficulty,
    theta: mean.toFixed(2),
    var: variance.toFixed(2),
    info: info.toFixed(2),
    rt: responseTime.toFixed(2)
  });
  availableIndices = availableIndices.filter(i => i !== currentIndex);
  showTrial();
}

function endTask() {
  document.getElementById("taskContainer").style.display = "none";
  document.getElementById("resultsSection").style.display = "block";

  const tbody = document.getElementById("resultsBody");
  tbody.innerHTML = "";
  trialHistory.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${r.base}</td><td>${r.comp}</td><td>${r.correct ? "Yes" : "No"}</td><td>${r.difficulty}</td><td>${r.theta}</td><td>${r.var}</td><td>${r.info}</td><td>${r.rt}</td>`;
    tbody.appendChild(tr);
  });
}

/********************
 *  UI HELPERS      *
 *******************/
function toggleResults() {
  document.getElementById("resultsTable").style.display = document.getElementById("showResultsToggle").checked ? "table" : "none";
}

function downloadResults() {
  const csv = ["Trial,Base,Comparison,Correct,Difficulty,Theta,Variance,Info,RT"].concat(
    trialHistory.map((r,i)=>`${i+1},${r.base},${r.comp},${r.correct},${r.difficulty},${r.theta},${r.var},${r.info},${r.rt}`)
  ).join("\n");

  const blob = new Blob([csv], {type:"text/csv"});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `${participantID}_MRT_results.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
