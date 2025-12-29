import React from "react";
import { Modal, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

interface PreviewModalProps {
  show: boolean;
  onHide: () => void;
  title?: string;
  content: React.ReactNode | null;
  error: string | null;
  centered?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  showFooter?: boolean;
  footerText?: string;
  showWarningIcon?: boolean;
  headerBgColor?: string;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  show,
  onHide,
  title = "Preview",
  content,
  error,
  centered = false,
  size = "lg",
  showFooter = true,
  footerText = "Close",
  showWarningIcon = false,
  headerBgColor
}) => {
  return (
    <>
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          .blinking-icon {
            animation: blink 1s infinite;
          }
        `}
      </style>
      <Modal 
        centered={centered} 
        show={show} 
        onHide={onHide} 
        size={size === "md" ? undefined : (size as any)}
      >
        <Modal.Header 
          closeButton
          className={headerBgColor ? `bg-${headerBgColor}` : ''}
        >
          <Modal.Title>
            {showWarningIcon && (
              <FontAwesomeIcon 
                icon={faExclamationTriangle} 
                className="blinking-icon me-2"
              />
            )}
            {title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? (
            <div className="text-danger">{error}</div>
          ) : content ? (
            content
          ) : null}
        </Modal.Body>
        {showFooter && (
          <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>
              {footerText}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </>
  );
};

export default PreviewModal;