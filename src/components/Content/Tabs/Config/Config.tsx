import React from 'react';
import { Form, FormGroup, Input, Row, Col, Button } from 'reactstrap';
import * as I from './../../../../api/interfaces';
import api from './../../../../api/api';
import config from './../../../../api/config';
import DragInput from './../../../DragFileInput';
import ImportModal from './ImportModal';
import CustomModal from './CustomModal';
import { IContextData } from '../../../Context';
import ElectronOnly from '../../../ElectronOnly';

const { isElectron } = config;

interface ConfigStatus extends I.CFGGSIResponse {
	loading: boolean;
}

interface ExtendedFile extends File {
	path: string;
}

interface IProps {
	cxt: IContextData;
	toggle: Function;
	gsiCheck: Function;
}

interface IState {
	config: I.Config;
	cfg: ConfigStatus;
	gsi: ConfigStatus;
	restartRequired: boolean;
	importModalOpen: boolean;
	customModal: {
		open: boolean;
		title: string;
		message: string;
	};
	conflict: {
		teams: number;
		players: number;
	};
	update: {
		available: boolean;
		installing: boolean;
	};
	ip: string;
	data: any;
	remoteDBButton: boolean;
}

export default class Config extends React.Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			config: {
				steamApiKey: '',
				port: 1349,
				token: '',
				hlaePath: '',
				afxCEFHudInteropPath: '',
				remoteDBUrl: ''
			},
			cfg: {
				success: false,
				loading: true,
				message: 'Loading data about cfg files...',
				accessible: true
			},
			gsi: {
				success: false,
				loading: true,
				message: 'Loading data about GameState files...',
				accessible: true
			},
			importModalOpen: false,
			customModal: {
				open: false,
				title: '',
				message: ''
			},
			restartRequired: false,
			conflict: {
				teams: 0,
				players: 0
			},
			update: {
				available: false,
				installing: false
			},
			data: {},
			ip: '',
			remoteDBButton: false
		};
	}

	loadEXE = (type: 'hlaePath' | 'afxCEFHudInteropPath') => (files: FileList) => {
		if (!files) return;
		const file = files[0] as ExtendedFile;
		if (!file) {
			this.setState(state => {
				state.config[type] = '';
				return state;
			});
			return;
		}
		if (!file.path) return;
		const path = file.path;
		this.setState(state => {
			state.config[type] = path;
			return state;
		});
	};
	import = (data: any, callback: any) => async () => {
		try {
			await api.files.sync(data);
		} catch {}
		const showCustomModal = this.showCustomModal;
		showCustomModal('Success!', 'Updated the database');
		this.setState({ data: {}, conflict: { teams: 0, players: 0 }, importModalOpen: false }, callback);
	};

	importCheck = (callback: any) => (files: FileList) => {
		if (!files) return;
		const file = files[0] as ExtendedFile;
		if (!file) {
			return;
		}
		if (file.type !== 'application/json') return;
		const reader: any = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = async () => {
			try {
				const db64 = reader.result.replace(/^data:application\/json;base64,/, '');
				const db = JSON.parse(Buffer.from(db64, 'base64').toString());
				const response = await api.files.syncCheck(db);
				if (!response) {
					return;
				}
				if (!response.players && !response.teams) {
					return this.import(db, callback)();
				}
				this.setState({
					conflict: {
						players: response.players,
						teams: response.teams
					},
					importModalOpen: true,
					data: db
				});
			} catch {}
		};
	};

	importRemoteCheck = (callback: any) => {
		if (!this.isURL(this.state.config.remoteDBUrl)) return;
		this.setState({ remoteDBButton: true });
		const showCustomModal = this.showCustomModal;
		const remoteDBButtonChanger = this.remoteDBButtonChanger;
		fetch(this.state.config.remoteDBUrl, {
			method: 'GET',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
		})
			.then(response => {
				const contentType = response.headers.get('content-type');
				if (contentType && contentType.indexOf('application/json') !== -1) {
					return response.json().then(async data => {
						if (!data.teams || !data.players) {
							showCustomModal(
								"Error - Can't update DB",
								"Hmm.. I received JSON but doesn't look like a LHM database file." +
									JSON.stringify(data).substring(0, 50)
							);
							this.setState({ remoteDBButton: false });
							return;
						}
						try {
							const response = await api.files.syncCheck(data);
							if (!response) {
								return;
								this.setState({ remoteDBButton: false });
							}
							if (!response.players && !response.teams) {
								return this.import(data, callback)();
								this.setState({ remoteDBButton: false });
							}
							this.setState({
								conflict: {
									players: response.players,
									teams: response.teams
								},
								importModalOpen: true,
								data: data
							});
							this.setState({ remoteDBButton: false });
						} catch {}
					});
				} else {
					return response.text().then(data => {
						showCustomModal(
							"Error - Can't update DB",
							"Recived data, but it's not JSON: " + JSON.stringify(data).substring(0, 40)
						);
						this.setState({ remoteDBButton: false });
					});
				}
			})
			.catch(function (error) {
				if (error.toString() == 'TypeError: Failed to fetch') {
					showCustomModal(
						"Error - Can't update DB",
						'' +
							error.message +
							" - Either we couldn't connect to your server, or it could be a CORS problem."
					);
					remoteDBButtonChanger(false);
				} else {
					showCustomModal("Error - Can't update DB", error.toString());
					remoteDBButtonChanger(false);
				}
			});
	};

	showCustomModal = (title: string, msg: string) => {
		const stateChanger = this.state.customModal;
		stateChanger.open = true;
		stateChanger.title = title;
		stateChanger.message = msg;
		this.setState({ customModal: stateChanger });
	};

	remoteDBButtonChanger = (state: boolean) => {
		this.setState({ remoteDBButton: state });
	};

	download = (target: 'gsi' | 'cfgs' | 'db') => {
		api.config.download(target);
	};
	getDownloadUrl = (target: 'gsi' | 'cfgs') => {
		return `${config.isDev ? config.apiAddress : '/'}api/${target}/download`;
	};
	getConfig = async () => {
		const config = await api.config.get();

		const { ip, ...cfg } = config;

		this.setState({ config: cfg, ip });
	};
	createGSI = async () => {
		const { gsi } = this.state;
		gsi.message = 'Loading GameState data...';

		this.setState({ gsi });
		await api.gamestate.create();
		this.checkGSI();
		this.props.gsiCheck();
	};
	createCFG = async () => {
		const { cfg } = this.state;
		cfg.message = 'Loading GameState file data...';

		this.setState({ cfg });
		await api.cfgs.create();
		this.checkCFG();
		this.props.gsiCheck();
	};
	checkGSI = async () => {
		const { gsi } = this.state;
		gsi.message = 'Loading GameState file data...';

		this.setState({ gsi });

		const response = await api.gamestate.check();

		if (response.success === false) {
			return this.setState({
				gsi: {
					success: false,
					message: response.message,
					loading: false,
					accessible: response.accessible
				}
			});
		}
		return this.setState({
			gsi: { success: true, loading: false, accessible: true }
		});
	};
	checkCFG = async () => {
		const { cfg } = this.state;
		cfg.message = 'Loading config file data...';

		this.setState({ cfg });

		const response = await api.cfgs.check();

		if (response.success === false) {
			return this.setState({
				cfg: {
					success: false,
					message: response.message,
					loading: false,
					accessible: response.accessible
				}
			});
		}
		return this.setState({
			cfg: { success: true, loading: false, accessible: true }
		});
	};

	async componentDidMount() {
		this.getConfig();
		this.checkCFG();
		this.checkGSI();
		this.checkUpdate();

		this.importRemoteCheck(this.props.cxt.reload);
	}
	checkUpdate = () => {
		if (!isElectron) return;
		const { ipcRenderer } = window.require('electron');
		ipcRenderer.on('updateStatus', (_e: any, data: boolean) => {
			this.setState(state => {
				state.update.available = data;
				return state;
			});
		});

		ipcRenderer.send('checkUpdate');
	};
	installUpdate = () => {
		if (!isElectron) return;
		const { ipcRenderer } = window.require('electron');
		this.setState(
			state => {
				state.update.installing = true;
				return state;
			},
			() => {
				ipcRenderer.send('updateApp');
			}
		);
	};
	changeHandler = (event: any) => {
		const name: 'steamApiKey' | 'port' | 'token' | 'remoteDBUrl' = event.target.name;
		const { config }: any = this.state;
		config[name] = event.target.value;
		this.setState({ config });
		// this.setState({ value })
	};
	toggleModal = () => {
		this.setState({ importModalOpen: !this.state.importModalOpen });
	};
	toggleErrorModal = () => {
		const stateChanger = this.state.customModal;
		stateChanger.open = !this.state.customModal.open;
		this.setState({ customModal: stateChanger });
	};
	save = async () => {
		const { config } = this.state;
		const oldConfig = await api.config.get();
		if (oldConfig.port !== config.port) {
			this.setState({ restartRequired: true });
		}
		await api.config.update(config);
		this.checkGSI();
	};

	isURL = (str: any) => {
		const pattern = new RegExp(
			'^(https?:\\/\\/)?' + // protocol
				'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' + // domain name
				'((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
				'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
				'(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
				'(\\#[-a-z\\d_]*)?$',
			'i'
		); // fragment locator
		return pattern.test(str);
	};

	render() {
		const { cxt } = this.props;
		const {
			gsi,
			cfg,
			importModalOpen,
			customModal,
			conflict,
			data,
			ip,
			config,
			update,
			remoteDBButton
		} = this.state;
		return (
			<Form>
				<div className="tab-title-container">Settings</div>
				<div className="tab-content-container no-padding">
					<ImportModal
						isOpen={importModalOpen}
						toggle={this.toggleModal}
						teams={conflict.teams}
						players={conflict.players}
						save={this.import(data, cxt.reload)}
					/>
					<CustomModal
						isOpen={customModal.open}
						toggle={this.toggleErrorModal}
						msg={customModal.message}
						title={customModal.title}
					/>

					<Row className="padded base-config">
						<Col md="3">
							<FormGroup>
								<Input
									type="text"
									name="steamApiKey"
									id="steamApiKey"
									onChange={this.changeHandler}
									value={this.state.config.steamApiKey}
									placeholder="Steam API Key"
								/>
							</FormGroup>
						</Col>
						<Col md="3">
							<FormGroup>
								<Input
									type="number"
									name="port"
									id="port"
									onChange={this.changeHandler}
									value={this.state.config.port}
									placeholder="GSI Port"
								/>
							</FormGroup>
						</Col>
						<Col md="3">
							<FormGroup>
								<Input
									type="text"
									name="token"
									id="token"
									onChange={this.changeHandler}
									value={this.state.config.token}
									placeholder="GSI Token"
								/>
							</FormGroup>
						</Col>
						<Col md="3">
							<FormGroup>
								<Input
									type="text"
									name="remoteDBUrl"
									id="remoteDBUrl"
									onChange={this.changeHandler}
									value={this.state.config.remoteDBUrl}
									placeholder="remoteDBUrl"
								/>
							</FormGroup>
						</Col>
					</Row>
					<Row className="config-container bottom-margin">
						<ElectronOnly>
							<Col md="12" className="config-entry">
								<div className="config-description">Version</div>
								<Button
									className="purple-btn round-btn"
									disabled={update.installing || !update.available}
									onClick={this.installUpdate}
								>
									{update.installing
										? 'Installing...'
										: update.available
										? 'Install update'
										: 'Latest'}
								</Button>
							</Col>
						</ElectronOnly>
						<Col md="12" className="config-entry">
							<div className="config-description">
								HLAE Path: {this.state.config.hlaePath ? 'Loaded' : 'Not loaded'}
							</div>
							<DragInput
								id="hlae_input"
								label="SET HLAE PATH"
								accept=".exe"
								onChange={this.loadEXE('hlaePath')}
								className="path_selector"
								removable
							/>
						</Col>
						{
							<Col md="12" className="config-entry">
								<div className="config-description">
									AFX CEF HUD Interop:{' '}
									{this.state.config.afxCEFHudInteropPath ? 'Loaded' : 'Not loaded'}
								</div>
								<DragInput
									id="afx_input"
									label="SET AFX PATH"
									accept=".exe"
									onChange={this.loadEXE('afxCEFHudInteropPath')}
									className="path_selector"
									removable
								/>
							</Col>
						}
						<Col md="12" className="config-entry">
							<div className="config-description">
								GameState Integration: {gsi.message || 'Loaded succesfully'}
							</div>

							<Button
								className="purple-btn round-btn"
								disabled={gsi.loading || gsi.success || !gsi.accessible}
								onClick={this.createGSI}
							>
								Add GSI file
							</Button>
						</Col>
						<Col md="12" className="config-entry">
							<div className="config-description">Configs: {cfg.message || 'Loaded succesfully'}</div>
							<Button
								className="purple-btn round-btn"
								disabled={cfg.loading || cfg.success || !cfg.accessible}
								onClick={this.createCFG}
							>
								Add config files
							</Button>
						</Col>
						<Col md="12" className="config-entry">
							<div className="config-description">Credits</div>
							<Button className="lightblue-btn round-btn" onClick={() => this.props.toggle('credits')}>
								See now
							</Button>
						</Col>

						<Col md="12" className="config-entry">
							<div className="config-description">Downloads</div>
							<div className="download-container">
								<Button onClick={() => this.download('gsi')} className="purple-btn round-btn">
									GSI config
								</Button>
								<Button onClick={() => this.download('cfgs')} className="purple-btn round-btn">
									HUD configs
								</Button>
								<Button onClick={() => this.download('db')} className="purple-btn round-btn">
									Export DB
								</Button>
							</div>
						</Col>

						<Col md="12" className="config-entry">
							<div className="config-description">Import</div>
							<div
								className="download-container"
								style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
							>
								<DragInput
									id="import_file"
									label="Import database"
									accept=".json"
									onChange={this.importCheck(cxt.reload)}
									className="path_selector"
								/>

								{this.isURL(this.state.config.remoteDBUrl) ? (
									<Button
										className="lightblue-btn round-btn"
										onClick={() => this.importRemoteCheck(cxt.reload)}
										disabled={remoteDBButton}
									>
										Update from Remote URL
									</Button>
								) : null}
							</div>
						</Col>
						<Col md="12" className="config-entry">
							<div className="config-description">Reader Code</div>
							<p>
								{ip
									.split('.')
									.map(Number)
									.map(n => n.toString(16))
									.join('-')}
								-{config.port.toString(16)}
							</p>
						</Col>
					</Row>

					{/*<Toast isOpen={this.state.restartRequired} className="fixed-toast">
                        <ToastHeader>Change of port detected</ToastHeader>
                        <ToastBody>It seems like you've changed GSI port - for all changes to be set in place you should now restart the Manager and update the GSI files</ToastBody>
                    </Toast>*/}
				</div>
				<Row>
					<Col className="main-buttons-container">
						<Button onClick={this.save} color="primary">
							Save
						</Button>
					</Col>
				</Row>
			</Form>
		);
	}
}
