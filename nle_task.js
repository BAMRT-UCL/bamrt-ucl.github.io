window.startNLE = function(participantID, yearGroup, callback) {
    console.log(`[NLE v011] Starting task for ${participantID}, Year ${yearGroup}`);

    document.body.innerHTML = `
      <h1>Number Line Estimation Task</h1>
      <p>You will be given a number and asked to indicate on the number line where you think this number should be placed.</p>
      <p id="practiceLabel">Practice Questions</p>
      <p>Target number: <strong id="targetNumber"></strong></p>
      <div id="numberLineContainer">
        <canvas id="numberLineCanvas"></canvas>
      </div>
      <button id="submitBtn" disabled>Submit Estimate</button>
    `;

    const canvas = document.getElementById('numberLineCanvas');
    const ctx = canvas.getContext('2d');
    const targetNumberElement = document.getElementById('targetNumber');
    const submitBtn = document.getElementById('submitBtn');
    const practiceLabel = document.getElementById('practiceLabel');

    const practiceNumbers = [1, 25];
    const targetNumbers = [23, 57, 88, 12, 75, 35, 90, 50, 6, 82, 44, 67,
                           29, 93, 10, 64, 37, 81, 2, 55, 48, 77];

    let estimates = [];
    let currentEstimate = null;
    let currentTrial = 0;
    let isInPractice = true;
    let currentTarget = null;

    function resizeCanvas() {
      const container = document.getElementById('numberLineContainer');
      canvas.width  = container.clientWidth;
      canvas.height = 100;
      drawNumberLine();
    }

    // initial sizing
    resizeCanvas();

    // re‐size on window change
    window.addEventListener('resize', resizeCanvas);

    function drawNumberLine() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const padding = 50;
        const lineStart = padding;
        const lineEnd = canvas.width - padding;
        const lineY = canvas.height / 2;

        ctx.beginPath();
        ctx.moveTo(lineStart, lineY);
        ctx.lineTo(lineEnd, lineY);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (currentEstimate !== null) {
            const xPos = (currentEstimate / 100) * (lineEnd - lineStart) + lineStart;
            ctx.beginPath();
            ctx.arc(xPos, lineY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }

        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('0', lineStart, lineY + 30);
        ctx.fillText('100', lineEnd, lineY + 30);
    }

    function displayTargetNumber() {
        if (isInPractice) {
            currentTarget = practiceNumbers[currentTrial];
        } else {
            currentTarget = (currentTrial < targetNumbers.length)
                            ? targetNumbers[currentTrial]
                            : null;
        }
        targetNumberElement.textContent = currentTarget ?? 'Task Completed';
        // start timing each trial
        trialStartTime = Date.now();
    }

    function convertXToNumber(x) {
        const padding = 50;
        const lineStart = padding;
        const lineEnd = canvas.width - padding;
        if (x < lineStart) x = lineStart;
        if (x > lineEnd) x = lineEnd;
        return Math.round(((x - lineStart) / (lineEnd - lineStart)) * 100);
    }

    function checkEstimate() {
        return Math.abs(currentEstimate - currentTarget) <= 20;
    }

    canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        currentEstimate = convertXToNumber(e.clientX - rect.left);
        submitBtn.disabled = false;
        drawNumberLine();
    });

    submitBtn.addEventListener('click', () => {
        submitBtn.disabled = true;

        if (isInPractice) {
            currentTrial++;
            if (checkEstimate()) {
                if (currentTrial < practiceNumbers.length) {
                    displayTargetNumber();
                    currentEstimate = null;
                    drawNumberLine();
                } else {
                    isInPractice = false;
                    practiceLabel.style.display = 'none';
                    estimates = [];
                    currentTrial = 0;
                    currentEstimate = null;
                    drawNumberLine();
                    displayTargetNumber();
                }
            } else {
                alert('Estimate not close enough. Let\'s check understanding.');
            }
        } else {
            const responseTime = (Date.now() - trialStartTime) / 1000;
            estimates.push({
                trial: currentTrial + 1,
                target: currentTarget,
                estimate: currentEstimate,
                difference: currentEstimate - currentTarget,
                abs_error: Math.abs(currentEstimate - currentTarget),
                rt: responseTime.toFixed(2)
            });
            currentTrial++;
            if (currentTrial < targetNumbers.length) {
                displayTargetNumber();
                currentEstimate = null;
                drawNumberLine();
            } else {
                endTask();
            }
        }
    });

    drawNumberLine();
    displayTargetNumber();

function endTask() {
    console.log('Task completed, uploading results.');

    document.body.innerHTML = `
        <h2>Submitting Results…</h2>
        <p>Please wait while we upload your data.</p>
    `;

    const formData = new FormData();
    formData.append('entry.713541064', participantID);
    formData.append('entry.796534484', yearGroup);
    formData.append('entry.569501423', new Date().toISOString());
    formData.append('entry.187358765', JSON.stringify(estimates));


 // NO auto-POST here. Instead, invoke callback immediately:
if (typeof callback === 'function') {
	callback(estimates);
	}
}

};  // ← end of window.startNLE = function(...)
