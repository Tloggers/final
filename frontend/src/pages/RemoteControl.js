import React, { useState, useEffect } from "react";
import axios from "axios";
import "./RemoteControl.css"; // Updated CSS file

const RemoteControl = () => {
  const [status, setStatus] = useState("OFF");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:5000/api/pump-status");
        setStatus(response.data.status);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching pump status:", error);
        setError("Failed to fetch pump status. Please check the backend.");
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const togglePump = async () => {
    const newStatus = status === "ON" ? "OFF" : "ON";
    try {
      setLoading(true);
      const espUrl = `http://192.168.0.112/relay?status=${newStatus}`;
      await axios.get(espUrl);
      setStatus(newStatus);
      setLoading(false);
    } catch (error) {
      console.error("Error toggling relay status:", error.message);
      alert("Failed to toggle relay. Please check ESP connection.");
      setLoading(false);
    }
  };

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <div className="remote-control-container">
      <h1 className="title">Smart Remote Pump Control</h1>
      {loading ? (
        <p className="loading">Loading...</p>
      ) : (
        <>
          <div className="status-container">
            <p className="status-text">
              Pump Status: <strong>{status}</strong>
            </p>
            <div className={`motor ${status === "ON" ? "on" : "off"}`}>
              <div className={`fill ${status === "ON" ? "filling" : ""}`}></div>
            </div>
          </div>

          <button
            onClick={togglePump}
            className={`toggle-button ${status === "ON" ? "button-on" : "button-off"}`}
          >
            Turn {status === "ON" ? "OFF" : "ON"}
          </button>
        </>
      )}
    </div>
  );
};

export default RemoteControl;
