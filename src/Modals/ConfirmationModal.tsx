import React from "react";
import { Modal, Button } from "react-bootstrap";

interface ConfirmationModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "success" | "danger" | "warning" | "info";
  cancelVariant?: "secondary" | "outline-secondary";
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  centered?: boolean;
  size?: "sm" | "lg" | "xl";
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  show,
  onHide,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Yes",
  cancelText = "No",
  confirmVariant = "success",
  cancelVariant = "secondary",
  disabled = false,
  loading = false,
  loadingText = "Processing...",
  centered = true,
  size = "lg"
}) => {
  const handleConfirm = () => {
    if (!disabled && !loading) {
      onConfirm();
    }
  };

  const handleHide = () => {
    if (!disabled && !loading) {
      onHide();
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleHide}
      centered={centered}
      size={size}
      backdrop={disabled || loading ? "static" : true}
      keyboard={!(disabled || loading)}
    >
      <Modal.Header closeButton={!(disabled || loading)}>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant={cancelVariant}
          onClick={handleHide}
          disabled={disabled || loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={handleConfirm}
          disabled={disabled || loading}
        >
          {loading ? loadingText : confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmationModal;

