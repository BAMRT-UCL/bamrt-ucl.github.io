function startCombinedTask() {
    console.log('[Controller v011] Starting Combined Task...');
    document.body.innerHTML = '<h2>Starting Combined Task...</h2>';

    startNLE(participantID, yearGroup, (nleData) => {
        console.log('[Controller v011] ✅ NLE task complete.');

        // Set up transition screen with stable layout
        const transitionHTML = `
            <div style="padding: 2em; text-align: center;">
                <h2>Great job!</h2>
                <p>You’ve completed the first task.</p>
                <p>Click the button below when you're ready to begin the next task.</p>
                <button id="continueToBamrtBtn" style="font-size: 1.5em; padding: 0.8em 2em; margin-top: 1em;">Start Mental Rotation Task</button>
            </div>
        `;
        document.body.innerHTML = transitionHTML;

        // Double-log render confirmation
        console.log('[Controller v011] Transition screen shown');

        const btn = document.getElementById('continueToBamrtBtn');

        if (!btn) {
            console.error('[Controller v011] ❌ Button not found. Something overwrote DOM.');
            return;
        }

        btn.addEventListener('click', () => {
            console.log('[Controller v011] 👆 BAMRT button clicked — launching task...');

            // Set callback handler BEFORE launching
            window.controllerBAMRTCallback = (bamrtData) => {
                console.log('[Controller v011] ✅ BAMRT complete.');
                alert('Both tasks complete. Thank you!');
            };

            // Launch BAMRT
            startBAMRT(participantID, yearGroup);
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
