import { Button } from 'react-bootstrap';

const EditorSkeletonCode = () => {
    return (
      <div className="container-fluid p-0 mt-2" style={{ overflowX: "hidden", overflowY: "hidden", backgroundColor: "#f2eeee" }}>
              <div className="bg-white border rounded-2" style={{  overflowY: "hidden" }}>
              <div className="d-flex flex-grow-1 ms-2" style={{ overflow: "hidden" }}>
            <div className="d-flex flex-column align-items-center" style={{ width: '80px', marginLeft: "-10px", marginTop: "10px" }}>
                {[1, 2, 3, 4, 5].map((_, index) => (
                    <div
                        key={index}
                        className="rounded-2 my-1 mx-auto"
                        style={{
                            width: '50px',
                            height: '55px',
                            backgroundColor: '#f8f9fa',
                        }}
                    />
                ))}
            </div>
            <div className="container-fluid p-0 mt-3" style={{ maxWidth: "100%", overflowX: "hidden"}}>
              <div className="row g-2">
                <div className="col-12">
                  <div className="" style={{ height: "calc(100vh - 100px)", overflowY: "hidden" }}>
                    <div className="d-flex h-100">
                      <div className="col-5 lg-8" style={{ height: "100%" }}>
                        <div className=" rounded-2 d-flex flex-column" style={{ height: "calc(100% - 5px)"}}>
                            <div className=" p-3 d-flex justify-content-between align-items-center">
                            </div>
                            <div className="p-3 flex-grow-1 me-1">
                            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}></pre>
                            <div className='d-flex justify-content-start mt-3'>
                            </div>
                            <div className="d-flex justify-content-between mb-3">
                                <div className="rounded-2" style={{ width: '100%', height: '200px', backgroundColor: '#f8f9fa', marginTop:'10px' }} />
                            </div>                                    
                            <div className='d-flex justify-content-start mt-3'>
                            </div>
                            <div className="mt-4">
                                <div className="d-flex flex-column mb-3">
                                    <div className="rounded-2 mb-1" style={{ width: '100%', height: '20px', backgroundColor: '#f8f9fa' }} />
                                    <div className="rounded-2 mb-1" style={{ width: '100%', height: '20px', backgroundColor: '#f8f9fa' }} />
                                    <div className="rounded-2 mb-1" style={{ width: '60%', height: '20px', backgroundColor: '#f8f9fa' }} />
                                    <div className="rounded-2 mb-1" style={{ width: '100%', height: '20px', backgroundColor: '#f8f9fa' }} />
                                    <div className="rounded-2 mb-1" style={{ width: '90%', height: '20px', backgroundColor: '#f8f9fa' }} />
                                    <div className="rounded-2 mb-1" style={{ width: '70%', height: '20px', backgroundColor: '#f8f9fa' }} />
                                    <div className="rounded-2 mb-1" style={{ width: '100%', height: '20px', backgroundColor: '#f8f9fa' }} />
                                    <div className="rounded-2 mb-1" style={{ width: '60%', height: '20px', backgroundColor: '#f8f9fa' }} />
                                    <div className="rounded-2 mb-1" style={{ width: '60%', height: '20px', backgroundColor: '#f8f9fa' }} />
                                    <div className="rounded-2 mb-1" style={{ width: '100%', height: '20px', backgroundColor: '#f8f9fa' }} />
                                </div>
                                <div className="row g-2">
                                </div>
                            </div>
                            </div>
                        </div>
                      </div>
                      <div className="d-flex flex-column" style={{ flex: "1", height: "100%", marginLeft: "20px" }}>
                        <div className=" rounded-2 me-3" style={{ height: "45%",  overflow: 'hidden' }}>
                        <div className=" p-3 d-flex justify-content-start align-items-center">
                            <div className="rounded-2 " style={{ width: '100px', height: '30px', backgroundColor: '#f8f9fa' }} />
                            <div className="rounded-2 ms-3 " style={{ width: '100px', height: '30px', backgroundColor: '#f8f9fa' }} />
                            <div>
                            </div>
                        </div>
                        <div className="col top" style={{ height: `calc(100% - 60px)`, overflowY: 'hidden', marginBottom: '10px' }}>
                            <div className="rounded-2 m-2" style={{ width: '95%', height: '200px', backgroundColor: '#f8f9fa'}} />
                        </div>
                        </div>
                       <div style={{ height: "9%", padding: "10px 0" }} className="d-flex flex-column justify-content-center me-3">
                          <div className="d-flex justify-content-between align-items-center h-100">
                            <div className="d-flex flex-column justify-content-center">
                            </div>
                            <div className="d-flex justify-content-end align-items-center">
                              <Button
                                variant="light"
                                className="me-2 "
                                style={{
                                  minWidth: "100px",
                                  height: "35px",

                                  boxShadow: "1px 2px 1px #888"
                                }}
                              >
                                {/* RUN */}
                              </Button>
                              <Button
                                variant="warning"
                                className=""
                                style={{
                                  backgroundColor: "#FBEFA5DB",
                                  minWidth: "100px",
                                  height: "35px",
                                  boxShadow: "1px 2px 1px #888"
                                }}
                                disabled={true}
                              >
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className=" rounded-2 me-3" style={{ height: "45%",  overflowY: 'hidden' }}>
                    <div className=" p-3 d-flex justify-content-between align-items-center">
                    </div>
                    <div className="p-3" style={{ height: "calc(100% - 58px)", overflow: 'hidden' }}>
                        <div className='d-flex justify-content-start mt-2'>
                        </div>
                        <iframe
                        style={{ width: '100%', height: '100%', backgroundColor: '', color: 'black', borderColor: 'white', outline: 'none', resize: 'none' }}
                        className="w-full h-full"
                        title="output"
                        sandbox="allow-scripts allow-same-origin"
                        width="100%"
                        height="100%"
                        ></iframe>
                    </div>
                    </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
              </div>
      </div>
    );
};

export default EditorSkeletonCode;
