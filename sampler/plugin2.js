function createNewTestSamplerPlugin() {
	let audioContext = null;
	let outputVolume = null;
	let properties = {
		volume: 0.7,
		ratio: 1
	};
	let noiseBuffer;
	let nodes = [];
	return {
		launch: (context, parameters) => {
			if (!(outputVolume)) {
				audioContext = context;
				outputVolume = audioContext.createGain();

				noiseBuffer = audioContext.createBuffer(1, 12345, audioContext.sampleRate);
				for (let ii = 0; ii < noiseBuffer.getChannelData(0).length; ii++) {
					noiseBuffer.getChannelData(0)[ii] = Math.random() * 2 - 1;
				}
			}
			if (parameters) {
				properties = parameters;
			}
			outputVolume.gain.value = properties.volume;
		},
		busy: () => {
			return false;
		},
		duration: () => {
			return 0.25;
		},
		start: (when, tempo) => {
			const boom = audioContext.createBufferSource();
			boom.buffer = noiseBuffer;
			boom.playbackRate.value = properties.ratio;
			boom.loop = true;
			boom.loopStart = Math.random() * 1.0;
			boom.connect(outputVolume);
			boom.start(when);
			boom.stop(when + 0.25);
			nodes.push(boom);
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