// Notes:
// Trial counts for dual target design

//----------------------------------
// EXPERIMENT CONFIG
//----------------------------------

const CONFIG = {
	stimuli:{
		// stimuli display properties
		BAR_WIDTH: 10, // only used in VS.js when drawing stim
		BAR_LENGTH: 30,
		BAR_GAP: 12, // gap between horizontal and vertical bars
		L_MAX_JITTER: 6, // the larger this number and closer it is to BAR_LENGTH/2, the more Ls look like Ts
		MIN_STIM_GAP: 8, // for best results make sure that this is more than BAR_GAP/2
		N_STIMULI: 25,
		GRID_ROWS: 6, // even numbers are better to make sure hover circle doesn't cover stimulus
		GRID_COLS: 8,
		SQUARE_SIZE: 80,
		POSSIBLE_ROTATIONS: [0, 90, 180, 270],
		RANGE_HIGH_SALIENCE: [57, 65], // percent black range for high salience stims
		RANGE_LOW_SALIENCE: [22, 45],
		PCT_HIGH_SALIENCE_DISTRACTORS: .05
	},
	experimentDesign:{
		// num of practice and experiment blocks
		N_PRACTICE_BLOCKS: 1,
		N_BLOCKS: 6
	},
	practiceTrialsConditions: {
		// total num of trials in each condition across all practice blocks
		N_DUAL: 2,
		N_HIGH: 2,
		N_LOW: 2,
		N_NO_TARGETS: 6
	},
	experimentTrialsConditions: {
		// total num of trials in each condition across all experiment blocks
		N_DUAL: 10,
		N_HIGH: 10,
		N_LOW: 10,
		N_NO_TARGETS: 30
	},
	display: {
		// other vars not relevant to constructing expStruct
		DELAY_BEFORE_TRIAL: 300, // in exp trials the total ITI is this plus MIN_FEEDBACK_DURATION
		HINT_CIRCLE_RADIUS: 2.5,
		HOVER_DURATION: 100,
		MIN_FEEDBACK_DURATION: 200, // delay between drawing feedback and showing hover
		MIN_SEARCH_TIME: 500,
		MAX_SEARCH_TIME: 30000,
	},
	canvasDimensions: {
		canvasWidth: canvas.width,
		canvasLength: canvas.length,
	}
};

//----------------------------------
// GRID SETUP
//----------------------------------

// Calculate dimensions and starting positions
const GRID_WIDTH = CONFIG.stimuli.GRID_COLS * CONFIG.stimuli.SQUARE_SIZE;
const GRID_HEIGHT = CONFIG.stimuli.GRID_ROWS * CONFIG.stimuli.SQUARE_SIZE;
const START_X = (canvas.width - CONFIG.stimuli.GRID_COLS * CONFIG.stimuli.SQUARE_SIZE) / 2 + CONFIG.stimuli.SQUARE_SIZE / 2;
const START_Y = (canvas.height - CONFIG.stimuli.GRID_ROWS * CONFIG.stimuli.SQUARE_SIZE) / 2 + CONFIG.stimuli.SQUARE_SIZE / 2;
const XY_MAX_JITTER = (CONFIG.stimuli.SQUARE_SIZE - CONFIG.stimuli.BAR_LENGTH - CONFIG.stimuli.BAR_GAP)/2 - CONFIG.stimuli.MIN_STIM_GAP;

// Generate preset locations based on the grid parameters
const presetLocations = [];
for (let row = 0; row < CONFIG.stimuli.GRID_ROWS; row++) {
    for (let col = 0; col < CONFIG.stimuli.GRID_COLS; col++) {
        presetLocations.push({
            x: START_X + col * CONFIG.stimuli.SQUARE_SIZE,
            y: START_Y + row * CONFIG.stimuli.SQUARE_SIZE
        });
    }
}

//--------------------------------
// BLOCK, TRIAL, STIMULUS CLASSES
//--------------------------------

class Block {
	constructor(isPractice, trials) {
	  this.isPractice = isPractice;
	  this.trials = trials;
	}
}
  
class Trial {
	constructor(trialType, stimuli) {
	  this.trialType = trialType; 
	  this.stimuli = stimuli; // "dual", "single high", "single low", "no_targ"
	}
}

// Define the Stimulus class
class Stimulus {
	constructor(stimIndex,xpos, ypos, rgb, salience, offset, rotation, targetCond){
	  this.stimIndex = stimIndex;
	  this.xpos = xpos;
	  this.ypos = ypos;
	  this.rgb = rgb;
	  this.salience = salience
	  this.offset = offset;
	  this.rotation = rotation;
	  this.targetCond = targetCond;
    this.clickCount = 0; //track click count
	}
}

//---------------------------
// STIMULUS CLASS FUNCTIONS
//---------------------------
// unless otherwise noted all stim class functions 
// take stimulus index as an input &
// returns stimulus properties as an output

// structural function to generate a stimulus object
const generateStimuli = (xpos, ypos, rgb, salience, offset, rotation, targetCondition, clickCount) => {
return new Stimulus(xpos, ypos, rgb, salience, offset, rotation, targetCondition, clickCount);
}

// xpos with jitter
const jitteredX = (index,shuffledLocations) => {
	// input index and array of shuffled starting locations
	const jitterX = Math.floor((Math.random() * 2 - 1) * XY_MAX_JITTER);
	return shuffledLocations[index].x + jitterX;
}

// ypos with jitter
const jitteredY = (index,shuffledLocations) => {
	const jitterY = Math.floor((Math.random() * 2 - 1) * XY_MAX_JITTER);
	return shuffledLocations[index].y + jitterY;
}

// rgb value and salience
const generateColorSalience = (index) => {
	// outputs object with two values:
	// 1. rgb value of stim color (grey of varying % black)
	// 2. label of whether this color is high or low salience

	let rgb, salience;
	if (index === 0) {
	  rgb = generateGreyColor(CONFIG.stimuli.RANGE_HIGH_SALIENCE);
	  salience = 'high';
	} else if (index === 1) {
	  rgb = generateGreyColor(CONFIG.stimuli.RANGE_LOW_SALIENCE);
	  salience = 'low';
	} else {
	  const isHighSalience = Math.random() < CONFIG.stimuli.PCT_HIGH_SALIENCE_DISTRACTORS;
	  rgb = isHighSalience ? 
		generateGreyColor(CONFIG.stimuli.RANGE_HIGH_SALIENCE) : 
		generateGreyColor(CONFIG.stimuli.RANGE_LOW_SALIENCE);
	  salience = isHighSalience ? 'high' : 'low';
	}
  
	return { rgb, salience };
}

// L-offset
const generateOffset = (index) => {
	// used to jitter L bar rightwards, this stim property is only used in main functions if targ = 0
	return Math.floor(Math.random() * (CONFIG.stimuli.L_MAX_JITTER + 1)); 
}
  
// rotation
const generateRotation = (index) => {
	return CONFIG.stimuli.POSSIBLE_ROTATIONS[Math.floor(Math.random() * CONFIG.stimuli.POSSIBLE_ROTATIONS.length)];
}

// target condition
const generateTarget = (index, trialType) => {
	// input: index and trialType (experiment conditions: dual, single_high, single_low, or no target)
	// output: 0 = non-target (Ls) or 1 = target (Ts)
	if (trialType === "dual") {
		return (index === 0 || index === 1) ? 1 : 0;
	} else if (trialType === "single_high") {
		return index === 0 ? 1 : 0;
	} else if (trialType == "single_low") {
		return index === 1 ? 1 : 0;
	} else { // no target
		return 0
	}
}
  
//----------------------------------
// MAIN FUNCTIONS
//----------------------------------

// input: 1) num of trials to create 2) which exp condition
// output: trial object with properties: 1) trial condition 2) stimulus array
function createTrials(nTrials, trialType) {
    return Array.from({ length: nTrials }, () => {
        const shuffledLocations = shuffle([...presetLocations]); // shuffle preset locations for each trial
        // stimuli loop
        const stimuli = Array.from({ length: CONFIG.stimuli.N_STIMULI }, (_, index) => {
			  const stimIndex = index;
        const xpos = jitteredX(index, shuffledLocations);
        const ypos = jitteredY(index, shuffledLocations);
        const { rgb, salience } = generateColorSalience(index);
        const offset = generateOffset(index);
        const rotation = generateRotation(index);
        const targetCondition = generateTarget(index,trialType); /* define logic for targetCondition here */
        return new Stimulus(stimIndex, xpos, ypos, rgb, salience, offset, rotation, targetCondition);
      });
      return new Trial(trialType, stimuli);
    });
}

function makeExpStruct() {
    let expStruct = [];
    
    // Create practice trials and shuffle them
    let practiceTrials = [];
    for (let trialType in CONFIG.practiceTrialsConditions) {
		let readableTrialType; // for data logging
		if (trialType === 'N_DUAL') readableTrialType = 'dual';
		else if (trialType === 'N_HIGH') readableTrialType = 'single_high';
		else if (trialType === 'N_LOW') readableTrialType = 'single_low';
		else if (trialType === 'N_NO_TARGETS') readableTrialType = 'no_target';
		practiceTrials.push(...createTrials(CONFIG.practiceTrialsConditions[trialType], readableTrialType));
	}
    practiceTrials = shuffle(practiceTrials);

    // Create experimental trials and shuffle them
    let experimentTrials = [];
    for (let trialType in CONFIG.experimentTrialsConditions) {
		let readableTrialType;
		if (trialType === 'N_DUAL') readableTrialType = 'dual';
		else if (trialType === 'N_HIGH') readableTrialType = 'single_high';
		else if (trialType === 'N_LOW') readableTrialType = 'single_low';
		else if (trialType === 'N_NO_TARGETS') readableTrialType = 'no_target';
		experimentTrials.push(...createTrials(CONFIG.experimentTrialsConditions[trialType], readableTrialType));
	}
    experimentTrials = shuffle(experimentTrials);
    
    // Distribute practice trials into practice blocks
    let practiceTrialsPerBlock = practiceTrials.length / CONFIG.experimentDesign.N_PRACTICE_BLOCKS;
    for (let i = 0; i < CONFIG.experimentDesign.N_PRACTICE_BLOCKS; i++) {
        const startIdx = i * practiceTrialsPerBlock;
        const endIdx = startIdx + practiceTrialsPerBlock;
        const blockTrials = practiceTrials.slice(startIdx, endIdx);
        const block = new Block(true, blockTrials);
        expStruct.push(block);
    }
    
    // Distribute experimental trials into experiment blocks
    let experimentTrialsPerBlock = experimentTrials.length / CONFIG.experimentDesign.N_BLOCKS;
    for (let i = 0; i < CONFIG.experimentDesign.N_BLOCKS; i++) {
        const startIdx = i * experimentTrialsPerBlock;
        const endIdx = startIdx + experimentTrialsPerBlock;
        const blockTrials = experimentTrials.slice(startIdx, endIdx);
        const block = new Block(false, blockTrials);
        expStruct.push(block);
    }

    return expStruct;
}
  
//----------------------------------
// UTILITY FUNCTIONS
//----------------------------------

function shuffle(array) {
    let currentIndex = array.length, randomIndex, tempValue;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        tempValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = tempValue;
    }
    return array;
}

// takes [min percent black, max percent black] and outputs a random rgb value within this percentage black range
function generateGreyColor(percentBlackRange) {
	// Extract the min and max percentage from the array
	const [minPercentBlack, maxPercentBlack] = percentBlackRange;
	// Generate a random percentage within the specified range
	const randomPercentBlack = Math.random() * (maxPercentBlack - minPercentBlack) + minPercentBlack;
	// Convert this percentage to an integer between 0 and 255
	const greyValue = Math.floor((1 - (randomPercentBlack / 100)) * 255);
	// Create the RGB color string
	const rgbColor = `rgb(${greyValue}, ${greyValue}, ${greyValue})`;
	return rgbColor;
}