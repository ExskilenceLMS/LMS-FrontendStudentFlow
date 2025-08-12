import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <GoogleOAuthProvider clientId="560386638216-5oelp14c7nsi5o1306f16kq5q4k5jtag.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);


reportWebVitals();


