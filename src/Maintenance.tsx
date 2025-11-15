import React from 'react';

const Maintenance: React.FC = () => {
  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center" 
         style={{ 
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           fontFamily: 'Poppins, sans-serif'
         }}>
      <div className="row w-100 justify-content-center">
        <div className="col-12 col-lg-8 d-flex align-items-center justify-content-center">
          <div className="text-center text-white">
            <div className="mb-4">
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
                style={{ animation: 'float 3s ease-in-out infinite' }}
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            
            <h1 className="display-4 fw-bold mb-4" 
                style={{ 
                  background: 'linear-gradient(135deg, #f5d547, #48e28f)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
              System Maintenance
            </h1>
            
            <p className="lead mb-5" style={{ maxWidth: '900px', margin: '0 auto' }}>
              We're currently performing scheduled maintenance to improve your experience.
              Our systems will be back online shortly.
            </p>
            
            <div className="card bg-white bg-opacity-10 backdrop-blur border-0 mb-4" 
                 style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div className="card-body">
                <div className="row">
                  <div className="col-6">
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span className="fw-semibold">Status:</span>
                      <span className="text-warning fw-medium">Under Maintenance</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span className="fw-semibold">Expected Return:</span>
                      <span className="text-info fw-medium">{process.env.REACT_APP_MAINTENANCE_EXPECTED_RETURN}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <button 
                className="btn btn-outline-light btn-lg me-3"
                onClick={() => window.location.reload()}
              >
                <i className="fas fa-sync-alt me-2"></i>
                Refresh Page
              </button>
            </div>
            
            <div className="mt-5 pt-4 border-top border-white border-opacity-25">
              <p className="mb-2">Thank you for your patience during this maintenance period.</p>
              <p className="small fst-italic text-white-50">
                For urgent matters, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .backdrop-blur {
          backdrop-filter: blur(10px);
        }
      `}</style>
    </div>
  );
};

export default Maintenance;
