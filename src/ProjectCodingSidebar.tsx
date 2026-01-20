import React, { forwardRef } from "react";
import NotesContent from "./Components/NotesContent";

const ProjectCodingSidebar = forwardRef((props, ref) => {
  return (
    <div className="d-flex flex-column overflow-hidden" style={{ height: "calc(100vh - 70px)" }}>
      <div className="card border-0 d-flex flex-column h-100 overflow-hidden">
        <div className="card-header flex-shrink-0 text-white" style={{ backgroundColor: "#4f46e5" }}>
          <p className="mb-0 fw-semibold">
            TASK | {sessionStorage.getItem("projectCoding_pageName") || ""}
          </p>
        </div>
        <div className="p-1 flex-grow-1 d-flex flex-column overflow-auto" style={{ minHeight: 0 }}>
          <NotesContent
            noteData={{
              id: 1,
              content: sessionStorage.getItem("currentQuestionContent") || "",
            }}
            loading={false}
            paddingLeft={false}
                        />
                      </div>
                    </div>
                  </div>
  );
});

export default ProjectCodingSidebar;
