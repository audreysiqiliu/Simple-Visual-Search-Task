// functions for showing instructions and demographics
function transitionInstructions(hideId, showId, imageUpdates = []) {
    if(hideId) document.querySelector(`#${hideId}`).style.display = 'none';
    if(showId) document.querySelector(`#${showId}`).style.display = 'block';

    imageUpdates.forEach(update => {
        document.querySelector(`#${update.id}`).src = update.src;
    });
}

function show_instructions1() {
    transitionInstructions(null, 'instructions_page1');
}

function show_instructions2() {
    transitionInstructions('instructions_page1', 'instructions_page2', [
        {id: 'Example_Ls', src: 'stimuli/Example_Lstim.png'},
        {id: 'Example_Ts', src: 'stimuli/Example_Tstim.png'}
    ]);
}

function show_instructions3() {
    transitionInstructions('instructions_page2', 'instructions_page3', [
        {id: 'Example_TargetPresent', src: 'stimuli/Example_TargetPresent.png'},
        {id: 'Example_TargetAbsent', src: 'stimuli/Example_TargetAbsent.png'}
    ]);
}

function show_instructions4() {
    transitionInstructions('instructions_page3', 'instructions_page4', [
        {id: 'ClickProgression', src: 'stimuli/ClickProgression.png'}
    ]);
}

function show_instructions5() {
    transitionInstructions('instructions_page4', 'instructions_page5', [
        {id: 'CorrectClick', src: 'stimuli/Correct_Click.png'},
        {id: 'IncorrectClick', src: 'stimuli/Incorrect_Click.png'},
        {id: 'MissedTarget', src: 'stimuli/Missed_Target.png'},
        {id: 'DoubleClick_Feedback', src: 'stimuli/DoubleClick_Feedback.png'}
    ]);
}

function show_instructions6() {
    transitionInstructions('instructions_page5', 'instructions_page6', [
        {id: 'Hover_Cursor', src: 'stimuli/HoverCircle_Cursor.png'}
    ]);
}

function show_instructions7() {
    transitionInstructions('instructions_page6', 'instructions_page7');
}

function show_reminder_instructions() {
    transitionInstructions('instructions_page7', 'reminderInstructions', [
        {id: 'Example_TargetPresent2', src: 'stimuli/Example_TargetPresent.png'},
        {id: 'Example_TargetAbsent2', src: 'stimuli/Example_TargetAbsent.png'}
    ]);
    document.querySelector('.canvas-container').style.display = 'none';
}

function hideAllInstructionDivs() {
    const instructionDivs = document.querySelectorAll('.instructionsDiv');
    instructionDivs.forEach(div => div.style.display = 'none');
}

function show_startDemosButton() {
    document.getElementById('startDemosButton').style.display = 'block';
}

function showDemographicForm() {
    // Hide the canvas
    document.getElementById('canvas').style.display = 'none';

    // Show the demographics form
    document.getElementById('demoInfo').style.display = 'block';

    // Hide the "next" button
    document.getElementById('startDemosButton').style.display = 'none';
}