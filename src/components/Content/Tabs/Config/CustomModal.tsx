import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';

interface Props {
	isOpen: boolean;
	toggle: () => void;
	msg: string;
	title: string;
}

const CustomModal = ({ isOpen, toggle, msg, title }: Props) => (
	<Modal isOpen={isOpen} toggle={toggle} className="veto_modal">
		<ModalHeader toggle={toggle}>{title}</ModalHeader>
		<ModalBody>{msg}</ModalBody>
		<ModalFooter className="no-padding">
			<Button color="primary" className="modal-save" onClick={toggle}>
				Ok
			</Button>
		</ModalFooter>
	</Modal>
);

export default CustomModal;
