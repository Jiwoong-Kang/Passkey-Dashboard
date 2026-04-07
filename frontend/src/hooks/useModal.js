import { useState } from 'react';
import React from 'react';
import Modal from '../components/Modal';

export function useModal() {
  const [modal, setModal] = useState(null);

  const showAlert = (message, alertType = 'info') => {
    return new Promise(resolve => {
      setModal({
        type: 'alert',
        message,
        alertType,
        onClose: () => { setModal(null); resolve(); },
      });
    });
  };

  const showConfirm = (message, options = {}) => {
    return new Promise(resolve => {
      setModal({
        type: 'confirm',
        message,
        danger: options.danger ?? false,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        onConfirm: () => { setModal(null); resolve(true); },
        onCancel:  () => { setModal(null); resolve(false); },
      });
    });
  };

  const ModalComponent = modal ? React.createElement(Modal, { key: 'modal', ...modal }) : null;

  return { showAlert, showConfirm, ModalComponent };
}
