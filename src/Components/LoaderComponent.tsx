import React from 'react';
import { Spinner } from 'react-bootstrap';

const LoaderComponent = () => {

    return (
        <div
        className="d-flex justify-content-center align-items-center bg-white mt-2 me-2"
        style={{ height: `calc(100vh - 70px)` }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    )
}

export default LoaderComponent;