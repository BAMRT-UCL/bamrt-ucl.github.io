/* =========================================================
   Combined flow: NLE  →  “Ready?” screen  →  BAMRT
   ========================================================= */

/* helper: draw the transition screen ver013*/
function showTransitionAfterNLE() {
    document.body.innerHTML = `
      <h2>Great job!</h2>
      <p>You’ve completed the first task.</p>
      <p>When you are ready, click the button below to begin the
         <strong>Mental Rotation Task</strong>. The task is timed, so make sure
         you’re comfortable before you start.</p>
      <button id="startBamrtBtn">Start Mental Rotation Task</button>
    `;

    /* launch BAMRT when the participant clicks */
    document.getElementById('startBamrtBtn').addEventListener('click', () => {
        console.log('[Controller] ▶ Starting BAMRT…');
        window.bamrtInternalStart(participantID, yearGroup);
    });
}

/* main entry-point called from the menu */
function startCombinedTask() {
    console.log('[Controller] ▶ Starting combined flow');
    document.body.innerHTML = '<h2>Number-Line Task loading…</h2>';

    /* run NLE first */
    startNLE(participantID, yearGroup, (nleData) => {
        console.log('[Controller] ✅ NLE finished');
        /* draw the transition screen */
        showTransitionAfterNLE();

        /* set up what happens when BAMRT ends */
        window.controllerBAMRTCallback = (bamrtData) => {
            console.log('[Controller] ✅ BAMRT finished');
            alert('Both tasks complete – thank you!');
            showStartMenu();          // back to landing page
        };
    });
}


function startNLEOnly() {
    document.body.innerHTML = '<h2>Starting NLE Only...</h2>';
    startNLE(participantID, yearGroup, (nleData) => {
        console.log('✅ NLE task complete.');
        console.log(nleData);
        alert('NLE Task Complete. Data logged to console.');
    });
}

function startBAMRTOnly() {
    document.body.innerHTML = '<h2>Starting BAMRT Only...</h2>';
    window.controllerBAMRTCallback = (bamrtData) => {
        console.log('✅ BAMRT complete.');
        console.log(bamrtData);
        alert('BAMRT Task Complete. Data logged to console.');
    };
    window.bamrtInternalStart(participantID, yearGroup);  // ← correct call
}


// Setup participant & year input at start
let participantID = '';
let yearGroup = '';

function showStartMenu() {
    document.body.innerHTML = `
        <h1>Combined Tasks Menu</h1>
        <label>Participant ID: <input type="text" id="participantId" /></label><br/>
        <label>Year Group:
            <select id="yearGroup">
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="5">Year 5</option>
                <option value="6">Year 6</option>
            </select>
        </label><br/>
        <button onclick="setupAndStartCombined()">Start Combined Task</button>
        <button onclick="setupAndStartNLE()">Start NLE Only</button>
        <button onclick="setupAndStartBAMRT()">Start BAMRT Only</button>
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
