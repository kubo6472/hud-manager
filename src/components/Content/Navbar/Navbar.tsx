import React from 'react';
import { Nav, NavItem, NavLink } from 'reactstrap';
import * as Tabs from './TabIcons';

interface IProps {
	activeTab: string;
	toggle: (tab: string, data?: any) => void;
	files: boolean;
}

const Navbar = ({ activeTab, toggle, files }: IProps) => (
	<Nav tabs className="navbar-container">
		<NavItem className="hover-pointer">
			<NavLink
				active={activeTab === 'teams'}
				onClick={() => {
					toggle('teams');
				}}
			>
				<img src={Tabs.Teams} alt="Teams" />
				<div>Teams</div>
			</NavLink>
		</NavItem>
		<NavItem className="hover-pointer">
			<NavLink
				active={activeTab === 'players'}
				onClick={() => {
					toggle('players');
				}}
			>
				<img src={Tabs.Players} alt="Players" />
				<div>Players</div>
			</NavLink>
		</NavItem>
		<NavItem className="hover-pointer">
			<NavLink
				active={activeTab === 'create_match'}
				onClick={() => {
					toggle('create_match');
				}}
			>
				<img src={Tabs.Matches} alt="Matches" />
				<div>Matches</div>
			</NavLink>
		</NavItem>
		<NavItem className="hover-pointer">
			<NavLink
				active={activeTab === 'tournaments'}
				onClick={() => {
					toggle('tournaments');
				}}
			>
				<img src={Tabs.Tournaments} alt="Tournaments" />
				<div>Tournaments</div>
			</NavLink>
		</NavItem>
		<NavItem className="hover-pointer">
			<NavLink
				active={activeTab === 'huds'}
				onClick={() => {
					toggle('huds');
				}}
			>
				<img src={Tabs.HUDs} alt="HUDs" />
				<div>HUDs</div>
			</NavLink>
		</NavItem>
		<NavItem className="hover-pointer">
			<NavLink
				active={activeTab === 'live'}
				onClick={() => {
					toggle('live');
				}}
			>
				<img src={Tabs.Live} alt="Live" />
				<div>Live</div>
			</NavLink>
		</NavItem>
		<NavItem className="hover-pointer" id="settings">
			<NavLink
				active={activeTab === 'config'}
				onClick={() => {
					toggle('config');
				}}
			>
				Settings {!files ? <i className="material-icons">warning</i> : null}
			</NavLink>
		</NavItem>
	</Nav>
);
export default Navbar;
