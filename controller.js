function startCombinedTask() {
    document.body.innerHTML = '<h2>Starting Combined Task...</h2>';
    // Start NLE first, and when done, start BAMRT
    startNLE((nleData) => {
        console.log('✅ NLE task complete, starting BAMRT...');
        startBAMRT(participantID, yearGroup);
        window.controllerBAMRTCallback = (bamrtData) => {
        console.log('[Controller v001] Starting Combined Task...');
		console.log('[Controller] Starting NLE Only...');
		console.log('[Controller] Starting BAMRT Only...');

            alert('Combined Task Complete. Data logged to console.');
        };
    });
}

function startNLEOnly() {
    document.body.innerHTML = '<h2>Starting NLE Only...</h2>';
    startNLE((nleData) => {
        console.log('✅ NLE task complete.');
        console.log(nleData);
        alert('NLE Task Complete. Data logged to console.');
    });
}

function startBAMRTOnly() {
    document.body.innerHTML = '<h2>Starting BAMRT Only...</h2>';
    startBAMRT(participantID, yearGroup);
    window.controllerBAMRTCallback = (bamrtData) => {
        console.log('✅ BAMRT complete.');
        console.log(bamrtData);
        alert('BAMRT Task Complete. Data logged to console.');
    };
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

