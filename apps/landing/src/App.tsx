import { useEffect } from "react";
import TrollFace from "./assets/Trollface.png";
import "./App.css";

function App() {
  function getVisitorId() {
    let visitorId = localStorage.getItem("visitor_id");

    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("visitor_id", visitorId);
    }

    return visitorId;
  }
  useEffect(() => {
  async function registerVisit() {
    await fetch("https://analytics-platform-1-isvp.onrender.com/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visitorId: getVisitorId(),

        language: navigator.language,
        userAgent: navigator.userAgent,

        browser: navigator.userAgent,
        os: navigator.platform,

        deviceType: window.innerWidth < 768 ? "Mobile" : "Desktop",

        screenWidth: screen.width,
        screenHeight: screen.height,

        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,

        currentUrl: window.location.href,
        referrer: document.referrer,
      }),
    });
  }

  registerVisit();
}, []);


  return <>
    <img src={TrollFace} alt="Trollface" />
  </>;
}

export default App;
