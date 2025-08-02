import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Dashboard from './Dashboard';
import SubjectOverview from './SubjectOverview';
import FAQ from './Components/FAQ';
import OnlineSession from './OnlineSession';
import ReportProblem from './ReportProblem';
import Profile from './Profile';
import SubjectRoadMap from './SubjectRoadMap';
import SQLEditor from './SQLEditor';
import PyEditor from './PyEditor';
import Test from './Test';
import TestIntro from './TestIntroduction';
import TestSection from './TestSection';
import TestReport from './TestReport';
import HTMLCSSEditor from './HTMLCSSEditor';
import JSEditor from './JSEditor';
import TestMcq from './TestMcq';
import Reports from './Reports';
import Placement from './Placement';
import Login from './Login';
import Layout from './Components/Layout';
import EditProfile from './Components/EditProfile';
import TestSQLCoding from './TestSQLCoding';
import TestingMCQS from './Components/TestingMCQS';
import PythonContentTester from './PythonContentTester';
import DynamicCodingEditorWrapper from './Components/DynamicCodingEditorWrapper';

const AppRoutes = () => {
  return (
          <Routes>
        <Route path="/" element={<Login />} />
        {/* Public route for Python content testing - no login required */}
        <Route path="/python-content-tester" element={<PythonContentTester />} />
        <Route element={<ProtectedRoute />}>
        <Route path="/Dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/SubjectOverview" element={<Layout><SubjectOverview /></Layout>} />
        <Route path="/FAQ" element={<Layout><FAQ /></Layout>} />
        <Route path="/Placement" element={<Layout><Placement /></Layout>} />
        <Route path="/Reports" element={<Layout><Reports /></Layout>} />
        <Route path="/Online-Session" element={<Layout><OnlineSession /></Layout>} />
        <Route path="/Report-Problem" element={<Layout><ReportProblem /></Layout>} />
        <Route path="/Profile" element={<Layout><Profile /></Layout>} />
        <Route path="/Subject-Roadmap" element={<Layout><SubjectRoadMap /></Layout>} />
        <Route path="/Sql-editor" element={<Layout><SQLEditor /></Layout>} />
        <Route path="/py-editor" element={<Layout><PyEditor /></Layout>} />
        <Route path="/html-css-editor" element={<Layout><HTMLCSSEditor /></Layout>} />
        <Route path="/js-editor" element={<Layout><JSEditor /></Layout>} />
        <Route path="/test" element={<Layout><Test /></Layout>} />
        <Route path="/test-introduction" element={<Layout><TestIntro /></Layout>} />
        <Route path="/test-section" element={<Layout><TestSection /></Layout>} />
        <Route path="/test-report" element={<Layout><TestReport /></Layout>} />
        <Route path="/mcq-temp" element={<Layout><TestMcq /></Layout>} />
        <Route path="/coding-temp" element={<Layout><TestSQLCoding /></Layout>} />
        <Route path="/dynamic-coding-editor" element={<Layout><DynamicCodingEditorWrapper /></Layout>} />
        <Route path="/EditProfile" element={<Layout><EditProfile /></Layout>} />
        <Route path="/SQL-MCQ-Testing" element={<Layout><TestingMCQS /></Layout>} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
