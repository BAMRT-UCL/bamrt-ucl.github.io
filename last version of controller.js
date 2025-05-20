/* ==========================================================
   Simple two-task launcher (NLE + BAMRT)
   – each task uploads its data immediately on completion
   – menu buttons grey out once a task is done
   – shows UCL logo on the landing page
   ========================================================== */

/* participant info */
let participantID  = '';
let yearGroup      = '';

/* flags to track completion */
let nleFinished    = false;
let bamrtFinished  = false;

/* ----------  MENU  ---------- */
function showStartMenu() {
    /* If both tasks are done, replace buttons with a thank-you */
    if (nleFinished && bamrtFinished) {
        document.body.innerHTML = `
            <div style="text-align:center">
                <img src="images/ucl_logo.png"
                     alt="UCL logo" style="max-width:200px;margin:1em auto">
                <h2>All tasks complete – thank you!</h2>
            </div>`;
        return;
    }

    document.body.innerHTML = `
        <div style="text-align:center">
            <img src="images/ucl_logo.png"
                 alt="UCL logo" style="max-width:200px;margin:1em auto">
            <h1>Tasks Menu</h1>
            <label>Participant ID:
                <input type="text" id="participantId"
                       value="${participantID}" />
            </label><br/>
            <label>Year Group:
                <select id="yearGroup">
                    <option value="">— choose —</option>
                    <option value="1">Year&nbsp;1</option>
                    <option value="2">Year&nbsp;2</option>
                    <option value="3">Year&nbsp;3</option>
                    <option value="4">Year&nbsp;4</option>
                    <option value="5">Year&nbsp;5</option>
                    <option value="6">Year&nbsp;6</option>
                </select>
            </label><br/><br/>

            <button id="startNleBtn">Start Number-Line Task</button>
            <button id="startBamrtBtn">Start Mental Rotation Task</button>
        </div>`;

    /* disable buttons that are already finished */
    if (nleFinished)
        document.getElementById('startNleBtn').disabled = true;
    if (bamrtFinished)
        document.getElementById('startBamrtBtn').disabled = true;

    /* restore year selection if it was chosen earlier */
    if (yearGroup)
        document.getElementById('yearGroup').value = yearGroup;

    /* hook up handlers */
    document.getElementById('startNleBtn').onclick   = setupAndStartNLE;
    document.getElementById('startBamrtBtn').onclick = setupAndStartBAMRT;
}

/* ----------  BUTTON HELPERS  ---------- */
function setupParticipantInfo() {
    participantID = document.getElementById('participantId').value.trim();
    yearGroup     = document.getElementById('yearGroup').value;
    if (!participantID || !yearGroup) {
        alert('Please enter Participant ID and Year Group');
        return false;
    }
    return true;
}

/* ----------  TASK LAUNCHERS  ---------- */
function setupAndStartNLE() {
    if (!setupParticipantInfo()) return;

    document.body.innerHTML = '<h2>Starting Number-Line Task…</h2>';
    startNLE(participantID, yearGroup, (nleData) => {
        nleFinished = true;                          // flag done
        console.log('✅ NLE complete', nleData);
        alert('Number-Line Task complete. Data uploaded.');
        showStartMenu();                             // back to menu
    });
}

function setupAndStartBAMRT() {
    if (!setupParticipantInfo()) return;

    document.body.innerHTML = '<h2>Starting Mental Rotation Task…</h2>';
    window.controllerBAMRTCallback = (bamrtData) => {
        bamrtFinished = true;                        // flag done
        console.log('✅ BAMRT complete', bamrtData);
        alert('Mental Rotation Task complete. Data logged to console.');
        showStartMenu();                             // back to menu
    };
    window.bamrtInternalStart(participantID, yearGroup);
}

/* ----------  INIT ---------- */
window.addEventListener('DOMContentLoaded', showStartMenu);
