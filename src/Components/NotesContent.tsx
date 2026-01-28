import React from "react";
import { Spinner } from "react-bootstrap";
import Skeleton from "react-loading-skeleton";

interface NoteData {
  id: number;
  content: string;
}

interface NotesContentProps {
  noteData: NoteData | null;
  loading?: boolean;
  paddingLeft?: boolean;
}

const NotesContent: React.FC<NotesContentProps> = ({ noteData, loading = false, paddingLeft = true }) => {
  // Show loader while loading
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  // Show error message if not loading but no data
  if (!noteData || !noteData.content) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <div className="text-center">
          <p className="text-muted">Notes not available</p>
        </div>
      </div>
    );
  }

  // Display HTML content directly in div using dangerouslySetInnerHTML
  return (
    <div
      className={`p-0 m-0 ${paddingLeft ? 'ps-3' : ''} scrollable-content notes-font-family`}
      style={{
        fontSize: "16px",
        lineHeight: "1.6",
        padding: "20px",
        color: "#333",
        minHeight: "100%",
        overflow: "auto",
      }}
      dangerouslySetInnerHTML={{
        __html: `
                    <style>
                        h1, h2 {
                            font-weight: 600;
                            color: #2C3E50;
                            
                        }
                        ul {
                            margin: 10px 0 20px 20px;
                        }
                        li {
                            margin-bottom: 8px;
                        }
                        code {
                            background-color: #F4F4F4;
                            padding: 4px 6px;
                            font-family: Consolas, monospace;
                            border-radius: 4px;
                        }
                        table {
                            border-collapse: collapse;
                            width: 100%;
                            margin: 20px 0;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 12px;
                            text-align: left;
                        }
                        th {
                            background-color: #F0F0F0;
                        }
                        pre {
                            background-color: #F8F8F8;
                            padding: 12px;
                            border-left: 3px solid #ccc;
                            font-size: 15px;
                            overflow-x: auto;
                        }
                    </style>
                    ${noteData.content}
                `,
      }}
    />
  );
};

export default NotesContent;

