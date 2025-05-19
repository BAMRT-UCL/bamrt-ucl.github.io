function startCombinedTask() {
    console.log('[Controller v010] Starting Combined Task...');
    document.body.innerHTML = '<h2>Starting Combined Task...</h2>';

    startNLE(participantID, yearGroup, (nleData) => {
        console.log('[Controller v009] ✅ NLE task complete.');

        // Show transition page
        document.body.innerHTML = `
            <h2>Great job!</h2>
            <p>You’ve completed the first task.</p>
            <p>Click the button below when you're ready to begin the next task.</p>
            <button id="continueToBamrtBtn">Start Mental Rotation Task</button>
        `;

        // Phase 1: Setup listener (this won't start the task)
        document.getElementById('continueToBamrtBtn').addEventListener('click', () => {
            console.log('[Controller v009] 👆 BAMRT launch requested...');
            // Phase 2: Now delay actual launch until next event loop
            requestAnimationFrame(() => {
                window.controllerBAMRTCallback = (bamrtData) => {
                    console.log('[Controller v009] ✅ BAMRT complete.');
                    alert('Both tasks complete. Thank you!');
                };
                startBAMRT(participantID, yearGroup);
            });
        });
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
