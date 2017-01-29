declare let nx: any
declare let beatMatrix: any

let bpmSlider;
let volumeSlider;
let playbutton;
let stepUpButton;
let stepDownButton;
let tapTempoButton;

const BEATMATRIX_HEIGHT: number = 250;

const START_BPM: number = 60;
const BPM_STEP: number = 4;
const BPM_MIN_VALUE: number = 40;
const BPM_MAX_VALUE: number = 160;

const HIHAT_OPEN: string = "HIHAT_OPEN";
const HIHAT_CLOSED: string = "HIHAT_CLOSED";
const SNARE: string = "SNARE";
const KICK: string = "KICK";

let amountBeats: number = 2*16;

let tapTimes: Array<number> = new Array<number>();
let tapTempoTimeout: number;

//the notes
let noteNames: Array<string> = [ HIHAT_CLOSED, HIHAT_OPEN, SNARE, KICK ];

let gainNode = new Tone.Gain(1).toMaster();

let time: number = performance.now();
let webworker: Worker = new Worker("scripts/webworker/timingWorker.js");
webworker.postMessage("start");
webworker.onmessage = (event: any): void => {
	if (event.data === "tick") {
		console.log("tick " + (performance.now() - time));
		time = performance.now();
	}
	else {
		console.log("  webworker says: " + event.data);
	}
};



///////////////////////////////// sound banks
let notePlayer;
let loop;
let switchSoundbank = ( pSoundbank: string ): void => {
	let tUrlObject: Object;
	switch( pSoundbank ) {
	case "505":
		tUrlObject = {
			HIHAT_CLOSED :	"./content/audio/505/hhc.mp3",
			HIHAT_OPEN :	"./content/audio/505/hho.mp3",
			SNARE :			"./content/audio/505/sn.mp3",
			KICK :			"./content/audio/505/bd.mp3",
		};
		break;
	case "hydro":
	default:
		tUrlObject = {
			HIHAT_CLOSED :	"./content/audio/hydro/hhc.mp3",
			HIHAT_OPEN :	"./content/audio/hydro/hho.mp3",
			SNARE :			"./content/audio/hydro/sn.mp3",
			KICK : 			"./content/audio/hydro/bd.mp3",
		};
	}
	notePlayer = new Tone.MultiPlayer({
		urls : tUrlObject,
		volume : 0,
	}).connect( gainNode );

	let tIncrementingArray: Array<number> = new Array<number>(amountBeats);
	for ( let i = 0; i < amountBeats; i++ ) {
		tIncrementingArray[i] = i;
	}
	loop = new Tone.Sequence(function(time, col){
		let column = beatMatrix.matrix[col];
		for (let i = 0; i < 5; i++) {
			if (column[i] === 1) {
				//slightly randomized velocities
				let vel = 0.7;
				if ( col % 16 === 0 ) {
					vel += 0.1;
				}
				if ( col % 4 === 0 ) {
					vel += 0.2;
				}
				if ( col % 2 === 1 ) {
					vel -= 0.1;
				}
				notePlayer.start(noteNames[i], time, 0, "1n", 0, vel);
			}
		}
	}, tIncrementingArray, "16n");
}

switchSoundbank( "hydro" );



Tone.Transport.start();




nx.onload = function() {
	nx.colorize("#a6d45c");

	beatMatrix.col = amountBeats;
	beatMatrix.row = 4;
	beatMatrix.init();
	beatMatrix.resize($("#Content").width(), BEATMATRIX_HEIGHT);
	beatMatrix.draw();

	// bass drum
	for ( let i = 0; i < amountBeats; i++ ) {
		if ( i % 8 === 0 ) {
			beatMatrix.setCell(i, 3, true);
		}
	}

	// snare
	for ( let i = 0; i < amountBeats; i++ ) {
		if ( i % 8 === 4 ) {
			beatMatrix.setCell(i, 2, true);
		}
	}

	// open hihat
	for ( let i = 0; i < amountBeats; i++ ) {
		if ( i % 2 === 0 ) {
			beatMatrix.setCell(i, 0, true);
		}
	}
}


let fillLeadingChar = ( pString: string, pChar: string, pAmountChars: number ): string => {
	if ( isNaN( pAmountChars ) ) {
		return pString;
	}
	pAmountChars = Math.round( pAmountChars );
	let tCharArrays: string = new Array( pAmountChars + 1 ).join( pChar );
	return ( tCharArrays + pString ).slice( -pAmountChars );
}


let clockStart: Date;
let clockLoop = (): void => {
	let tDate = new Date();
	let tMinutes: string = fillLeadingChar( clockStart.getMinutes().toFixed(), '0', 2 );
	let tSeconds: string = fillLeadingChar( clockStart.getSeconds().toFixed(), '0', 2 );
	$( "#clockDiv" ).text( tMinutes + ':' + tSeconds );
	clockStart.setTime( clockStart.getTime() + 1000 );
};


/** STARTUP */
$(function(){

	Tone.Transport.bpm.value = START_BPM;

	bpmSlider = new Interface.Slider({
		name : "BPM",
		min : BPM_MIN_VALUE,
		max : BPM_MAX_VALUE,
		value : START_BPM,
		drag : function(val){
			Tone.Transport.bpm.value = val;
			$("#BPM>#Name").text( val.toFixed() );
		}
	});
	$("#BPM>#Name").text( START_BPM.toFixed() );

	volumeSlider = new Interface.Slider({
		name : "VOL",
		min : 0,
		max : 1,
		value : 1,
		drag : function(val){
			gainNode.gain.rampTo( val, 100 / 1000 );
		}
	});

	playbutton = new Interface.Button({
		text : "Start",
		activeText : "Stop",
		type : "toggle",
		key : 32, //spacebar
		start : function(){
			loop.start();
		},
		end : function(){
			loop.stop();
		},
	});

	stepUpButton = new Interface.Button({
		text : "+ " + BPM_STEP + " BPM",
		start : function(){
			let tNewTempo: number = Math.min( Tone.Transport.bpm.value + BPM_STEP, BPM_MAX_VALUE );
			Tone.Transport.bpm.value = tNewTempo;
			bpmSlider.value( tNewTempo );
			$("#BPM>#Name").text( tNewTempo.toFixed() );
		}
	});

	stepDownButton = new Interface.Button({
		text : "- " + BPM_STEP + " BPM",
		start : function(){
			let tNewTempo: number = Math.max( Tone.Transport.bpm.value - BPM_STEP, BPM_MIN_VALUE );
			Tone.Transport.bpm.value = tNewTempo;
			bpmSlider.value( tNewTempo );
			$("#BPM>#Name").text( tNewTempo.toFixed() );
		}
	});

	tapTempoButton = new Interface.Button({
		text : "Tap Tempo",
		start : function(){
			if (tapTimes.length > 4) {
				tapTimes.splice(0, 1);
			}
			tapTimes.push(Date.now());

			if (tapTimes.length >= 2) {
				// weighted tap times: later taps gain more weight
				let tMeanDiff: number = 0;
				let tDivider: number = 0;
				for (let i: number = 1; i < tapTimes.length; i++) {
					let tDiff: number = tapTimes[i] - tapTimes[i-1];
					tMeanDiff += tDiff * i;
					tDivider += i;
				}
				tMeanDiff /= tDivider;
				let tMeanBpm: number = 60 * 1000 / tMeanDiff;

				let tNewTempo: number = Math.max( tMeanBpm, BPM_MIN_VALUE );
				tNewTempo = Math.min(tNewTempo, BPM_MAX_VALUE);
				Tone.Transport.bpm.value = tNewTempo;
				bpmSlider.value( tNewTempo );
				$("#BPM>#Name").text( tNewTempo.toFixed() );
			}

			if (tapTempoTimeout != null) {
				window.clearTimeout(tapTempoTimeout);
			}
			tapTempoTimeout = window.setTimeout(() => {
				tapTimes.splice(0, tapTimes.length);
			}, 2 * 1000 * 60 / BPM_MIN_VALUE);
		}
	});

	// Interface.Loader();

	$(window).on("resize", function(){
		beatMatrix.resize($("#Content").width(), BEATMATRIX_HEIGHT);
		beatMatrix.draw();
	});

	clockStart = new Date( 0 );
	clockLoop();
	setInterval( clockLoop, 1000 );
});
