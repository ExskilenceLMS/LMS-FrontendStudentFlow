
const Skeleton = () => {
    return (
        <div className="d-flex flex-grow-1" style={{ height: '100%' }}>
            <div className="d-flex flex-column align-items-center" style={{ width: '80px' }}>
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

            <div className="flex-grow-1 d-flex flex-column " style={{ height: '100%' }}>
                <div className="border border-muted rounded-2" style={{ height: '100%',overflow: 'hide', boxShadow: '#00000033 0px 0px 5px 0px inset' }}>
                    <div className="border-bottom border-muted p-3 d-flex justify-content-between align-items-center">
                        <h5 className="m-0">Practice MCQs</h5>
                    </div>

                    <div className="p-3">
                        <div className="mb-4">
                            <div className="d-flex justify-content-between mb-3">
                                <div className="rounded-2" style={{ width: '100%', height: '20px', backgroundColor: '#f8f9fa' }} />
                            </div>
                            <div className="row g-2">
                                {[1, 2, 3, 4].map((_, index) => (
                                    <div key={index} className="col-6 d-flex align-items-center">
                                        <div className="me-2 mx-3">{String.fromCharCode(65 + index)}.</div>
                                        <div
                                            className="rounded-2 w-50 border border-muted"
                                            style={{ height: '30px', backgroundColor: '#f8f9fa' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-2 mt-3" style={{ width: '100px', height: '30px', backgroundColor: '#f8f9fa' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Skeleton;
