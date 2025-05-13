console.log("Loaded task.js - Full Bayesian Build 006 (Single Upload)");

/********************
 *  GLOBAL STATE   *
 *******************/
let participantID = "";
let yearGroup = "";

let trials = [];
let availableIndices = [];
let trialHistory = [];
let currentIndex = -1;
let trialStartTime = 0;

/********************
 *  IRT + BAYESIAN  *
 *******************/
const discrimination = 1.0;
const thetaGrid = Array.from({ length: 1501 }, (_, i) => i * 0.1);
let posterior = [];
let priorMean = 30;
let priorSD = 20;

/********************
 *  STOPPING RULES  *
 *******************/
const MAX_TRIALS = 50;

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
            alert("Failed to load trial data.");
        });
});

/********************
 *  TASK FLOW       *
 *******************/
function startTask() {
    participantID = document.getElementById("participantId").value.trim();
    yearGroup = document.getElementById("yearGroup").value;
    if (!participantID || !yearGroup) {
        alert("Please enter Participant ID and Year Group");
        return;
    }

    priorMean = ["1", "2"].includes(yearGroup) ? 15 : ["5", "6"].includes(yearGroup) ? 50 : 30;
    posterior = normalize(thetaGrid.map(th => normalPDF(th, priorMean, priorSD)));

    trialHistory = [];
    availableIndices = [...trials.keys()];
    currentIndex = -1;

    document.getElementById("setup-container").style.display = "none";
    document.getElementById("taskContainer").style.display = "block";

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
    if (trialHistory.length >= MAX_TRIALS) return endTask();

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
}

function submitResponse(chosenSame) {
    if (currentIndex === -1) return;

    const t = trials[currentIndex];
    const isCorrect = chosenSame !== t.mirrored;
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
    document.getElementById("taskContainer").style.display = "none";
    document.getElementById("resultsSection").style.display = "block";

    const tbody = document.getElementById("resultsBody");
    tbody.innerHTML = "";
    trialHistory.forEach((r, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${r.trial}</td><td>${r.base}</td><td>${r.comp}</td><td>${r.correct}</td><td>${r.difficulty}</td><td>${r.theta}</td><td>${r.variance}</td><td>${r.info}</td><td>${r.rt}</td>`;
        tbody.appendChild(tr);
    });

    sendDataToForm(trialHistory);
}

/********************
 *  FORM UPLOAD     *
 *******************/
function sendDataToForm(trials) {
    var formData = new FormData();
    formData.append('entry.713541064', participantID);                // Participant ID
    formData.append('entry.796534484', yearGroup);                    // Year Group
    formData.append('entry.569501423', new Date().toISOString());     // Timestamp (ISO string)
    formData.append('entry.187358765', JSON.stringify(trials));       // Trials JSON string

    // ✔ Optional future-proof placeholders (currently blank but safe to include)
    formData.append('entry.695655106', '');  // Additional Var 1
    formData.append('entry.590241153', '');  // Additional Var 2
    formData.append('entry.1393484340', ''); // Additional Var 3
    formData.append('entry.1501785385', ''); // Additional Var 4

    fetch('https://docs.google.com/forms/d/e/1FAIpQLSfYQ01gwvUhKz9CIfgJZKD2gJ-LNJMhNl6_z5Miez9ai6sO5g/formResponse', {
        method: 'POST',
        mode: 'no-cors',
        body: formData
    })
    .then(() => console.log('✅ All trials uploaded in JSON string + placeholders'))
    .catch(error => console.error('❌ Upload failed:', error));
}



