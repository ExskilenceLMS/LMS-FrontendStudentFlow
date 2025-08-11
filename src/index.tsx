import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <GoogleOAuthProvider clientId="189749694536-gmkl081043f6sb22bavlic48s4up9t6g.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);


reportWebVitals();


