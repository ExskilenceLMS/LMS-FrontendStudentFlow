
const Skeleton = () => {
    return (
        <div className="d-flex flex-grow-1" style={{ height: '100%' }}>
            <div className="flex-grow-1 d-flex flex-column ms-3" style={{ height: '100%' }}>
                <div className="border border-muted rounded-2" style={{ height: '100%',overflow: 'hide', boxShadow: '#00000033 0px 0px 5px 0px inset' }}>
                    <div className="border-bottom border-muted p-3 d-flex justify-content-between align-items-center">
                        <h5 className="m-0">Practice Coding</h5>
                    </div>

                    <div className="p-3">
                        {[1, 2, 3].map((_, index) => (
                            <div key={index} className="mb-4">
                                <div className="d-flex align-items-start justify-content-between">
                                    <div className='d-flex flex-column'>
                                        <div className="d-flex align-items-start">
                                            <div className="rounded-2 me-2" style={{ width: '20px', height: '20px'}}>{String(1 + index)}.</div>
                                            <div className="rounded-2" style={{ width: '200px', height: '20px', backgroundColor: '#f8f9fa' }} />
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-5" style={{ minWidth: '275px' }}>
                                        <div className="rounded-2" style={{ width: '80px', height: '30px', backgroundColor: '#f8f9fa' }} />
                                        <div className='rounded-2' style={{ width: '60px', height: '20px', backgroundColor: '#f8f9fa' }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Skeleton;
