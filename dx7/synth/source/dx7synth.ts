function newDX7FMSynth1(): MZXBX_AudioPerformerPlugin {
	console.log('create newDX7FMSynth1 v1.02');
	let matrixConnectionAlgorithmsDX7: ConnectionSchemeDX7[] = [
		{ outputMix: [0, 2], modulationMatrix: [[1], [], [3], [4], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 2], modulationMatrix: [[1], [], [3], [4], [5], []], feedbackMatrix: [[], [1], [], [], [], []] }
		, { outputMix: [0, 3], modulationMatrix: [[1], [2], [], [4], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 3], modulationMatrix: [[1], [2], [], [4], [5], []], feedbackMatrix: [[], [], [], [], [], [3]] }
		, { outputMix: [0, 2, 4], modulationMatrix: [[1], [], [3], [], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 2, 4], modulationMatrix: [[1], [], [3], [], [5], []], feedbackMatrix: [[], [], [], [], [], [4]] }
		, { outputMix: [0, 2], modulationMatrix: [[1], [], [3, 4], [], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 2], modulationMatrix: [[1], [], [3, 4], [], [5], []], feedbackMatrix: [[], [], [], [3], [], []] }
		, { outputMix: [0, 2], modulationMatrix: [[1], [], [3, 4], [], [5], []], feedbackMatrix: [[], [1], [], [], [], []] }
		, { outputMix: [0, 3], modulationMatrix: [[1], [2], [], [4, 5], [], []], feedbackMatrix: [[], [], [2], [], [], []] }
		, { outputMix: [0, 3], modulationMatrix: [[1], [2], [], [4, 5], [], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 2], modulationMatrix: [[1], [], [3, 4, 5], [], [], []], feedbackMatrix: [[], [1], [], [], [], []] }
		, { outputMix: [0, 2], modulationMatrix: [[1], [], [3, 4, 5], [], [], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 2], modulationMatrix: [[1], [], [3], [4, 5], [], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 2], modulationMatrix: [[1], [], [3], [4, 5], [], []], feedbackMatrix: [[], [1], [], [], [], []] }
		, { outputMix: [0], modulationMatrix: [[1, 2, 4], [], [3], [], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0], modulationMatrix: [[1, 2, 4], [], [3], [], [5], []], feedbackMatrix: [[], [1], [], [], [], []] }
		, { outputMix: [0], modulationMatrix: [[1, 2, 3], [], [2], [], [5], []], feedbackMatrix: [[], [], [], [4], [], []] }
		, { outputMix: [0, 3, 4], modulationMatrix: [[1], [2], [], [5], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 1, 3], modulationMatrix: [[2], [2], [], [4, 5], [], []], feedbackMatrix: [[], [], [2], [], [], []] }
		, { outputMix: [0, 1, 3, 4], modulationMatrix: [[2], [2], [], [5], [5], []], feedbackMatrix: [[], [], [2], [], [], []] }
		, { outputMix: [0, 2, 3, 4], modulationMatrix: [[1], [], [5], [5], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 1, 3, 4], modulationMatrix: [[], [2], [], [5], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 1, 2, 3, 4], modulationMatrix: [[], [], [5], [5], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 1, 2, 3, 4], modulationMatrix: [[], [], [], [5], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 1, 3], modulationMatrix: [[], [2], [], [4, 5], [], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 1, 3], modulationMatrix: [[], [2], [], [4, 5], [], []], feedbackMatrix: [[], [], [2], [], [], []] }
		, { outputMix: [0, 2, 5], modulationMatrix: [[1], [], [3], [4], [], []], feedbackMatrix: [[], [], [], [], [4], []] }
		, { outputMix: [0, 1, 2, 4], modulationMatrix: [[], [], [3], [], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 1, 2, 5], modulationMatrix: [[], [], [3], [4], [], []], feedbackMatrix: [[], [], [], [], [4], []] }
		, { outputMix: [0, 1, 2, 3, 4], modulationMatrix: [[], [], [], [], [5], []], feedbackMatrix: [[], [], [], [], [], [5]] }
		, { outputMix: [0, 1, 2, 3, 4, 5], modulationMatrix: [[], [], [], [], [], []], feedbackMatrix: [[], [], [], [], [], [5]] }
	];
	class MiniumFMOperator {
		audioContext: AudioContext;
		operatorOut: GainNode;
		feedbackLevel: GainNode;
		phaseDelay: DelayNode;
		carrier: OscillatorNode;
		modulationLevel: GainNode;
		envelope: GainNode;
		constructor(cntxt: AudioContext) {
			this.audioContext = cntxt;
			
			this.operatorOut = this.audioContext.createGain();
			this.modulationLevel = this.audioContext.createGain();
			this.feedbackLevel = this.audioContext.createGain();
			this.envelope = this.audioContext.createGain();
			this.phaseDelay = this.audioContext.createDelay();
			this.carrier = this.audioContext.createOscillator();

			this.envelope.connect(this.operatorOut);
			this.phaseDelay.connect(this.envelope);
			this.modulationLevel.connect(this.phaseDelay.delayTime);
			this.feedbackLevel.connect(this.phaseDelay.delayTime);
			this.carrier.connect(this.phaseDelay);

			this.operatorOut.gain.value = 0;
			this.phaseDelay.delayTime.value = 0;
			this.envelope.gain.value = 0;

			this.carrier.start(this.audioContext.currentTime);
		}
		addFrequencySlide(when: number, frequency: number, modulationRatio: number, feedbackRatio: number) {
			this.carrier.frequency.linearRampToValueAtTime(frequency, when);
			this.modulationLevel.gain.linearRampToValueAtTime(modulationRatio / frequency, when);
			this.phaseDelay.delayTime.linearRampToValueAtTime(1.1 * modulationRatio / frequency, when);
			this.feedbackLevel.gain.linearRampToValueAtTime(feedbackRatio / frequency, when);
		}
		startPlayFrequency(volume: number, attack: SynthSlope, decay: SynthSlope, sustain: SynthSlope, release: number, when: number, duration: number, frequency: number, modulationRatio: number, feedbackRatio: number) {
			this.envelope.gain.cancelScheduledValues(this.audioContext.currentTime);
			this.envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
			this.envelope.gain.setValueCurveAtTime(attack.values, when, attack.duration);
			this.envelope.gain.setValueCurveAtTime(decay.values, when + attack.duration, decay.duration);
			this.envelope.gain.setValueCurveAtTime(sustain.values, when + attack.duration + decay.duration, sustain.duration);
			this.envelope.gain.cancelAndHoldAtTime(when + duration);
			this.envelope.gain.linearRampToValueAtTime(0, when + duration + release);
			this.carrier.frequency.value = frequency;
			this.modulationLevel.gain.linearRampToValueAtTime(modulationRatio / frequency, when);
			this.phaseDelay.delayTime.linearRampToValueAtTime(1.1 * modulationRatio / frequency, when);
			this.feedbackLevel.gain.linearRampToValueAtTime(feedbackRatio / frequency, when);
			this.operatorOut.gain.value = volume;
		}
		cancelOperator() {
			this.operatorOut.disconnect();
			this.envelope.disconnect();
			this.phaseDelay.disconnect();
			this.modulationLevel.disconnect();
			this.feedbackLevel.disconnect();
			this.carrier.disconnect();
			this.carrier.stop();
		}
	}
	class MinumFMVoice {
		operators: MiniumFMOperator[];
		locktime: number = 0;
		audioContext: AudioContext;
		output: GainNode;
		mixID: number;
		constructor(mixID: number, audioContext: AudioContext, to: AudioNode) {
			this.mixID = mixID;
			this.audioContext = audioContext;
			this.output = this.audioContext.createGain();
			this.operators = [
				new MiniumFMOperator(this.audioContext)
				, new MiniumFMOperator(this.audioContext)
				, new MiniumFMOperator(this.audioContext)
				, new MiniumFMOperator(this.audioContext)
				, new MiniumFMOperator(this.audioContext)
				, new MiniumFMOperator(this.audioContext)
			];
			this.connectOperators();
			this.output.connect(to);
		}
		connectOperators() {
			let mix = matrixConnectionAlgorithmsDX7[this.mixID - 1];
			for (let cid = 0; cid < mix.modulationMatrix.length; cid++) {
				let carrier = this.operators[cid];
				let modulatorIds = mix.modulationMatrix[cid];
				for (let mm = 0; mm < modulatorIds.length; mm++) {
					let mid = modulatorIds[mm];
					let modulator = this.operators[mid];
					modulator.operatorOut.connect(carrier.modulationLevel);
				}
			}
			for (let cid = 0; cid < mix.feedbackMatrix.length; cid++) {
				let carrier = this.operators[cid];
				let fbIds = mix.feedbackMatrix[cid];
				for (let ff = 0; ff < fbIds.length; ff++) {
					let fid = fbIds[ff];
					let fbmodulator = this.operators[fid];
					fbmodulator.operatorOut.connect(carrier.feedbackLevel);
				}
			}
			for (let ii = 0; ii < mix.outputMix.length; ii++) {
				let outIdx = mix.outputMix[ii];
				this.operators[outIdx].operatorOut.connect(this.output);
			}
		}
		startPlayNote(volume: number, preset: SynthPreset, when: number, note: number, slides: MZXBX_SlideItem[]) {
			this.output.gain.value = 0.33 * volume / 100;
			let duration = slides.reduce((sm, cur) => sm + cur.duration, 0);
			for (let ii = 0; ii < 6; ii++) {
				let info = preset.operators[ii];
				if (info.enabled) {
					let frequency = info.constantFrequency;
					if (!(frequency)) {
						let noteFreq = 440 * Math.pow(2, (note - 69) / 12);
						let detuneRatio = Math.pow(Math.exp(Math.log(2) / 1024), info.detune);
						frequency = noteFreq * detuneRatio * info.frequencyRatio;
						if (preset.transpose > 0) frequency = frequency * 2;
						if (preset.transpose < 0) frequency = frequency * 0.5;
					}
					this.operators[ii].startPlayFrequency(info.volume, info.envelope.attack, info.envelope.decay, info.envelope.sustain, info.envelope.release, when, duration, frequency, preset.modulationRatio, preset.feedbackRatio);//, slides);
					let otime = when + duration + info.envelope.release + 0.01;
					if (this.locktime < otime) {
						this.locktime = otime;
					}
					if (info.frequencyRatio && (slides.length > 1 || slides[0].delta != 0)) {
						let next = when;
						for (let ff = 0; ff < slides.length; ff++) {
							next = next + slides[ff].duration;
							let noteFreq = 440 * Math.pow(2, (note + slides[ff].delta - 69) / 12);
							let detuneRatio = Math.pow(Math.exp(Math.log(2) / 1024), info.detune);
							let slideFreq = noteFreq * detuneRatio * info.frequencyRatio;
							this.operators[ii].addFrequencySlide(next, slideFreq, preset.modulationRatio, preset.feedbackRatio);
						}
					}
				}
			}

		}
		cancelVoice() {
			for (let ii = 0; ii < this.operators.length; ii++) {
				this.operators[ii].cancelOperator();
			}
			this.output.disconnect();
		}
	}
	class MiniumFMSynth {
		cache: MinumFMVoice[] = [];
		audioContext: AudioContext;
		mixOutput: GainNode;
		constructor() {
		}
		init(audioContext: AudioContext) {
			this.audioContext = audioContext;
			this.mixOutput = this.audioContext.createGain();
		}
		takeVox(mxid: number): MinumFMVoice {
			for (let ii = 0; ii < this.cache.length; ii++) {
				if (this.cache[ii].locktime < this.audioContext.currentTime && mxid == this.cache[ii].mixID) {
					return this.cache[ii];
				}
			}
			let vx: MinumFMVoice = new MinumFMVoice(mxid, this.audioContext, this.mixOutput);
			this.cache.push(vx);
			return vx;
		}
		cancelSynth() {
			for (let ii = 0; ii < this.cache.length; ii++) {
				this.cache[ii].cancelVoice();
			}
			this.cache = [];
		}
		scheduleStrum(volume: number, preset: SynthPreset, when: number, pitches: number[], slides: MZXBX_SlideItem[]) {
			if (when > this.audioContext.currentTime + 0.05) {
				for (let ii = 0; ii < pitches.length; ii++) {
					let vox = this.takeVox(preset.mixID);
					vox.startPlayNote(volume, preset, when, pitches[ii], slides);
				}
			} else {
				console.log(when, 'is too late for', this.audioContext.currentTime);
			}
		}
	}
	class MiniumPluginDX7Bridge implements MZXBX_AudioPerformerPlugin {
		synth: MiniumFMSynth | null = null;
		fm: FMParameter | null = null;
		launch(context: AudioContext, parameters: string): number {
			if (this.synth) {
				//
			} else {
				this.synth = new MiniumFMSynth();
				this.synth.init(context);
			}
			this.fm = (parameters as any) as FMParameter;
			return 1;
		}
		busy(): null | string {
			return null;
		}
		cancel(): void {
			if (this.synth) {
				this.synth.cancelSynth();
			}
		}
		output(): AudioNode | null {
			if (this.synth) {
				return this.synth.mixOutput;
			} else {
				return null;
			}
		}
		strum(whenStart: number, zpitches: number[], tempo: number, mzbxslide: MZXBX_SlideItem[]): void {
			if (this.synth) {
				if (this.fm) {
					this.synth.scheduleStrum(this.fm.volume, this.fm.preset, whenStart, zpitches, mzbxslide);
				}
			}
		}
	}
	return new MiniumPluginDX7Bridge();

}
