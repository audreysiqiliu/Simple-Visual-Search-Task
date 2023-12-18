// Ts-and-Ls MAIN EXPERIMENT CODE
// set all CONFIG constants in experimentDesign.js

// =================================================
// Load or Generate SubjectId ExpStruct
// =================================================

const skipToDemographics = false; // for testing
const preload = 0; // change to 1 if loading expStruct from json file
const loadSubjectId = 1; // input subject to load (name of json file)
const test = 1; // set to 1 to skip MTurk credentials

// ======================================
// Initialization
// ======================================

// Exp name and notes
const experimentName = "Ts-and-Ls_v1"; // identical to experiment folder name on server
const version = "private_pilot_1"; // change version to save data to separate data folder

// Start time and duration
let startDate, startTime, experimentStartTime, expTrialsStartTime, expTrialsEndTime;
let firstExperimentBlockStarted = false; // flag for logging start time of first block
let experimentDuration = null; // total time in experiment
let expTrialsDuration = null; // total time in experimental trials

let subjectId;
let expStruct;
let workerId = null;
let assignmentId = null;
let hitId = null;

// canvas
let canvas = document.getElementById('canvas'); // canvas size in .html
let ctx = canvas.getContext('2d');

// data output
let data = {}; // all data
let trialDataLog = []; // trial by trial data log 
let thisTrial;

// other variables
let logCounter = 0;
let iBlock = 0;
let iTrial = 0;

let currentTrial = null;
let currentStim = null;
let clickedLocations = [];
let hintHovered = false;
let hoverStartTime = null;
let lastMousePosition = null;
let mouseTrajectory = [];

let trialStartTime = null;
let trialEndTime = null;
let validScreenSize = false; // default false until checkScreenSize is run
let searchTimer;
let timeoutReached;  // track whether the timeout was reached


document.addEventListener('DOMContentLoaded', (event) => {

    // Start time and duration
    const start = new Date;
    startTime = start.getHours() + "-" + start.getMinutes() + "-" + start.getSeconds();
    startDate = start.getMonth() + "-" + start.getDate() + "-" + start.getFullYear();
    experimentStartTime = Date.now(); // time in miliseconds for ease of duration calculation

    if (preload === 0) {
        subjectId = Math.floor(100000 + Math.random() * 900000);
        expStruct = makeExpStruct();
    } else {
        subjectId = loadSubjectId;
        expStruct = loadExpStruct(subjectId);
    }

    if (test == 0) {
        workerId = getURLParameter('workerID');
        assignmentId = getURLParameter('assignmentId');
        hitId = getURLParameter('hitId');

        // error message if mTurk credentials are not found
        if (!workerId || !assignmentId || !hitId) {
            document.body.innerHTML = '<div style="color: red; text-align: center; margin-top: 20px;">Error: Unable to retrieve MTurk credentials. Please access the experiment from an MTurk HIT page.</div>';
            return;
        }
    }
    
    // update instructions based on config
    const totalTrials = CONFIG.practiceTrialsConditions.N_DUAL + CONFIG.practiceTrialsConditions.N_HIGH + CONFIG.practiceTrialsConditions.N_LOW + CONFIG.practiceTrialsConditions.N_NO_TARGETS + CONFIG.experimentTrialsConditions.N_DUAL + CONFIG.experimentTrialsConditions.N_HIGH + CONFIG.experimentTrialsConditions.N_LOW + CONFIG.experimentTrialsConditions.N_NO_TARGETS;
    const estimatedTime = Math.ceil((totalTrials * 15) / 60); // Assuming each trial takes 15 seconds
    const maxSearchTimeInSeconds = CONFIG.display.MAX_SEARCH_TIME / 1000;    
    document.querySelector('#total-trials').textContent = totalTrials;
    document.querySelector('#estimated-time').textContent = estimatedTime;
    document.querySelector('#time-limit').textContent = `${maxSearchTimeInSeconds} seconds`;

    // data object
    data = {
        subjectId: subjectId,
        startDate: startDate,
        startTime: startTime,
        expTrialsStartTime: expTrialsStartTime,
        experimentName: experimentName,
        version: version,
        assignmentId: assignmentId,
        workerId: workerId,
        hitId: hitId,
        demographics: {}, //fill later
        config: CONFIG,
        expStruct: expStruct,
        experimentDuration: experimentDuration,
        expTrialsDuration: expTrialsDuration,
        trialDataLog: trialDataLog
    };

    // kickstart experiment with instructions
    if (skipToDemographics) {
        // Hide all other elements
        document.querySelector('.instructionsDiv').style.display = 'none';
        document.querySelector('.canvas-container').style.display = 'none';
        // Add more selectors as needed to hide other elements

        // Show the demographics survey
        document.querySelector('.demoInfoDiv').style.display = 'block';
    } else {
        show_instructions1();
    }
});

// ==============================
// Helper Functions
// ==============================

function getURLParameter(name) {
    // for getting MTurk URL elements
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

async function loadExpStruct(subjectId) {
    try {
        const response = await fetch(`path/to/your/json/files/${subjectId}.json`);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const expStruct = await response.json();
        return expStruct;
    } catch (error) {
        console.error('Error loading the experiment structure:', error);
    }
}

function isWithinBounds(x, y, targetX, targetY) {
    // checks whether mouse click coordinates is within the bounds of stimulus
    return x >= targetX - CONFIG.stimuli.SQUARE_SIZE / 2 &&
           x <= targetX + CONFIG.stimuli.SQUARE_SIZE / 2 &&
           y >= targetY - CONFIG.stimuli.SQUARE_SIZE / 2 &&
           y <= targetY + CONFIG.stimuli.SQUARE_SIZE / 2;
}

function getRandomValue(min, max) {
    return Math.random() * (max - min) + min;
}

function logTrialData() {
    // transformations for data logging

    const trialType = currentTrial.trialType;
    const totalSearchTime = trialEndTime - trialStartTime;
    const distractors = currentTrial.stimuli.filter(stim => stim.targetCond !== 1);
    const highSalienceDistractorCount = distractors.filter(stim => stim.salience === 'high').length;
    const lowSalienceDistractorCount = distractors.filter(stim => stim.salience === 'low').length;
    const hitCount = currentTrial.stimuli.filter(stim => stim.clickCount > 0 && stim.targetCond === 1).length;
    const faCount = currentTrial.stimuli.filter(stim => stim.clickCount > 0 && stim.targetCond !== 1).length;
    const missCount = currentTrial.stimuli.filter(stim => stim.clickCount === 0 && stim.targetCond === 1).length;

    const allClicks = clickedLocations.map((click, index) => {
        return {
            x: click.x,
            y: click.y,
            correct: click.correct,
            time: click.time,
            clickCount: click.clickCount, //nth time this stim was clicked
            stimIndex: click.stimIndex,
            targetCond: click.targetCond,
            salience: click.salience,
            offset: click.offset,
            rotation: click.rotation
        };
    });
    
    const allClicksJSON = JSON.stringify(allClicks);
    const mouseTrajectoryJSON = JSON.stringify(mouseTrajectory);

    const trialData = {
        logCounter,
        iBlock,
        iTrial,
        trialType,
        highSalienceDistractorCount,
        lowSalienceDistractorCount,
        totalSearchTime,
        timeoutReached,
        hitCount,
        faCount,
        missCount,
        allClicks: allClicksJSON,
        mouseTrajectory: mouseTrajectoryJSON
    };

    console.log(trialData);
    return trialData;
}

function collectDemographicData() {

    // Collecting gender
    var genderElement = document.getElementById('genderList');
    var gender = genderElement.value;

    // Collecting age
    var ageElement = document.getElementById('ageList');
    var age = ageElement.value;

    // Collecting race
    var raceElements = document.getElementsByName('race');
    var races = [];
    for (var i = 0; i < raceElements.length; i++) {
        if (raceElements[i].checked) {
            races.push(raceElements[i].value);
        }
    }

    // Collecting ethnicity
    var ethnicityElement = document.getElementById('ethnicity');
    var ethnicity = ethnicityElement.value;

    // Collecting device information
    var deviceElement = document.getElementById('deviceList');
    var device = deviceElement.value;

    // Adding the collected information to the data object
    data.demographics = {
        gender: gender,
        yearOfBirth: age,
        race: races,
        ethnicity: ethnicity,
        device: device
    };
}


function sendData(data) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://54.224.65.24/experiments/Ts-and-Ls_v1/saveData.php', true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            // Check the response text from the PHP script
            const responseStatus = xhr.responseText;

            // Log a message indicating success or failure
            console.log("Data sent response: " + responseStatus);
            
            if (responseStatus === 'success') {
                // Redirect the user to the thank you page
                window.location.href = 'thankYou.html?status=success';
            } else if (responseStatus === 'empty') {
                // Handle empty data scenario
                window.location.href = 'thankYou.html?status=empty';
            } else {
                // Redirect the user to the thank you page with a failure status
                window.location.href = 'thankYou.html?status=failure';
            }
        }
    };
    xhr.send(JSON.stringify(data));
}


// ==============================
// Drawing Functions
// ==============================

function drawT(x, y, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillStyle = color;
    ctx.fillRect(-CONFIG.stimuli.BAR_WIDTH / 2, -CONFIG.stimuli.BAR_LENGTH / 2 + CONFIG.stimuli.BAR_GAP, CONFIG.stimuli.BAR_WIDTH, CONFIG.stimuli.BAR_LENGTH); // Vertical bar
    ctx.fillRect(-CONFIG.stimuli.BAR_LENGTH / 2, -CONFIG.stimuli.BAR_LENGTH / 2, CONFIG.stimuli.BAR_LENGTH, CONFIG.stimuli.BAR_WIDTH); // Horizontal bar
    ctx.restore();
}

function drawL(x, y, color, rotation, offset) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillStyle = color;
    ctx.fillRect(-CONFIG.stimuli.BAR_LENGTH / 2 + offset, -CONFIG.stimuli.BAR_LENGTH / 2 - CONFIG.stimuli.BAR_GAP, CONFIG.stimuli.BAR_WIDTH, CONFIG.stimuli.BAR_LENGTH);  //vertical bar
    ctx.fillRect(-CONFIG.stimuli.BAR_LENGTH / 2, CONFIG.stimuli.BAR_LENGTH / 2 - CONFIG.stimuli.BAR_WIDTH, CONFIG.stimuli.BAR_LENGTH, CONFIG.stimuli.BAR_WIDTH); // Horizontal bar
    ctx.restore();
}

function drawCenterHint() {
    ctx.save();
    ctx.fillStyle = 'rgb(0, 0, 0)'; //black
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, CONFIG.display.HINT_CIRCLE_RADIUS*2, 0, 2 * Math.PI); // Diameter of 5 for the circle
    ctx.fill();
    ctx.font = "12px Arial";  // Font size for the text
    ctx.fillStyle = 'black';  // Text color
    ctx.textAlign = "center";
    ctx.fillText("Hover cursor over circle to start next trial", canvas.width / 2, canvas.height / 2 - 15); // Position the text above the circle
    ctx.restore();
}

// ==============================
// Feedback and Event Handlers
// ==============================

// listen for canvas clicks
canvas.addEventListener('click', handleClick);

// prevents screen touches from triggering click events
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    alert('Touch input is not allowed in this experiment. Please use a mouse or trackpad.');
}, { passive: false });

document.querySelector('#startExperimentButton').addEventListener('click', function() {
    // Check screen size when experiment starts
    checkScreenSize();
    // Now that instructions have been viewed, start listening for resize events
    window.addEventListener('resize', checkScreenSize);
});

// Call this to submit data when the demographics form is completed
document.querySelector('#demoInfo form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the default form submission
    
    // Clear previous error messages
    const previousErrors = document.querySelectorAll('.error-message');
    previousErrors.forEach(error => error.remove());
    
    // Initialize a variable to keep track of the form validity
    let formValid = true;
    
    // Validate Gender Section
    const genderSelect = this.querySelector('#genderList');
    if (genderSelect.value === '' || genderSelect.value.startsWith('---Choose')) {
        formValid = false;
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Please select a gender.';
        genderSelect.parentNode.appendChild(errorMessage);
    }
    
    // Validate Age Section
    const ageSelect = this.querySelector('#ageList');
    if (ageSelect.value === '' || ageSelect.value.startsWith('---Choose')) {
        formValid = false;
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Please select a birth year.';
        ageSelect.parentNode.appendChild(errorMessage);
    }
    
    // Validate Race Section
    const checkboxGroup = this.querySelectorAll('input[type="checkbox"][name="race"]');
    const checkedCheckboxes = Array.from(checkboxGroup).filter(checkbox => checkbox.checked);
    if (checkedCheckboxes.length === 0) {
        formValid = false;
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Please select at least one race.';
        checkboxGroup[0].parentNode.appendChild(errorMessage);
    }

    // Validate Ethnicity Section
    const ethnicitySelect = this.querySelector('#ethnicity');
    if (ethnicitySelect.value === '' || ethnicitySelect.value.startsWith('---Choose')) {
        formValid = false;
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Please select an ethnicity.';
        ethnicitySelect.parentNode.appendChild(errorMessage);
    }
    
    // Validate Device Information Section
    const deviceSelect = this.querySelector('#deviceList');
    if (deviceSelect.value === '' || deviceSelect.value.startsWith('---Choose')) {
        formValid = false;
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Please select a device.';
        deviceSelect.parentNode.appendChild(errorMessage);
    }
    
    // If form is not valid, return early
    if (!formValid) {
        return;
    }
    
    // If form is valid, collect demographic data and send it
    const experimentEndTime = Date.now();
    data.experimentDuration = experimentEndTime - experimentStartTime;
    collectDemographicData();
    sendData(data);
});

function recordMousePosition(event) {
    // records mouse move start position, speed, and time relative to trialStartTime (when stimuli are drawn)

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const currentTime = new Date().getTime();
    const timeSinceTrialStart = currentTime - trialStartTime;
    
    if (lastMousePosition) {
        const dx = x - lastMousePosition.x;
        const dy = y - lastMousePosition.y;
        const dt = timeSinceTrialStart - lastMousePosition.time;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = distance / dt; // speed in pixels per millisecond
        
        mouseTrajectory.push({x, y, time: timeSinceTrialStart, speed});
    } else {
        mouseTrajectory.push({x, y, time: timeSinceTrialStart, speed: 0});
    }
    
    lastMousePosition = {x, y, time: timeSinceTrialStart};
}


function checkScreenSize() {
    // Shows HTML element that obstructs canvas if window is too small
    const warningDiv = document.getElementById('resizeWarning');

    if (window.innerWidth < canvas.width || window.innerHeight < canvas.height) {
        warningDiv.style.display = 'block';
        validScreenSize = false;
    } else {
        warningDiv.style.display = 'none';
        validScreenSize = true;
    }
}

function handleCircleHover(event) {
    // draws starting hover circle, then renders stimuli when hover condition is met

    // Get the canvas boundaries
    const rect = canvas.getBoundingClientRect();

    // Calculate the current mouse position relative to the canvas
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Define the center of the circle and its radius
    // The radius is twice the size of the displayed circle for a more forgiving hover detection area
    const circleCenterX = canvas.width / 2;
    const circleCenterY = canvas.height / 2;
    const circleRadius = CONFIG.display.HINT_CIRCLE_RADIUS * 2; 

    // Calculate the distance between the mouse pointer and the center of the circle
    const distanceFromCenter = Math.sqrt((mouseX - circleCenterX) ** 2 + (mouseY - circleCenterY) ** 2);
    
    // Check if the distance calculated is less than or equal to the circle's radius
    if (distanceFromCenter <= circleRadius) {
        // If it is the first time the mouse has hovered over the circle during this check
        if (!hintHovered) {
            hintHovered = true;
            hoverStartTime = new Date().getTime(); // Record the hover start time
        } 
        // If the mouse has been hovering over the circle
        else {
            const currentTime = new Date().getTime();
            
            // Calculate the total hover time
            const elapsed = currentTime - hoverStartTime;    
            
            // If the hover time exceeds the specified duration, render stimuli
            if (elapsed >= CONFIG.display.HOVER_DURATION) {
                canvas.removeEventListener('mousemove', handleCircleHover);
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
                setTimeout(() => {
                    renderStimuli(); // Call the function to render stimuli
                }, CONFIG.display.DELAY_BEFORE_TRIAL);
            }
        }
    } 
    // If the mouse is outside the circle, reset the hovered state
    else {
        hintHovered = false;
    }
}

function renderStimuli() {
    // Add listeners for clicks and spaces
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleSpaceBar);

    // draw all stimuli
    for (let i = 0; i < CONFIG.stimuli.N_STIMULI; i++) {
        currentStim = currentTrial.stimuli[i];

        // Get stim properties
        const { stimIndex, xpos, ypos, rgb, salience, offset, rotation, targetCond } = currentStim; // Destructuring to get all properties

        if (targetCond == 1) { // Is target
            drawT(xpos, ypos, rgb, rotation);
        } else {
            drawL(xpos, ypos, rgb, rotation, offset);
        }
    }

    trialStartTime = new Date().getTime(); // define trialStartTime
    canvas.addEventListener('mousemove', recordMousePosition); // start listening for mouse moves

    // Set a timer to automatically end the trial after 30 seconds
    searchTimer = setTimeout(() => {
        timeoutReached = true;
        giveFeedback();
    }, CONFIG.display.MAX_SEARCH_TIME);
}

function handleClick(event) {
    // records and draws markers for clicked locations
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Record clicked location and time
    clickedLocations.push({
        x, 
        y, 
        correct: false,
        time: new Date().getTime() - trialStartTime,
        clickCount: null,
        stimIndex: null,  // index of clicked stimulus (matches expStruct)
        targetCond: null,
        salience: null,
        offset: null,
        rotation: null,    
    });

    // Display an empty black circle where clicked
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.strokeStyle = 'black'; 
    ctx.lineWidth = 2;
    ctx.stroke();
}

function handleSpaceBar(event) {
    
    // Check if the pressed key is the spacebar and the screen size is valid
    if (event.code === 'Space' && validScreenSize) {
        const currentTime = new Date().getTime();
        
        // Check if stimuliRenderTime is defined and calculate elapsed time
        if (trialStartTime !== null) {
            const elapsed = currentTime - trialStartTime;
            
            // Check if the elapsed time is greater than or equal to the minimum search time
            if (elapsed >= CONFIG.display.MIN_SEARCH_TIME) {
                // Proceed to give feedback
                giveFeedback();
            }
        }
    }
}


function giveFeedback() {
    // gives feedback for each clicked location (red = fa; green = hits; empty circles = misses),
    // initializes next trial and logs trial data

    trialEndTime = new Date().getTime();
    clearTimeout(searchTimer);  // Clear the timer when feedback is shown to prevent it from triggering again

    // disable clicks, mousemove recording, and keydown
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('mousemove', recordMousePosition);
    window.removeEventListener('keydown', handleSpaceBar);
    clickedLocations.sort((a, b) => a.time - b.time);  // sort clicked locations by clicked time

    for (let clicked of clickedLocations) {
        for (let stimulus of currentTrial.stimuli) {
            if (isWithinBounds(clicked.x, clicked.y, stimulus.xpos, stimulus.ypos)) {
                stimulus.clickCount += 1; // adding to the clickCount
                clicked.clickCount = stimulus.clickCount;
                clicked.stimIndex = stimulus.stimIndex;
                clicked.targetCond = stimulus.targetCond;
                clicked.salience = stimulus.salience;
                clicked.offset = stimulus.offset; // only meaning full for targetCond = 1
                clicked.rotation = stimulus.rotation;
                if (stimulus.targetCond === 1 && expStruct[iBlock].isPractice) { //only fill if practice
                    // drawing filled green circle at clicked location
                    ctx.beginPath();
                    ctx.arc(clicked.x, clicked.y, 8, 0, 2 * Math.PI);
                    ctx.fillStyle = 'green';
                    ctx.fill();

                    clicked.correct = true;

                    break;
                }
            }
        }
        if (!clicked.correct && expStruct[iBlock].isPractice) {
            //drawing filled red circle
            ctx.beginPath();
            ctx.arc(clicked.x, clicked.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }
    }

    // Highlight missed Ts
    for (let stimulus of currentTrial.stimuli) {
        if (stimulus.targetCond === 1 && expStruct[iBlock].isPractice) {
            let found = clickedLocations.find(clicked => isWithinBounds(clicked.x, clicked.y, stimulus.xpos, stimulus.ypos));
            if (!found) {
                // drawing large empty black circle
                ctx.beginPath();
                ctx.arc(stimulus.xpos, stimulus.ypos, 30, 0, 2 * Math.PI);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
    }
    
    setTimeout(() => {
        canvas.removeEventListener('mousemove', handleCircleHover);
        startBlock(); // initialize next trial
    }, CONFIG.display.MIN_FEEDBACK_DURATION);

    // logging data
    thisTrial = logTrialData();
    trialDataLog.push(thisTrial);
    logCounter++;
}



// ==============================
// Experiment Logic
// ==============================

function startBlock() {
    // initializes blocks and calls startTrial

    document.querySelector('.canvas-container').style.display = 'flex';
    // hide all other divs
    hideAllInstructionDivs();

    if (iBlock < expStruct.length) {
        if (iTrial < expStruct[iBlock].trials.length) {
            startTrial();  // Start the trial
            iTrial++;  // Increment trial counter
        } else {
            iBlock++;  // Increment block counter
            iTrial = 0;  // Reset trial counter for the new block

            // Clear the canvas for the new message
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Prepare the message
            let message = ``;
            if (iBlock < expStruct.length) {
                if (expStruct[iBlock-1].isPractice) { // if previous block was practice
                    message += `Practice block ${iBlock} out of ${CONFIG.experimentDesign.N_PRACTICE_BLOCKS} completed!`
                    if (expStruct[iBlock].isPractice == 0){
                        message += `\nThe experiment starts in the next block. You will no longer recieve any feedback for your clicks.`
                    }
                    message += `\nBlocks left: ${expStruct.length - iBlock}.`;
                    message += `\nPress any key to continue.`;
                } else {
                    message += `You have completed experiment block ${iBlock-CONFIG.experimentDesign.N_PRACTICE_BLOCKS} out of ${CONFIG.experimentDesign.N_BLOCKS}`
                    message += `\nBlocks left: ${expStruct.length - iBlock}.`;
                    message += `\nPress any key to continue.`;
                }
            } else {
                message += `\nNo more blocks left!`;
                message += `\nPress the next button to continue.`;

                expTrialsEndTime = Date.now();
                expTrialsDuration = expTrialsEndTime - expTrialsStartTime;
                data.expTrialsDuration = expTrialsDuration;
                console.log("expTrialsDuration logged")

                // Show the demographics button
                show_startDemosButton()
                //sendData(data);  // Sending data after demos submission instead
            }

            // Set the font options
            ctx.font = '16px Arial';
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Split the message by newline and draw each line separately
            const lines = message.split('\n');
            lines.forEach((line, index) => {
                ctx.fillText(line, canvas.width / 2, canvas.height / 2 - (lines.length - 1 - index) * 20);
            });

            // Listen for a keypress event to continue
            window.addEventListener('keypress', function onKeypress() {
                window.removeEventListener('keypress', onKeypress);
                startBlock();
            });
        }
    }
}

function startTrial() {
    // Initializes trial
    if (!expStruct[iBlock].isPractice) {
        // clear feedback for experiment blocks
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // If this is the first experiment block, log the time and update the flag
        if (!firstExperimentBlockStarted) {
            expTrialsStartTime = Date.now(); // time in miliseconds for ease of duration calculation
            data.expTrialsStartTime = expTrialsStartTime;
            firstExperimentBlockStarted = true;
        }
    }

    currentTrial = expStruct[iBlock].trials[iTrial]; 
    timeoutReached = false; // Reset the timeout flag at the start of each trial
    clearTimeout(searchTimer);
    clickedLocations = [];
    mouseTrajectory = [];

    // Draw the hover circle and wait for hover condition to be met before rendering stimuli
    drawCenterHint();
    canvas.addEventListener('mousemove', handleCircleHover);
}