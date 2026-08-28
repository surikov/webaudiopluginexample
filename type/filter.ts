
type MZXBX_AudioFilterPlugin = {
	launch: (context: AudioContext, parameters: string) => void;
	busy: () => null | string;
	schedule: (when: number, tempo: number, parameters: string) => void;
	input: () => AudioNode | null;
	output: () => AudioNode | null;
};
