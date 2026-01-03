import React from 'react';
import SkeletonCode from './EditorSkeletonCode';

/**
 * Reusable loader component for all coding editors
 * Can be used by SQL, Python, HTML/CSS, and other coding components
 */
const CodingEditorLoader: React.FC = () => {
  return (
    <div className="container-fluid p-0 me-2 mt-1" style={{ height: `calc(100vh - 70px)`, maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <SkeletonCode />
      </div>
    </div>
  );
};

export default CodingEditorLoader;

