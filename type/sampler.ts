
type MZXBX_AudioSamplerPlugin = {
	launch: (context: AudioContext, parameters: string) => number;
	busy: () => null | string;
	start: (when: number, tempo: number) => void;
	cancel: () => void;
	output: () => AudioNode | null;
	duration: () => number;
};