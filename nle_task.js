function startNLE(participantId, yearGroup, callback) {
    console.log(`[NLE v007] Starting task for ${participantId}, Year ${yearGroup}`);


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

    let practiceNumbers = [1, 25];
    let targetNumbers = [23, 57, 88, 12, 75, 35, 90, 50, 6, 82, 44, 67, 29, 93, 10, 64, 37, 81, 2, 55, 48, 77];

    let estimates = [];
    let currentEstimate = null;
    let currentTrial = 0;
    let isInPractice = true;
    let currentTarget = null;

    function resizeCanvas() {
        canvas.width = document.getElementById('numberLineContainer').clientWidth;
        canvas.height = 100;
        drawNumberLine();
    }

    function drawNumberLine() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const padding = 50;
        const lineStartX = padding;
        const lineEndX = canvas.width - padding;
        const lineY = canvas.height / 2;

        ctx.beginPath();
        ctx.moveTo(lineStartX, lineY);
        ctx.lineTo(lineEndX, lineY);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (currentEstimate !== null) {
            ctx.beginPath();
            const xPosition = (currentEstimate / 100) * (lineEndX - lineStartX) + lineStartX;
            ctx.arc(xPosition, lineY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }

        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('0', lineStartX, lineY + 30);
        ctx.fillText('100', lineEndX, lineY + 30);
    }

    function displayTargetNumber() {
        if (isInPractice) {
            currentTarget = practiceNumbers[currentTrial];
        } else {
            if (currentTrial < targetNumbers.length) {
                currentTarget = targetNumbers[currentTrial];
            } else {
                currentTarget = null;
            }
        }
        targetNumberElement.textContent = currentTarget || 'Task Completed';
    }

    function convertXToNumber(x) {
        const padding = 50;
        const lineStartX = padding;
        const lineEndX = canvas.width - padding;
        if (x < lineStartX) x = lineStartX;
        if (x > lineEndX) x = lineEndX;
        return Math.round(((x - lineStartX) / (lineEndX - lineStartX)) * 100);
    }

    function checkEstimate() {
        const acceptableError = 20;
        const error = Math.abs(currentEstimate - currentTarget);
        return (error <= acceptableError);
    }

    canvas.addEventListener('click', function (e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        currentEstimate = convertXToNumber(x);
        submitBtn.disabled = false;
        drawNumberLine();
    });

    submitBtn.addEventListener('click', function () {
        if (isInPractice) {
            currentTrial++;
            if (checkEstimate()) {
                if (currentTrial < practiceNumbers.length) {
                    displayTargetNumber();
                    currentEstimate = null;
                    submitBtn.disabled = true;
                    drawNumberLine();
                } else {
                    isInPractice = false;
                    practiceLabel.style.display = 'none';
                    estimates = [];
                    currentTrial = 0;
                    currentEstimate = null;
                    drawNumberLine();
                    displayTargetNumber();
                    submitBtn.disabled = true;
                }
            } else {
                alert('Estimate not close enough. Let\'s check understanding.');
            }
        } else {
            estimates.push({
                trial: currentTrial + 1,
                target: currentTarget,
                estimate: currentEstimate,
                difference: currentEstimate - currentTarget,
                abs_error: Math.abs(currentEstimate - currentTarget)
            });
            currentTrial++;
            if (currentTrial < targetNumbers.length) {
                displayTargetNumber();
                currentEstimate = null;
                submitBtn.disabled = true;
                drawNumberLine();
            } else {
                endTask();
            }
        }
    });

    drawNumberLine();
    displayTargetNumber();
    resizeCanvas();

    function endTask() {
        console.log('Task completed, uploading results.');
        document.body.innerHTML = '<h2>Task Completed. Uploading results...</h2>';
        
        var formData = new FormData();
        formData.append('entry.713541064', participantID);
        formData.append('entry.796534484', yearGroup);
        formData.append('entry.569501423', new Date().toISOString());
        formData.append('entry.187358765', JSON.stringify(estimates));
        formData.append('entry.695655106', '');
        formData.append('entry.590241153', '');
        formData.append('entry.1393484340', '');
        formData.append('entry.1501785385', '');

        fetch('https://docs.google.com/forms/u/0/d/e/1FAIpQLScAPwRBzflFbnWjK4RZc2SXziBHBBHIkXStjs_slV3qGXs7vQ/formResponse', {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        })
        .then(() => {
            console.log('✅ NLE trials uploaded to Form');
            document.body.innerHTML = '<h2>Thanks! Your results have been submitted.</h2>';
        })
        .catch(error => console.error('❌ Upload failed:', error));

        if (typeof callback === 'function') callback(estimates);
    }

} // closes startNLE

window.startNLE = startNLE;
