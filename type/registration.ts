
type MZXBX_PluginRegistrationInformation = {
	label: string
	, kind: string
	, purpose: 'Action' | 'Filter' | 'Sampler' | 'Performer'
	, ui: string
	, evaluate: string
	, script: string
};