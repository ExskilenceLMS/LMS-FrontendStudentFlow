import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Dropdown, Card, Table, OverlayTrigger, Tooltip } from 'react-bootstrap';

const Reports: React.FC = () => {
  const [subject, setSubject] = useState<string>('SQL');
  
  const reportData = [
    { week: 1, attendance: '1/1', attendancePercent: '100%', hoursSpent: 2, delay: 1, score: '100/500', scorePercent: '12 %' },
    { week: 2, attendance: '--', attendancePercent: '--', hoursSpent: 2, delay: 0, score: '100/500', scorePercent: '12 %' },
    { week: 3, attendance: '1/2', attendancePercent: '50%', hoursSpent: 2, delay: 0, score: '100/500', scorePercent: '12 %' },
    { week: 4, attendance: '0/1', attendancePercent: '0%', hoursSpent: 2, delay: 0, score: '100/500', scorePercent: '12 %' },
    { week: 5, attendance: '--', attendancePercent: '--', hoursSpent: 2, delay: 0, score: '100/500', scorePercent: '12 %' },
    { week: 6, attendance: '--', attendancePercent: '--', hoursSpent: 0, delay: '--', score: '100/500', scorePercent: '12 %' },
    { week: 7, attendance: '--', attendancePercent: '--', hoursSpent: 2, delay: 1, score: '100/500', scorePercent: '12 %' },
  ];

  const subjectOptions = ['All', 'SQL', 'Python', 'DSA'];

  return (
    <div className="container-fluid py-4">
      <div className="row mb-3">
        <div className="col-md-4">
          <div className="d-flex align-items-center">
            <span className="me-2">Subject:</span>
            <Dropdown>
              <Dropdown.Toggle variant="light" className="border">
                {subject}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {subjectOptions.map((option) => (
                  <Dropdown.Item 
                    key={option} 
                    onClick={() => setSubject(option)}
                    active={subject === option}
                  >
                    {option}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
        <div className="col-md-8 text-end">
          <div className="d-inline-block me-3">
            <Card className="shadow-sm">
              <Card.Body className="py-2 px-3">
                <strong>College Rank : 1</strong>
              </Card.Body>
            </Card>
          </div>
          <div className="d-inline-block">
            <Card className="shadow-sm">
              <Card.Body className="py-2 px-3">
                <strong>Overall Rank : 1</strong>
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-12">
          <Card>
            <Table className="table table-bordered mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Week</th>
                  <th>Attendance</th>
                  <th>Attendance in %</th>
                  <th>No of hours spent</th>
                  <th>
                    Delay (Days) 
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>Days delayed in submission</Tooltip>}
                    >
                      <span className="ms-1 text-muted">
                        <i className="bi bi-info-circle"></i>
                      </span>
                    </OverlayTrigger>
                  </th>
                  <th>Score</th>
                  <th>Score %</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(item => (
                  <tr key={item.week}>
                    <td>{item.week}</td>
                    <td>{item.attendance}</td>
                    <td>{item.attendancePercent}</td>
                    <td>{item.hoursSpent}</td>
                    <td>{item.delay}</td>
                    <td>{item.score}</td>
                    <td>{item.scorePercent}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;