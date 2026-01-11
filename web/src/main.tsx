import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

console.log("[Epic Ages] main.tsx executing...");
console.log("[Epic Ages] React:", React);
console.log("[Epic Ages] ReactDOM:", ReactDOM);
console.log("[Epic Ages] App:", App);

const rootElement = document.getElementById("root");
console.log("[Epic Ages] Root element:", rootElement);

if (!rootElement) {
  console.error("[Epic Ages] Root element not found!");
} else {
  try {
    console.log("[Epic Ages] Creating React root...");
    const root = ReactDOM.createRoot(rootElement);
    console.log("[Epic Ages] React root created:", root);
    console.log("[Epic Ages] Rendering App...");
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("[Epic Ages] App rendered!");
  } catch (error) {
    console.error("[Epic Ages] Error rendering React app:", error);
  }
}
