import React, { useState } from 'react';
import { Button, Form, Input, Row, Col } from 'reactstrap';
import countries from './../../countries';
import api from './../../../../api/api';
import * as I from './../../../../api/interfaces';
import { IContextData } from './../../../../components/Context';
import TeamEditModal from './TeamEditModal';
import TeamListEntry from './Team';
import CustomFieldsModal from '../../../CustomFields/CustomFieldsModal';

interface IProps {
	cxt: IContextData;
}

const quickClone: <T>(obj: T) => T = obj => JSON.parse(JSON.stringify(obj));

const TeamsTab = ({ cxt }: IProps) => {
	const emptyTeam: I.Team = {
		_id: 'empty',
		name: '',
		shortName: '',
		country: '',
		logo: '',
		extra: {}
	};
	//Sort teams alphabetically
	cxt.teams.sort(function (a, b) {
		const nameA = a.name.toUpperCase();
		const nameB = b.name.toUpperCase();
		return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
	});

	const [form, setForm] = useState(emptyTeam);
	const [search, setSearch] = useState('');

	const [editModalState, setEditState] = useState(false);
	const [fieldsModalState, setFieldsState] = useState(false);

	const [customFieldForm, setCustomFieldForm] = useState<I.CustomFieldEntry[]>(quickClone(cxt.fields.teams));

	const clearAvatar = () => {
		const avatarInput: any = document.getElementById('avatar');
		if (avatarInput) avatarInput.value = '';
	};

	const loadTeam = (id: string) => {
		const team = cxt.teams.filter(team => team._id === id)[0];
		if (team) {
			setForm({ ...emptyTeam, ...team });
			clearAvatar();
		}
	};

	const loadEmpty = () => {
		setForm({ ...emptyTeam });
		clearAvatar();
	};

	const loadTeams = async (id?: string) => {
		await cxt.reload();
		cxt.teams.sort(function (a, b) {
			const nameA = a.name.toUpperCase();
			const nameB = b.name.toUpperCase();
			return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
		});
		if (id) {
			loadTeam(id);
		}
	};

	const fileHandler = (files: FileList) => {
		if (!files) return;
		const file = files[0];
		if (!file) {
			setForm(prevForm => ({ ...prevForm, logo: '' }));
			return;
		}
		if (!file.type.startsWith('image')) {
			return;
		}
		const reader: any = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			setForm(prevForm => ({ ...prevForm, logo: reader.result.replace(/^data:([a-z]+)\/(.+);base64,/, '') }));
		};
	};

	const searchHandler = (event: any) => {
		setSearch(event.target.value);
	};

	const changeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
		event.persist();
		const name = event.target.name as 'name' | 'shortName' | 'logo' | 'country';

		if (!event.target.files) {
			return setForm(prevForm => ({
				...prevForm,
				[name]: name in form ? event.target.value : ''
			}));
		}

		return fileHandler(event.target.files);
	};

	const extraChangeHandler = (field: string, type: Exclude<I.PanelInputType, 'select' | 'action' | 'checkbox'>) => {
		const fileHandler = (files: FileList) => {
			if (!files) return;
			const file = files[0];
			if (!file) {
				setForm(prevForm => ({ ...prevForm, logo: '' }));
				return;
			}
			if (!file.type.startsWith('image')) {
				return;
			}
			const reader: any = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => {
				setForm({
					...form,
					extra: { ...form.extra, [field]: reader.result.replace(/^data:([a-z]+)\/(.+);base64,/, '') }
				});
			};
		};
		if (type === 'image') {
			return fileHandler;
		}
		if (type === 'color') {
			return (hex: string) => {
				setForm({ ...form, extra: { ...form.extra, [field]: hex } });
			};
		}
		return (event: React.ChangeEvent<HTMLInputElement>) => {
			setForm({ ...form, extra: { ...form.extra, [field]: event.target.value } });
		};
	};
	const save = async () => {
		let response: any;
		if (form._id === 'empty') {
			response = await api.teams.add(form);
		} else {
			let logo = form.logo;
			if (logo && logo.includes('api/teams/logo')) {
				logo = undefined as any;
			}
			response = await api.teams.update(form._id, { ...form, logo });
		}
		if (response && response._id) {
			loadTeams(response._id);
		}
	};

	const deleteTeam = async () => {
		if (form._id === 'empty') return;
		const response = await api.teams.delete(form._id);
		if (response) {
			setEditState(false);
			await loadTeams();
			return loadEmpty();
		}
	};

	const edit = (team: I.Team) => {
		setForm(team);
		setEditState(true);
	};

	const filterTeams = (team: I.Team): boolean => {
		const str = search.toLowerCase();
		const country = countries.find(country => country.value === team.country);
		return (
			team._id.toLowerCase().includes(str) ||
			team.name.toLowerCase().includes(str) ||
			team.shortName.toLowerCase().includes(str) ||
			(country && (country.value.toLowerCase().includes(str) || country.label.toLowerCase().includes(str)))
		);
	};

	const openCustomFields = () => {
		setCustomFieldForm(quickClone(cxt.fields.teams));
		setFieldsState(true);
	};

	const add = () => {
		loadEmpty();
		setEditState(true);
	};

	const saveFields = async () => {
		await api.teams.fields.update(customFieldForm.filter(fieldEntry => fieldEntry.name));
		cxt.reload();
		setFieldsState(false);
	};
	const visibleFields = cxt.fields.teams.filter(field => field.visible);
	return (
		<Form>
			<div className="tab-title-container">
				<div>Teams</div>
				<Input
					type="text"
					name="name"
					id="team_search"
					value={search}
					onChange={searchHandler}
					placeholder="Search..."
				/>
			</div>
			<TeamEditModal
				open={editModalState}
				toggle={() => {
					setEditState(!editModalState);
				}}
				team={form}
				onChange={changeHandler}
				onFileChange={fileHandler}
				onExtraChange={extraChangeHandler as I.onExtraChangeFunction}
				save={save}
				deleteTeam={deleteTeam}
				fields={cxt.fields.teams}
				cxt={cxt}
			/>
			<CustomFieldsModal
				fields={customFieldForm}
				open={fieldsModalState}
				toggle={() => {
					setFieldsState(!fieldsModalState);
				}}
				setForm={setCustomFieldForm}
				save={saveFields}
			/>
			<div className="tab-content-container no-padding">
				<div className="item-list-entry heading">
					<div className="picture">Logo</div>
					<div className="name">Name</div>
					<div className="shortname">Short name</div>
					<div className="country">Country</div>
					{visibleFields.map(field => (
						<div className="custom-field" key={field._id}>
							{field.name}
						</div>
					))}
					<div className="options">
						<Button className="purple-btn round-btn" onClick={openCustomFields}>
							Manage
						</Button>
					</div>
				</div>
				{cxt.teams.filter(filterTeams).map(team => (
					<TeamListEntry
						hash={cxt.hash}
						key={team._id}
						team={team}
						edit={() => edit(team)}
						fields={visibleFields}
						cxt={cxt}
					/>
				))}
				<Row>
					<Col className="main-buttons-container">
						<Button color="primary" onClick={add}>
							+Add Teams
						</Button>
					</Col>
				</Row>
			</div>
		</Form>
	);
};

export default TeamsTab;
