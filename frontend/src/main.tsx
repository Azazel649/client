import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";

import App from "./App";
import "./styles/variables.css";
import "./styles/global.css";
import "./styles/antdOverride.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
