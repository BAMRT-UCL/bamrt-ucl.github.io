
let participantID = '';
let yearGroup = '';
let nleCompleted = false;
let bamrtCompleted = false;

function showTransitionAfterNLE() {
    document.body.innerHTML = `
      <h2>Great job!</h2>
      <p>You’ve completed the first task.</p>
      <p>When you are ready, click the button below to begin the
         <strong>Mental Rotation Task</strong>. The task is timed, so make sure
         you’re comfortable before you start.</p>
      <button id="startBamrtBtn">Start Mental Rotation Task</button>
    `;

    document.getElementById('startBamrtBtn').addEventListener('click', () => {
        console.log('[Controller] ▶ Starting BAMRT…');
        window.bamrtInternalStart(participantID, yearGroup);
    });
}

function startCombinedTask() {
    console.log('[Controller] ▶ Starting combined flow');
    document.body.innerHTML = '<h2>Number-Line Task loading…</h2>';

    startNLE(participantID, yearGroup, (nleData) => {
        console.log('[Controller] ✅ NLE finished');
        showTransitionAfterNLE();

        window.controllerBAMRTCallback = (bamrtData) => {
            console.log('[Controller] ✅ BAMRT finished');
            alert('Both tasks complete – thank you!');
            showStartMenu();
        };
    });
}

function startNLEOnly() {
    document.body.innerHTML = '<h2>Starting NLE Only...</h2>';
    startNLE(participantID, yearGroup, (nleData) => {
        console.log('✅ NLE task complete.');
        console.log(nleData);
        nleCompleted = true;
        showStartMenu();
    });
}

function startBAMRTOnly() {
    document.body.innerHTML = '<h2>Starting BAMRT Only...</h2>';
    window.controllerBAMRTCallback = (bamrtData) => {
        console.log('✅ BAMRT complete.');
        console.log(bamrtData);
        bamrtCompleted = true;
        showStartMenu();
    };
    window.bamrtInternalStart(participantID, yearGroup);
}

function showStartMenu() {
    const disableNLE = nleCompleted ? 'disabled' : '';
    const disableBAMRT = bamrtCompleted ? 'disabled' : '';

    document.body.innerHTML = `
        <h1>Combined Tasks Menu</h1>
        <label>Participant ID:
            <input type="text" id="participantId" value="${participantID}" ${participantID ? 'readonly' : ''} />
        </label><br/>
        <label>Year Group:
            <select id="yearGroup" ${participantID ? 'disabled' : ''}>
                <option value="1" ${yearGroup === '1' ? 'selected' : ''}>Year 1</option>
                <option value="2" ${yearGroup === '2' ? 'selected' : ''}>Year 2</option>
                <option value="3" ${yearGroup === '3' ? 'selected' : ''}>Year 3</option>
                <option value="4" ${yearGroup === '4' ? 'selected' : ''}>Year 4</option>
                <option value="5" ${yearGroup === '5' ? 'selected' : ''}>Year 5</option>
                <option value="6" ${yearGroup === '6' ? 'selected' : ''}>Year 6</option>
            </select>
        </label><br/>

        <button onclick="setupAndStartNLE()" ${disableNLE}>Start NLE Only</button>
        <button onclick="setupAndStartBAMRT()" ${disableBAMRT}>Start BAMRT Only</button>
    `;
}

function setupAndStartCombined() {
    participantID = document.getElementById('participantId').value.trim();
    yearGroup = document.getElementById('yearGroup').value;
    if (!participantID || !yearGroup) {
        alert('Please enter Participant ID and Year Group');
        return;
    }
    startCombinedTask();
}

function setupAndStartNLE() {
    participantID = document.getElementById('participantId').value.trim();
    yearGroup = document.getElementById('yearGroup').value;
    if (!participantID || !yearGroup) {
        alert('Please enter Participant ID and Year Group');
        return;
    }
    startNLEOnly();
}

function setupAndStartBAMRT() {
    participantID = document.getElementById('participantId').value.trim();
    yearGroup = document.getElementById('yearGroup').value;
    if (!participantID || !yearGroup) {
        alert('Please enter Participant ID and Year Group');
        return;
    }
    startBAMRTOnly();
}

window.addEventListener('DOMContentLoaded', showStartMenu);
