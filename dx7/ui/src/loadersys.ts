
class DX7Loader {

	scale99(nn: number): number {
		let speed = Math.pow(2, nn * 0.16);
		return speed;
	}
	durationDown(nn: number): number {
		return 169 * Math.pow(2, (99 - nn) * 0.16) / Math.pow(2, 99 * 0.16)//+0.008;
	}
	durationUp(nn: number): number {
		return 24.9 * Math.pow(2, (99 - nn) * 0.16) / Math.pow(2, 99 * 0.16) //+0.0001;
	}
	levelRatio(nn: number): number {
		return nn / 99;
	}
	slopeDuration(r99: number, from99: number, to99: number): {
		from: number;
		to: number;
		duration: number;
	} {
		let partDuration = Math.abs(this.levelRatio(from99) - this.levelRatio(to99)) / this.levelRatio(99);
		let fullDuration = this.durationDown(r99);

		if (from99 < to99) {
			fullDuration = this.durationUp(r99);
		}
		let slope = {
			duration: partDuration * fullDuration
			, from: this.scale99(from99) / this.scale99(99)
			, to: this.scale99(to99) / this.scale99(99)
		};
		return slope;
	}
	convertDX7data(dx7preset: DX7PresetData): SynthPreset {
		let modlev = 2.8;
		let preset: SynthPreset = {
			label: dx7preset.name
			, mixID: dx7preset.algorithm1_32
			, operators: []
			, feedbackRatio: 0.075 * modlev * Math.pow(2, (dx7preset.feedback0_7 - 7))  //* 0.01 //0.4
			, modulationRatio: modlev
			, transpose: 0
		};
		for (let ii = 0; ii < 6; ii++) {
			let data = dx7preset.operators[ii];
			let attackSlope = this.slopeDuration(data.rates0_99[0], data.levels0_99[3], data.levels0_99[0]);
			let decaySlope = this.slopeDuration(data.rates0_99[1], data.levels0_99[0], data.levels0_99[1]);
			let sustainSlope = this.slopeDuration(data.rates0_99[2], data.levels0_99[1], data.levels0_99[2])
			let releaseSlope = this.slopeDuration(data.rates0_99[3], data.levels0_99[2], data.levels0_99[3]);
			let operator: OperatorInfo = {
				constantFrequency: 0
				, frequencyRatio: 0
				, enabled: data.enabled
				, volume: 0
				, detune: data.detune_7_7
				, envelope: {
					attack: {
						values: [0
							, 0.025 * attackSlope.to
							, 0.05 * attackSlope.to
							, 0.2 * attackSlope.to
							, 0.35 * attackSlope.to
							, attackSlope.to]
						, duration: attackSlope.duration
					}
					, decay: {
						values: [attackSlope.to
							, attackSlope.to - 0.65 * (attackSlope.to - decaySlope.to)
							, attackSlope.to - 0.8 * (attackSlope.to - decaySlope.to)
							, attackSlope.to - 0.95 * (attackSlope.to - decaySlope.to)
							, attackSlope.to - 0.975 * (attackSlope.to - decaySlope.to)
							, decaySlope.to]
						, duration: decaySlope.duration
					}
					, sustain: {
						values: [decaySlope.to
							, decaySlope.to - 0.65 * (decaySlope.to - sustainSlope.to)
							, decaySlope.to - 0.8 * (decaySlope.to - sustainSlope.to)
							, decaySlope.to - 0.95 * (decaySlope.to - sustainSlope.to)
							, decaySlope.to - 0.975 * (decaySlope.to - sustainSlope.to)
							, sustainSlope.to]
						, duration: sustainSlope.duration
					}
					, release: releaseSlope.duration
				}
			};
			operator.envelope.attack.duration = Math.max(0.0001, operator.envelope.attack.duration);
			operator.envelope.decay.duration = Math.max(0.0001, operator.envelope.decay.duration);
			operator.envelope.sustain.duration = Math.max(0.0001, operator.envelope.sustain.duration);
			operator.envelope.release = Math.max(0.005, operator.envelope.release);
			operator.envelope.release = Math.min(3, operator.envelope.release);

			let freqRatio = 1 / (1 + dx7preset.lfoPitchModDepth0_99 / 99);
			if (data.constMode0_1 > 0) {
				operator.volume = 0.51 * Math.pow(2, data.volumeLevel0_99 * 0.125) / Math.pow(2, 99 * 0.125) * (1 - 0.2 * data.velocitySens0_7 / 7);
				operator.constantFrequency = freqRatio * Math.pow(10, data.freqCoarse0_31 % 4) * (1 + (data.freqFine0_99 / 99) * 8.772);
			} else {
				operator.volume = Math.pow(2, data.volumeLevel0_99 * 0.125) / Math.pow(2, 99 * 0.125) * (1 - 0.2 * data.velocitySens0_7 / 7);
				let coarse = 0.5;
				if (data.freqCoarse0_31) {
					coarse = data.freqCoarse0_31
				}
				operator.frequencyRatio = freqRatio * coarse * (1 + data.freqFine0_99 / 100);
			}
			operator.volume = operator.volume * (1 + dx7preset.lfoAmpModDepth0_99 / 99);
			preset.operators.push(operator);
		}
		return preset;
	}
	loadSyxFile(from: File, onDone: (dx7presets: DX7PresetData[]) => void) {
		let reader = new FileReader();
		let all: DX7PresetData[] = [];
		reader.onload = () => {
			let result: string = reader.result as string;
			for (let ii = 0; ii < 32; ii++) {
				let one: DX7PresetData = this.parseSysexData(result, ii, from.name);
				all.push(one);
			}
			onDone(all);
		};
		reader.onerror = (error) => {
			console.log('error', error)
		};
		reader.readAsText(from);
	}
	loadTxtFile(from: File, onDone: (dx7preset: DX7PresetData) => void) {
		let reader = new FileReader();
		reader.onload = () => {
			let result: string = reader.result as string;
			let one: DX7PresetData = JSON.parse(result);
			onDone(one);
		};
		reader.onerror = (error) => {
			console.log('error', error)
		};
		reader.readAsText(from);
	}
	loadJSONFile(from: File, onDone: (preset: SynthPreset) => void) {
		let reader = new FileReader();
		reader.onload = () => {
			let result: string = reader.result as string;
			let one: SynthPreset = JSON.parse(result);
			onDone(one);
		};
		reader.onerror = (error) => {
			console.log('error', error)
		};
		reader.readAsText(from);
	}
	parseSyxFile(from: File, onDone: (presets: SynthPreset[]) => void) {
		let reader = new FileReader();
		let all: SynthPreset[] = [];
		reader.onload = () => {
			let result: string = reader.result as string;
			for (let ii = 0; ii < 32; ii++) {
				let one: DX7PresetData = this.parseSysexData(result, ii, from.name);
				let preset: SynthPreset = this.convertDX7data(one);
				all.push(preset);
			}
			onDone(all);
		};
		reader.onerror = (error) => {
			console.log('error', error)
		};
		reader.readAsText(from);
	}
	pow2x(x01: number, minx: number, maxx: number, yratio: number): number {
		if (x01) {
			return yratio * Math.pow(2, x01 * (maxx - minx) + minx);
		} else {
			return 0;
		}
	}
	parseSysexData(bankData: string, patchId: number, filename: string): DX7PresetData {
		var dataStart = 128 * patchId + 6;
		var dataEnd = dataStart + 128;
		var voiceData = bankData.substring(dataStart, dataEnd);
		var operators: DX7OperatorData[] = [];
		for (var ii = 5; ii >= 0; --ii) {
			var oscStart = (5 - ii) * 17;
			var oscEnd = oscStart + 17;
			var oscData = voiceData.substring(oscStart, oscEnd);
			var operator: DX7OperatorData = {
				rates0_99: [oscData.charCodeAt(0), oscData.charCodeAt(1), oscData.charCodeAt(2), oscData.charCodeAt(3)]
				, levels0_99: [oscData.charCodeAt(4), oscData.charCodeAt(5), oscData.charCodeAt(6), oscData.charCodeAt(7)]
				, detune_7_7: Math.floor(oscData.charCodeAt(12) >> 3) - 7 // range 0 to 14
				, volumeLevel0_99: oscData.charCodeAt(14)
				, constMode0_1: oscData.charCodeAt(15) & 1
				, freqCoarse0_31: Math.floor(oscData.charCodeAt(15) >> 1)
				, freqFine0_99: oscData.charCodeAt(16)
				, enabled: true
				, velocitySens0_7: oscData.charCodeAt(13) >> 2
			};
			operators.splice(0, 0, operator);
		}
		let preset: DX7PresetData = {
			algorithm1_32: voiceData.charCodeAt(110) + 1,
			feedback0_7: voiceData.charCodeAt(111) & 7,
			operators: operators,
			name: voiceData.substring(118, 128).trim() + ' / ' + filename,
			lfoPitchModDepth0_99: voiceData.charCodeAt(114),
			lfoAmpModDepth0_99: voiceData.charCodeAt(115),//
		};
		return preset;
	}
}
