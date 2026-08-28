
type MZXBX_AudioPerformerPlugin = {
	launch: (context: AudioContext, parameters: string) => number;
	busy: () => null | string;
	strum: (when: number, pitches: number[], tempo: number, slides: MZXBX_SlideItem[]) => void;
	cancel: () => void;
	output: () => AudioNode | null;
};
type MZXBX_SlideItem = {
	duration: number;
	delta: number;
};

