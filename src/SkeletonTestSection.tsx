import React from "react";

const SkeletonTestSection: React.FC = () => {
  return (
    <div style={{ backgroundColor: "#F2EEEE", height: `calc(100vh - 90px)` }}>
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <div
          className="container-fluid bg-white mt-3 rounded-1 py-2"
          style={{ height: `calc(100vh - 70px)`, overflowY: "auto" }}
        >
          <div className="mb-3">
            <span className="fs-5 skeleton">Section 1: MCQ</span>
            <span className="float-end skeleton">Completed : </span>
          </div>
          {[...Array(5)].map((_, index) => (
            <div
              className="d-flex flex-column flex-md-row justify-content-between align-items-center py-2"
              key={index}
            >
              <div
                className="w-100 px-2 rounded-1 py-2 d-flex flex-column flex-md-row justify-content-between align-items-center ms-2"
                style={{ backgroundColor: "#F5F5F5" }}
              >
              </div>
            </div>
          ))}
          <hr />
          <h5 className="fw-normal skeleton">Section 2: Coding</h5>
          {[...Array(5)].map((_, index) => (
            <div
              className="d-flex flex-column flex-md-row justify-content-between align-items-center py-2"
              key={index}
            >
              <div
                className="w-100 px-2 rounded-1 py-2 d-flex flex-column flex-md-row justify-content-between align-items-center ms-2"
                style={{ backgroundColor: "#F5F5F5" }}
              >
              </div>
            </div>
          ))}
          <div className="d-flex justify-content-center mt-3">
            <button className="btn btn-sm px-2 py-1 border border-black skeleton">Submit the Test</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonTestSection;
