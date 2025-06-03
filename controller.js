/* controller.js */              /* pick any version tag you like */
console.log('[Controller v017] script loaded');

let participantID = '';
let yearGroup = '';
let nleCompleted = false;
let bamrtCompleted = false;
let nleDataStored    = null;
let bamrtDataStored  = null;


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

            // package both sets of results into one FormData
            const formData = new FormData();
            formData.append('entry.713541064', participantID);
            formData.append('entry.796534484', yearGroup);
            formData.append('entry.569501423', new Date().toISOString());
            formData.append('entry.187358765', JSON.stringify(nleData));    // ← your NLE field
            formData.append('entry.695655106', JSON.stringify(bamrtData)); // ← your BAMRT field

            fetch(
              'https://docs.google.com/forms/u/0/d/e/1FAIpQLScAPwRBzflFbnWjK4RZc2SXziBHBBHIkXStjs_slV3qGXs7vQ/formResponse',
              {
                method: 'POST',
                mode: 'no-cors',
                body: formData
              }
            )
            .then(() => {
              console.log('✅ Combined NLE + BAMRT uploaded');
              alert('Both tasks complete – data submitted. Thank you!');
              showStartMenu();
            })
            .catch(err => {
              console.error('❌ Upload failed:', err);
              alert('Error uploading data – check console.');
              showStartMenu();
            });
        };
    });
}

function startNLEOnly() {
    document.body.innerHTML = '<h2>Starting NLE Only...</h2>';
    startNLE(participantID, yearGroup, (nleData) => {
        console.log('✅ NLE task complete.');
        console.log(nleData);
        nleDataStored   = nleData;       // store the JSON blob
        nleCompleted    = true;
        showStartMenu();                 // go back to menu
        maybeSendCombined();             // if BAMRT is done already, trigger send
    });
}


function startBAMRTOnly() {
    document.body.innerHTML = '<h2>Starting BAMRT Only...</h2>';
    window.controllerBAMRTCallback = (bamrtData) => {
        console.log('✅ BAMRT complete.');
        console.log(bamrtData);
        bamrtDataStored = bamrtData;     // store the JSON blob
        bamrtCompleted  = true;
        showStartMenu();                 // go back to menu
        maybeSendCombined();             // if NLE is done already, trigger send
    };
    window.bamrtInternalStart(participantID, yearGroup);
}

function maybeSendCombined() {
    // Only proceed if we’ve run BOTH tasks:
    if (nleCompleted && bamrtCompleted) {
        console.log('[Controller] ▶ Both tasks done – sending combined data');

        const formData = new FormData();
        formData.append('entry.713541064', participantID);
        formData.append('entry.796534484', yearGroup);
        formData.append('entry.569501423', new Date().toISOString());
        formData.append('entry.187358765', JSON.stringify(nleDataStored));   // NLE field
        formData.append('entry.695655106', JSON.stringify(bamrtDataStored)); // BAMRT field

        fetch(
          'https://docs.google.com/forms/u/0/d/e/1FAIpQLScAPwRBzflFbnWjK4RZc2SXziBHBBHIkXStjs_slV3qGXs7vQ/formResponse',
          {
            method: 'POST',
            mode: 'no-cors',
            body: formData
          }
        )
        .then(() => {
          console.log('✅ Combined NLE + BAMRT uploaded');
          alert('Both tasks complete – data submitted. Thank you!');
        })
        .catch(err => {
          console.error('❌ Upload failed:', err);
          alert('Error uploading data – check console.');
        })
        .finally(() => {
          // Reset for next participant or next run:
          nleCompleted     = false;
          bamrtCompleted   = false;
          nleDataStored    = null;
          bamrtDataStored  = null;
          // Re-render the menu so fields clear (or remain filled, per your preference):
          showStartMenu();
        });
    }
}



function showStartMenu() {

    /* ----------  final thank-you ---------- */
    if (nleCompleted && bamrtCompleted) {
        document.body.innerHTML = `
           <div style="text-align:center">
               <img src="images/ucl_logo.png"
                    alt="UCL logo"
                    style="max-width:200px;margin:1em auto;">
               <h2>All tasks complete – thank you!</h2>
           </div>`;
        return;                      // nothing else to render
    }

    /* ----------  menu with logo ---------- */
    const disableNLE   = nleCompleted   ? 'disabled' : '';
    const disableBAMRT = bamrtCompleted ? 'disabled' : '';

    document.body.innerHTML = `
        <div style="text-align:center">
            <img src="images/ucl_logo.png"
                 alt="UCL logo"
                 style="max-width:200px;margin:1em auto;">
            <h1>Tasks Menu</h1>

            <label>Participant ID:
                <input type="text" id="participantId"
                       value="${participantID}"
                       ${participantID ? 'readonly' : ''}>
            </label><br/>

            <label>Year Group:
                <select id="yearGroup" ${participantID ? 'disabled' : ''}>
                    <option value="1" ${yearGroup === '1' ? 'selected' : ''}>Year&nbsp;1</option>
                    <option value="2" ${yearGroup === '2' ? 'selected' : ''}>Year&nbsp;2</option>
                    <option value="3" ${yearGroup === '3' ? 'selected' : ''}>Year&nbsp;3</option>
                    <option value="4" ${yearGroup === '4' ? 'selected' : ''}>Year&nbsp;4</option>
                    <option value="5" ${yearGroup === '5' ? 'selected' : ''}>Year&nbsp;5</option>
                    <option value="6" ${yearGroup === '6' ? 'selected' : ''}>Year&nbsp;6</option>
                </select>
            </label><br/><br/>

            <button onclick="setupAndStartNLE()"   ${disableNLE}>Start NLE</button>
            <button onclick="setupAndStartBAMRT()" ${disableBAMRT}>Start Mental Rotation</button>
        </div>`;
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
