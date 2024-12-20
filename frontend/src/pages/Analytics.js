import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";
import "chart.js/auto";

const Analytics = () => {
    const [leakageData, setLeakageData] = useState({
        timestamps: [],
        values1: [],
        values2: [],
        predictions: {},
        last_leakage: {},
        alerts: {},
    });

    const [flowRateData, setFlowRateData] = useState({
        timestamps: [],
        values1: [],
        values2: [],
        differences: [],
        predictions: {},
        alerts: "",
    });

    const fetchData = async (endpoint, setState) => {
        try {
            const res = await axios.get(endpoint);
            setState(res.data);
        } catch (error) {
            console.error(`Error fetching data from ${endpoint}:`, error);
            setState({});
        }
    };

    useEffect(() => {
        fetchData("http://127.0.0.1:5000/analytics/Leakage", setLeakageData);
        fetchData("http://127.0.0.1:5000/analytics/FlowRate", setFlowRateData);

        const interval = setInterval(() => {
            fetchData("http://127.0.0.1:5000/analytics/Leakage", setLeakageData);
            fetchData("http://127.0.0.1:5000/analytics/FlowRate", setFlowRateData);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    const formatChartData = (data, labels, datasets) => {
        const timestamps = data.timestamps || [];
        return {
            labels: timestamps.length > 0 ? timestamps : ["No data"],
            datasets: datasets.map((dataset, index) => ({
                label: labels[index],
                data: timestamps.map((_, idx) => data[dataset.key]?.[idx] ?? 0),
                borderColor: dataset.color,
                backgroundColor: `rgba(${hexToRgb(dataset.color)}, 0.1)`,
            })),
        };
    };

    const hexToRgb = (hex) => {
        const bigint = parseInt(hex.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `${r}, ${g}, ${b}`;
    };

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "1fr 1fr",
                gap: "20px",
                padding: "20px",
                maxWidth: "1200px",
                margin: "0 auto",
            }}
        >
            {/* Leakage Over Time */}
            <div
                style={{
                    gridColumn: "1 / 2",
                    gridRow: "1 / 2",
                    border: "1px solid #ddd",
                    padding: "10px",
                    borderRadius: "5px",
                }}
            >
                <h2>Leakage Over Time</h2>
                <Line
                    data={formatChartData(
                        leakageData,
                        ["Ruiru leakage data", "Juja leakage data"],
                        [
                            { key: "values1", color: "#4BC0C0" },
                            { key: "values2", color: "#36A2EB" },
                        ]
                    )}
                    options={chartOptions}
                />
            </div>

            {/* Flow Rate Over Time */}
            <div
                style={{
                    gridColumn: "2 / 3",
                    gridRow: "1 / 2",
                    border: "1px solid #ddd",
                    padding: "10px",
                    borderRadius: "5px",
                }}
            >
                <h2>Flow Rate Over Time</h2>
                <Line
                    data={formatChartData(
                        flowRateData,
                        ["Ruiru flow data", "Juja flow data"],
                        [
                            { key: "values1", color: "#FF6384" },
                            { key: "values2", color: "#FF9F40" },
                        ]
                    )}
                    options={chartOptions}
                />
            </div>

            {/* Flow Rate Differences */}
            <div
                style={{
                    gridColumn: "1 / 2",
                    gridRow: "2 / 3",
                    border: "1px solid #ddd",
                    padding: "10px",
                    borderRadius: "5px",
                }}
            >
                <h2>Flow Rate Differences</h2>
                <Line
                    data={formatChartData(
                        flowRateData,
                        ["Flow Rate Difference"],
                        [{ key: "differences", color: "#FFCE56" }]
                    )}
                    options={chartOptions}
                />
            </div>

            {/* Machine Learning Alerts */}
            <div
                style={{
                    gridColumn: "2 / 3",
                    gridRow: "2 / 3",
                    border: "1px solid #ddd",
                    padding: "10px",
                    borderRadius: "5px",
                }}
            >
                <h2>Machine Learning Alerts</h2>
                <h3>Leakage Sensors</h3>
                <p>
                    <strong>Ruiru leakage sensor:</strong>{" "}
                    {leakageData.alerts?.sensor1 || "Awaiting alert..."}
                </p>
                <p>
                    <strong>Juja leakage sensor:</strong>{" "}
                    {leakageData.alerts?.sensor2 || "Awaiting alert..."}
                </p>
                <p>
                    <strong>Leakage Prediction:</strong>{" "}
                    {leakageData.predictions
                        ? JSON.stringify(leakageData.predictions)
                        : "Loading predictions..."}
                </p>
                <h3>Flow Rate Alert</h3>
                <p>
    {flowRateData.alerts && flowRateData.alerts.length > 0
        ? flowRateData.alerts[flowRateData.alerts.length - 1] // Show latest alert
        : "Awaiting alert..."}
</p>

                <p>
                    <strong>Flow Rate Prediction:</strong>{" "}
                    {flowRateData.predictions
                        ? JSON.stringify(flowRateData.predictions)
                        : "Loading predictions..."}
                </p>
            </div>
        </div>
    );
};

export default Analytics;
