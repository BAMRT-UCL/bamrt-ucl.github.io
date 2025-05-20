/**
 * Number-Line Estimation – v012 (patched)
 * – fixes parameter-name mismatch and prevents DOM overwrite in combined run
 */

function startNLE(participantID, yearGroup, callback) {
    console.log(`[NLE v007] Starting task for ${participantID}, Year ${yearGroup}`);

    /* -----------  BUILD UI  ----------- */
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

    const canvas              = document.getElementById('numberLineCanvas');
    const ctx                  = canvas.getContext('2d');
    const targetNumberElement  = document.getElementById('targetNumber');
    const submitBtn            = document.getElementById('submitBtn');
    const practiceLabel        = document.getElementById('practiceLabel');

    /* -----------  DATA  ----------- */
    const practiceNumbers = [1, 25];
    const targetNumbers   = [23, 57, 88, 12, 75, 35, 90, 50, 6, 82, 44, 67,
                             29, 93, 10, 64, 37, 81, 2, 55, 48, 77];

    let estimates       = [];
    let currentEstimate = null;
    let currentTrial    = 0;
    let isInPractice    = true;
    let currentTarget   = null;

    /* -----------  CANVAS HELPERS  ----------- */
    function resizeCanvas() {
        canvas.width  = document.getElementById('numberLineContainer').clientWidth;
        canvas.height = 100;
        drawNumberLine();
    }

    function drawNumberLine() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const padding   = 50;
        const lineStart = padding;
        const lineEnd   = canvas.width - padding;
        const lineY     = canvas.height / 2;

        ctx.beginPath();
        ctx.moveTo(lineStart, lineY);
        ctx.lineTo(lineEnd, lineY);
        ctx.strokeStyle = '#000';
        ctx.lineWidth   = 2;
        ctx.stroke();

        if (currentEstimate !== null) {
            const xPos = (currentEstimate / 100) * (lineEnd - lineStart) + lineStart;
            ctx.beginPath();
            ctx.arc(xPos, lineY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }

        ctx.fillStyle   = 'black';
        ctx.font        = '16px Arial';
        ctx.textAlign   = 'center';
        ctx.fillText('0',   lineStart, lineY + 30);
        ctx.fillText('100', lineEnd,   lineY + 30);
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
    }

    function convertXToNumber(x) {
        const padding   = 50;
        const lineStart = padding;
        const lineEnd   = canvas.width - padding;
        if (x < lineStart) x = lineStart;
        if (x > lineEnd)   x = lineEnd;
        return Math.round(((x - lineStart) / (lineEnd - lineStart)) * 100);
    }

    function checkEstimate() {
        return Math.abs(currentEstimate - currentTarget) <= 20;  // ±20 is “close enough”
    }

    /* -----------  EVENTS  ----------- */
    canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        currentEstimate   = convertXToNumber(e.clientX - rect.left);
        submitBtn.disabled = false;
        drawNumberLine();
    });

    submitBtn.addEventListener('click', () => {
        if (isInPractice) {
            currentTrial++;
            if (checkEstimate()) {
                if (currentTrial < practiceNumbers.length) {
                    displayTargetNumber();
                    currentEstimate   = null;
                    submitBtn.disabled = true;
                    drawNumberLine();
                } else {                                   // practice finished
                    isInPractice     = false;
                    practiceLabel.style.display = 'none';
                    estimates        = [];                 // clear practice data
                    currentTrial     = 0;
                    currentEstimate  = null;
                    drawNumberLine();
                    displayTargetNumber();
                    submitBtn.disabled = true;
                }
            } else {
                alert('Estimate not close enough. Let\'s check understanding.');
            }
        } else {                                          // real trials
            estimates.push({
                trial:     currentTrial + 1,
                target:    currentTarget,
                estimate:  currentEstimate,
                difference: currentEstimate - currentTarget,
                abs_error: Math.abs(currentEstimate - currentTarget)
            });
            currentTrial++;
            if (currentTrial < targetNumbers.length) {
                displayTargetNumber();
                currentEstimate   = null;
                submitBtn.disabled = true;
                drawNumberLine();
            } else {
                endTask();                                // all done
            }
        }
    });

    /* -----------  INITIALISE  ----------- */
    drawNumberLine();
    displayTargetNumber();
    resizeCanvas();
    // (optional) window.addEventListener('resize', resizeCanvas);

    /* =================  endTask  ================= */
    function endTask() {
        console.log('Task completed, uploading results.');

        /* Show “Uploading…” only in stand-alone mode */
        if (typeof callback !== 'function') {
            document.body.innerHTML =
                '<h2>Task Completed. Uploading results…</h2>';
        }

        const formData = new FormData();
        formData.append('entry.713541064', participantID);
        formData.append('entry.796534484', yearGroup);
        formData.append('entry.569501423', new Date().toISOString());
        formData.append('entry.187358765', JSON.stringify(estimates));
        // (add or adjust other entry IDs here as needed)

        fetch('https://docs.google.com/forms/u/0/d/e/1FAIpQLScAPwRBzflFbnWjK4RZc2SXziBHBBHIkXStjs_slV3qGXs7vQ/formResponse', {
            method: 'POST',
            mode:   'no-cors',
            body:   formData
        })
        .then(() => {
            console.log('✅ NLE trials uploaded to Form');

            if (typeof callback === 'function') {
                /* Combined flow → hand control back, **do not** touch DOM */
                callback(estimates);
            } else {
                /* Stand-alone NLE → show thank-you screen */
                document.body.innerHTML =
                    '<h2>Thanks! Your results have been submitted.</h2>';
            }
        })
        .catch(err => console.error('❌ Upload failed:', err));
    }
}  // ─── end startNLE ───

/* Expose to other scripts (controller.js) */
window.startNLE = startNLE;
