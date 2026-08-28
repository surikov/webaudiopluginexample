
type Zvoog_Project = {
	versionCode: '1'
	title: string;
	timeline: Zvoog_SongMeasure[];
	tracks: Zvoog_MusicTrack[];
	farorder: number[];
	percussions: Zvoog_PercussionTrack[];
	comments: Zvoog_CommentMeasure[];
	filters: Zvoog_FilterTarget[];
	selectedPart: Zvoog_Selection;
	position: {
		x: number;
		y: number;
		z: number;
	};
	list: boolean;
	menuPerformers: boolean;
	menuSamplers: boolean;
	menuFilters: boolean;
	menuActions: boolean;
	menuPlugins: boolean;
	menuClipboard: boolean;
	menuSettings: boolean;
};
type Zvoog_SongMeasure = {
	tempo: number;
	metre: Zvoog_Metre;
};
type Zvoog_Metre = {
	count: number;
	part: number;
};
type Zvoog_PercussionTrack = {
	title: string;
	measures: Zvoog_PercussionMeasure[];
	sampler: Zvoog_AudioSampler;
};
type Zvoog_MusicTrack = {
	title: string;
	measures: Zvoog_TrackMeasure[];
	performer: Zvoog_AudioSequencer;
};
type Zvoog_PercussionMeasure = {
	skips: Zvoog_Metre[];
};
type Zvoog_AudioSequencer = {
	id: string;
	data: string;
	kind: string;
	outputs: string[];
	iconPosition: { x: number, y: number };
	state: 0 | 1 | 2;//on|mute|solo
	hint1_128: number;
};
type Zvoog_AudioSampler = {
	id: string;
	data: string;
	kind: string;
	outputs: string[];
	iconPosition: { x: number, y: number };
	state: 0 | 1 | 2;//on|mute|solo
	hint35_81: number;
};
type Zvoog_Chord = {
	skip: Zvoog_Metre;
	pitches: number[];
	slides: Zvoog_Slide[];
};
type Zvoog_TrackMeasure = {
	chords: Zvoog_Chord[];
};
type Zvoog_Slide = {
	duration: Zvoog_Metre;
	delta: number;
};
type Zvoog_CommentText = {
	skip: Zvoog_Metre;
	text: string;
	row: number;
};
type Zvoog_CommentMeasure = {
	points: Zvoog_CommentText[];
};
type Zvoog_FilterTarget = {
	id: string;
	kind: string;
	data: string;
	outputs: string[];
	automation: Zvoog_FilterMeasure[];
	iconPosition: { x: number, y: number };
	state: 0 | 1;//on|off
	title: string;
};

type Zvoog_FilterMeasure = {
	changes: Zvoog_FilterStateChange[];
};
type Zvoog_FilterStateChange = {
	skip: Zvoog_Metre;
	stateBlob: string;
};
type Zvoog_Selection = {
	startMeasure: number;
	endMeasure: number;
};