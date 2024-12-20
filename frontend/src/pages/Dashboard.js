import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaTachometerAlt, FaChartBar, FaBell, FaToggleOn } from "react-icons/fa";
import "./Dashboard.css";

const Dashboard = () => {
  const [sensorData, setSensorData] = useState({
    flow1: 0,
    flow2: 0,
    leak1: 0,
    leak2: 0,
    pumpStatus: "OFF",
  });

  const intervalRef = useRef(null); // Ref to track the interval

  const fetchData = async () => {
    try {
      const [sensorRes, pumpRes] = await Promise.all([
        axios.get("http://localhost:5000/api/sensor-readings"),
        axios.get("http://localhost:5000/api/pump-status"),
      ]);

      const { flow_rate_1, flow_rate_2, leakage_1, leakage_2 } = sensorRes.data;

      setSensorData({
        flow1: flow_rate_1,
        flow2: flow_rate_2,
        leak1: leakage_1,
        leak2: leakage_2,
        pumpStatus: pumpRes.data.status,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    let mounted = true; // Prevent state updates after unmount
    fetchData(); // Initial fetch

    intervalRef.current = setInterval(() => {
      if (mounted) fetchData();
    }, 5000);

    return () => {
      clearInterval(intervalRef.current); // Cleanup interval
      mounted = false; // Avoid state update after unmount
    };
  }, []);

  const { flow1, flow2, leak1, leak2, pumpStatus } = sensorData;

  return (
    <div className="dashboard-container">
      {/* Navigation */}
      <nav className="navigation">
        <NavButton to="/analytics" icon={<FaChartBar />} label="Analytics" />
        <NavButton to="/alerts" icon={<FaBell />} label="Alerts" />
        <NavButton to="/remote-control" icon={<FaToggleOn />} label="Remote Control" />
        <NavButton to="/water-flow" icon={<FaTachometerAlt />} label="Water Flow" />
      </nav>

      {/* Sensor Data */}
      <div className="sensor-data-grid">
        <SensorCard title="Ruiru Flow sensor" value={`${flow1} L/s`} />
        <SensorCard title="Juja Flow sensor" value={`${flow2} L/s`} />
        <SensorCard title="Ruiru Leak sensor" value={leak1} />
        <SensorCard title="Juja Leak sensor" value={leak2} />
        <SensorCard title="Pump Status" value={pumpStatus} />
      </div>
    </div>
  );
};

// Reusable Components
const NavButton = ({ to, icon, label }) => (
  <Link to={to} className="nav-button">
    {icon}
    <span>{label}</span>
  </Link>
);

const SensorCard = ({ title, value }) => (
  <div className="sensor-card">
    <h2>{title}</h2>
    <p>{value}</p>
  </div>
);

export default Dashboard;
