import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand } from '@fortawesome/free-solid-svg-icons';

export interface ModalContent {
  type: 'image' | 'video' | 'output';
  src: string;
  title: string;
}

interface ModalProps {
  showModal: boolean;
  modalContent: ModalContent | null;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ showModal, modalContent, onClose }) => {
  if (!showModal || !modalContent) return null;

  return (
    <div 
      className="modal fade show" 
      style={{ 
        display: 'block', 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10000
      }} 
      tabIndex={-1}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{modalContent.title}</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body p-0" style={{ maxHeight: '80vh' }}>
            {modalContent.type === 'image' && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'flex-start',
                minHeight: '100%',
                padding: '10px',
                maxHeight: '80vh',
                overflow: 'auto'
              }}>
                <img 
                  src={modalContent.src} 
                  className="img-fluid" 
                  alt={modalContent.title}
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>
            )}
            {modalContent.type === 'video' && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'flex-start',
                minHeight: '100%',
                padding: '10px',
                maxHeight: '80vh',
                overflow: 'auto'
              }}>
                <video 
                  src={modalContent.src} 
                  controls
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
            )}
            {modalContent.type === 'output' && (
              <div style={{ 
                maxHeight: '80vh', 
                overflow: 'auto',
                padding: '10px'
              }}>
                <iframe
                  srcDoc={modalContent.src}
                  style={{ 
                    width: '100%', 
                    height: '80vh', 
                    border: 'none',
                    overflow: 'auto'
                  }}
                  sandbox="allow-scripts allow-same-origin"
                  scrolling="yes"
                  title={modalContent.title}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TabNavigationProps {
  tabs: Array<{ name: string; type: string }>;
  activeTab: string;
  onTabClick: (fileName: string) => void;
  showExpandButton?: boolean;
  onExpandClick?: () => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ 
  tabs, 
  activeTab, 
  onTabClick, 
  showExpandButton = false, 
  onExpandClick 
}) => {
  return (
    <div className="d-flex align-items-center" style={{ flex: 1, minWidth: 0 }}>
      <div 
        className="d-flex"
        style={{ 
          flexWrap: 'nowrap',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: "thin",
          scrollbarColor: "#c1c1c1 #f1f1f1",
          flex: 1,
          minWidth: 0,
          maxWidth: showExpandButton ? 'calc(100% - 40px)' : '100%'
        }}
      >
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`btn me-2 ${activeTab === tab.name ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => onTabClick(tab.name)}
            style={{ 
              fontSize: "12px", 
              padding: "4px 8px",
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            title={tab.name}
          >
            {tab.name}
          </button>
        ))}
      </div>
      {showExpandButton && (
        <FontAwesomeIcon 
          icon={faExpand} 
          className='text-dark ms-2 me-2' 
          onClick={onExpandClick} 
          style={{ cursor: 'pointer', fontSize: "16px", flexShrink: 0 }} 
        />
      )}
    </div>
  );
};

interface ExpectedOutputProps {
  questionData: any;
  activeOutputTab: string;
  onOutputTabChange: (tab: 'image' | 'video') => void;
  onImageClick: (src: string, title: string) => void;
  onVideoClick: (src: string, title: string) => void;
}

export const ExpectedOutput: React.FC<ExpectedOutputProps> = ({
  questionData,
  activeOutputTab,
  onOutputTabChange,
  onImageClick,
  onVideoClick
}) => {
  return (
    <div className="p-2 d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid #e9ecef" }}>
      <h5 className="m-0" style={{ fontSize: "16px", fontWeight: "600" }}>
        Expected Output
      </h5>
      {/* Image and Video buttons - only show if both are available */}
      {questionData?.image_path && questionData?.video_path && (
        <div className="d-flex">
          <button
            className={`btn me-2 ${activeOutputTab === 'image' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => onOutputTabChange('image')}
            style={{ fontSize: "12px", padding: "4px 8px" }}
          >
            Image
          </button>
          <button
            className={`btn ${activeOutputTab === 'video' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => onOutputTabChange('video')}
            style={{ fontSize: "12px", padding: "4px 8px" }}
          >
            Video
          </button>
        </div>
      )}
    </div>
  );
};

interface ExpectedOutputContentProps {
  questionData: any;
  activeOutputTab: string;
  onImageClick: (src: string, title: string) => void;
  onVideoClick: (src: string, title: string) => void;
}

export const ExpectedOutputContent: React.FC<ExpectedOutputContentProps> = ({
  questionData,
  activeOutputTab,
  onImageClick,
  onVideoClick
}) => {
  return (
    <div 
      className="flex-fill overflow-auto p-3 d-flex justify-content-center align-items-start"
      style={{ 
        scrollbarWidth: "thin",
        scrollbarColor: "#c1c1c1 #f1f1f1"
      }}
    >
      {/* Show image if it's the active tab or if no video is available */}
      {((questionData?.image_path && questionData?.video_path && activeOutputTab === 'image') || 
        (questionData?.image_path && !questionData?.video_path)) && (
        <img 
          src={questionData.image_path} 
          className="img-fluid" 
          alt="Expected Output" 
          style={{ 
            cursor: 'pointer',
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onClick={() => onImageClick(questionData.image_path, 'Expected Output')}
        />
      )}

      {/* Show video if it's the active tab or if no image is available */}
      {((questionData?.image_path && questionData?.video_path && activeOutputTab === 'video') || 
        (!questionData?.image_path && questionData?.video_path)) && (
        <video 
          src={questionData.video_path} 
          className="img-fluid" 
          controls
          style={{ 
            cursor: 'pointer',
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onClick={() => onVideoClick(questionData.video_path, 'Expected Output Video')}
        />
      )}

      {/* Show message if neither image nor video is available */}
      {!questionData?.image_path && !questionData?.video_path && (
        <div className="text-center text-muted" style={{ padding: "20px" }}>
          <FontAwesomeIcon icon={faExpand} style={{ fontSize: "48px", opacity: 0.3 }} />
          <p className="mt-2">No expected output available</p>
        </div>
      )}
    </div>
  );
};
