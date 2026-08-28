function createNewTestPerformerPlugin() {
	let audioContext = null;
	let outputVolume = null;
	let properties = {
		volume: 0.7,
		kind: 'sine'
	};
	let nodes = [];
	return {
		launch: (context, parameters) => {
			if (!(outputVolume)) {
				audioContext = context;
				outputVolume = audioContext.createGain();
			}
			if (parameters) {
				properties = parameters;
			}
			outputVolume.gain.value = properties.volume;
		},
		busy: () => {
			return false;
		},
		strum: (when, pitches, tempo, slides) => {
			const wholeDUration = slides.reduce((sum, currentSlide) => sum + currentSlide.duration, 0);
			pitches.forEach((singlePitch) => {
				let beep = audioContext.createOscillator();
				beep.frequency.value = 440 * Math.pow(Math.pow(2, (1 / 12)), singlePitch - 69);
				beep.type = properties.kind;
				beep.connect(outputVolume);
				beep.start(when);
				beep.stop(when + wholeDUration);
				nodes.push(beep);
			});
		},
		cancel: () => {
			nodes.forEach((node) => {
				node.disconnect();
			});
			nodes = [];
		},
		output: () => {
			return outputVolume;
		}
	};
}