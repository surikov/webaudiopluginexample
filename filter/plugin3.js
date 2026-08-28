function createNewTestFilterPlugin() {
	let audioContext = null;
	let inputGainNode;
	let outputGainNode;
	let flanger;
	let properties = {
		speed: 1
	};

	function flangerNode(audioContext, fromNode, toNode) {
		let inputGainNode = audioContext.createGain();
		let wetGainNode = audioContext.createGain();
		let delayNode = audioContext.createDelay();
		let gainNode = audioContext.createGain();
		let feedbackGainNode = audioContext.createGain();
		let oscillatorNode = audioContext.createOscillator();

		oscillatorNode.connect(gainNode);
		gainNode.connect(delayNode.delayTime);
		inputGainNode.connect(wetGainNode);
		inputGainNode.connect(delayNode);
		delayNode.connect(wetGainNode);
		delayNode.connect(feedbackGainNode);
		feedbackGainNode.connect(inputGainNode);

		oscillatorNode.type = 'sine';
		oscillatorNode.start(0);

		this.reset = function (delay, depth, feedback, speed) {
			delayNode.delayTime.value = delay;
			gainNode.gain.value = depth;
			feedbackGainNode.gain.value = feedback;
			oscillatorNode.frequency.value = speed;
		};
		fromNode.connect(inputGainNode);
		wetGainNode.connect(toNode);
		this.reset(0.005, 0.01, 0.5, 0.25);
		return this;
	}
	return {
		launch: (context, parameters) => {
			if (!(inputGainNode)) {
				audioContext = context;

				inputGainNode = audioContext.createGain();
				outputGainNode = audioContext.createGain();
				flanger = flangerNode(audioContext, inputGainNode, outputGainNode);

			}
			if (parameters) {
				properties = parameters;
				flanger.reset(0.005, 0.01, 0.5, properties.speed);
			}
		},
		busy: () => {
			return false;
		},
		schedule: (when, tempo, parameters) => {
			if (parameters) {
				let point = parameters;
				flanger.speed = point.speed;
				flanger.reset(0.005, 0.01, 0.5, point.speed);
			}
		},
		output: () => {
			return outputGainNode;
		},
		input: () => {
			return inputGainNode;
		}
	};
}