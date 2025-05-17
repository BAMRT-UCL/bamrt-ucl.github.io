function startBAMRT(participantId, yearGroup) {
	console.log(`[BAMRT v006] Starting task for ${participantId}, Year ${yearGroup}`);


    let trials = [];
    let availableIndices = [];
    let trialHistory = [];
    let currentIndex = -1;
    let trialStartTime = 0;

    const discrimination = 1.0;
    const thetaGrid = Array.from({ length: 1501 }, (_, i) => i * 0.1);
    let posterior = [];
    let priorMean = 30;
    let priorSD = 20;
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

    // DOM SETUP
    document.body.innerHTML = `
        <div id="taskContainer">
            <div id="trial-container">
                <p>Trial: <span id="trialNumber"></span></p>
                <p>Difficulty: <span id="difficultyNumber"></span></p>
                <div id="progressBar" style="width: 80%; height: 20px; margin: 1em auto; background: #ddd;">
                    <div id="progressFill" style="height: 100%; width: 0%; background: #4caf50;"></div>
                </div>
                <img id="image1" src="" alt="Base Image" />
                <img id="image2" src="" alt="Comparison Image" />
                <div class="button-container">
                    <button id="sameButton">Same</button>
                    <button id="differentButton">Different</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('sameButton').onclick = () => submitResponse(true);
    document.getElementById('differentButton').onclick = () => submitResponse(false);

    function fetchTrialsAndStart() {
        fetch("bamrt_trials.json")
            .then(r => r.json())
            .then(data => {
                trials = data;
                availableIndices = [...trials.keys()];
                console.log(`✅ Loaded ${trials.length} trials`);
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
    console.log(`[BAMRT v001] Task completed, uploading results.`);
    document.body.innerHTML = '<h2>BAMRT Task Complete. Uploading results...</h2>';
    if (typeof window.controllerBAMRTCallback === 'function') {
        window.controllerBAMRTCallback(trialHistory);
    } else {
        console.warn('[BAMRT v001] No controller callback found for BAMRT');
    }
}

fetchTrialsAndStart();

}

