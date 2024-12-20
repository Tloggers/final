import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Alerts.css';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Fetch unresolved alerts from the backend
    const fetchAlerts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/alerts');
        // Filter alerts for Ruiru and Juja only
        const filteredAlerts = response.data.filter(
          (alert) => alert.location === 'Ruiru' || alert.location === 'Juja'
        );
        setAlerts(filteredAlerts);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };
    
    fetchAlerts();
  }, []);

  const resolveAlert = async (alertId) => {
    try {
      await axios.post('http://localhost:5000/api/resolve-alert', { alert_id: alertId });
      setAlerts(alerts.filter(alert => alert.alert_id !== alertId));  // Remove resolved alert from state
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  return (
    <div className="alerts-container">
      <h1>Active Alerts</h1>
      <div className="alert-list">
        {alerts.length === 0 ? (
          <p>No active alerts at the moment.</p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.alert_id} className={`alert-item ${alert.severity === 'Critical' ? 'critical' : 'warning'}`}>
              <p><strong>{alert.timestamp}</strong></p>
              <p>{alert.description}</p>
              <button onClick={() => resolveAlert(alert.alert_id)} className="resolve-button">Resolve</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
