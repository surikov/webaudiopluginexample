type DX7OperatorData = {
	enabled: boolean;
	freqFine0_99: number;
	freqCoarse0_31: number;
	volumeLevel0_99: number;
	constMode0_1: number;
	detune_7_7: number;
	rates0_99: number[];
	levels0_99: number[];
	velocitySens0_7: number;
};
type DX7PresetData = {
	name: string;
	algorithm1_32: number;
	operators: DX7OperatorData[];
	feedback0_7: number;
	lfoPitchModDepth0_99: number;
	lfoAmpModDepth0_99: number;
};
type ConnectionSchemeDX7 = {
	outputMix: number[]
	, modulationMatrix: (number[])[]
	, feedbackMatrix: (number[])[]
};
type SynthSlope = {
	duration: number;
	values: number[];
};
type EnvelopeInfo = {
	attack: SynthSlope;
	decay: SynthSlope;
	sustain: SynthSlope;
	release: number;
};
type OperatorInfo = {
	constantFrequency: number;
	frequencyRatio: number;
	detune: number;
	enabled: boolean;
	volume: number;
	envelope: EnvelopeInfo;
};
type SynthPreset = {
	label: string;
	mixID: number;
	operators: OperatorInfo[];
	feedbackRatio: number;
	modulationRatio: number;
	transpose:number;
};
type FMParameter = {
	volume: number;
	preset: SynthPreset;
};
