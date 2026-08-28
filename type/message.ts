type MZXBX_MessageToPlugin = {
	hostData: any
	, colors: {
		background: string// #101010;
		, main: string//#9cf;
		, drag: string//#03f;
		, line: string//#ffccff99;
		, click: string// #c39;
	}
	, screenData: number[] | null
	, langID: string
};
type MZXBX_MessageToHost = {
	dialogID: string
	, pluginData: any
	, done: boolean
	, screenWait: boolean
};

