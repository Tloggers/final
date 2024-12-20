const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const { exec } = require("child_process");
require('dotenv').config();

const app = express();

// CORS configuration
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow both localhost and 127.0.0.1
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};


app.use(cors(corsOptions));

app.options('*', cors(corsOptions)); // Handle preflight requests

app.use(express.json());

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) throw err;
    console.log('Database connected!');
});

// Routes and endpoints (existing code unchanged)
app.get('/api/predict-leak', (req, res) => {
    exec('python predict_leak.py', (err, stdout, stderr) => {
        if (err) {
            console.error("Prediction error:", stderr);
            return res.status(500).send("Error running prediction");
        }
        res.send(stdout.trim());
    });
});


// Endpoint to get the latest sensor readings
app.get('/api/sensor-readings', (req, res) => {
    const query = `
        SELECT sr.sensor_id, sr.value, s.sensor_name, s.location
        FROM sensorreadings sr
        JOIN sensors s ON sr.sensor_id = s.sensor_id
        WHERE sr.timestamp = (SELECT MAX(timestamp) FROM sensorreadings WHERE sensor_id = s.sensor_id)
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }

        const sensorData = {
            flow_rate_1: 0,
            flow_rate_2: 0,
            leakage_1: 0,
            leakage_2: 0,
        };

        results.forEach(result => {
            if (result.sensor_name === "Flow Sensor 1") {
                sensorData.flow_rate_1 = result.value;
            } else if (result.sensor_name === "Flow Sensor 2") {
                sensorData.flow_rate_2 = result.value;
            } else if (result.sensor_name === "Leakage Sensor 1") {
                sensorData.leakage_1 = result.value;
            } else if (result.sensor_name === "Leakage Sensor 2") {
                sensorData.leakage_2 = result.value;
            }
        });

        res.json(sensorData);
    });
});

// Endpoint to fetch unresolved alerts
app.get('/api/alerts', (req, res) => {
    const query = `SELECT * FROM alerts WHERE resolved = FALSE ORDER BY timestamp DESC LIMIT 10;`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Endpoint to resolve an alert
app.post('/api/resolve-alert', (req, res) => {
    const { alert_id } = req.body;

    const query = `UPDATE alerts SET resolved = TRUE WHERE alert_id = ?`;
    db.query(query, [alert_id], (err, result) => {
        if (err) {
            console.error("Error resolving alert:", err);
            return res.status(500).send("Error resolving alert");
        }
        res.status(200).send({ message: 'Alert resolved successfully' });
    });
});

// Endpoint for receiving sensor data via POST and updating alerts
app.post('/api/sensor-readings', (req, res) => {
    const { flow_rate_1, flow_rate_2, leakage_1, leakage_2 } = req.body;

    // Insert sensor data
    const query = `
        INSERT INTO sensorreadings (sensor_id, value, timestamp) VALUES
        (1, ?, NOW()),   -- Leakage Sensor 1
        (2, ?, NOW()),   -- Leakage Sensor 2
        (3, ?, NOW()),   -- Flow Sensor 1
        (4, ?, NOW());   -- Flow Sensor 2
    `;

    db.query(query, [leakage_1, leakage_2, flow_rate_1, flow_rate_2], (err, result) => {
        if (err) {
            console.error("Error inserting sensor data:", err);
            return res.status(500).send("Error inserting sensor data");
        }

        console.log("Sensor data inserted successfully");

        // Check for leakage and generate alerts
        let alerts = [];
        let flowDifference = Math.abs(flow_rate_1 - flow_rate_2);

        if (leakage_1 === 1) {  // Leakage Sensor 1 (Ruiru)
            const message = `Leakage detected at Ruiru! Flow rate difference: ${flowDifference} L/s.`;
            alerts.push({ description: message, severity: flowDifference > 1 ? 'Critical' : 'Warning', location: 'Ruiru' });
        }
        if (leakage_2 === 1) {  // Leakage Sensor 2 (Juja)
            const message = `Leakage detected at Juja! Flow rate difference: ${flowDifference} L/s.`;
            alerts.push({ description: message, severity: flowDifference > 1 ? 'Critical' : 'Warning', location: 'Juja' });
        }

        console.log("Leakage values:", { leakage_1, leakage_2 });
        console.log("Alerts to insert:", alerts);

        if (alerts.length > 0) {
            const alertQuery = `
                INSERT INTO alerts (description, severity, location, resolved, timestamp) 
                VALUES ${alerts.map(() => '(?, ?, ?, FALSE, NOW())').join(', ')};
            `;

            const alertValues = [];
            alerts.forEach(alert => {
                alertValues.push(alert.description, alert.severity, alert.location);
            });

            console.log("Alert query:", alertQuery);
            console.log("Alert values:", alertValues);

            db.query(alertQuery, alertValues, (alertErr, alertResult) => {
                if (alertErr) {
                    console.error("Error inserting alerts:", alertErr);
                    return res.status(500).send("Error inserting alerts");
                }
                console.log("Alerts inserted successfully");
                res.status(201).send({ message: 'Sensor data and alerts processed successfully' });
            });
        } else {
            // If no alerts are generated, send a response here.
            res.status(201).send({ message: 'Sensor data inserted successfully, no alerts' });
        }
    });
});


app.post('/api/pump-status', (req, res) => {
    const { status } = req.body; // Get status from request body

    if (!['ON', 'OFF'].includes(status)) {
        return res.status(400).send({ error: 'Invalid status value. Must be ON or OFF.' });
    }

    const query = "INSERT INTO pumprelaystatus (status, timestamp) VALUES (?, NOW())";

    db.query(query, [status], (err) => {
        if (err) {
            console.error("Error updating pump status:", err);
            return res.status(500).send("Failed to update pump status");
        }
        res.status(200).send({ message: "Pump status updated successfully" });
    });
});


app.post('/api/relay-status', (req, res) => {
    const { status } = req.body;

    // Validate the input
    if (!['ON', 'OFF'].includes(status)) {
        return res.status(400).send("Invalid status value.");
    }

    // Insert the status into the database
    const query = "INSERT INTO pumprelaystatus (status) VALUES (?);";
    db.query(query, [status], (err, result) => {
        if (err) {
            console.error("Database insertion error:", err);
            return res.status(500).send("Error updating relay status.");
        }
        res.status(200).send("Relay status updated successfully.");
    });
});
app.get('/api/sensor-historical', (req, res) => {
    const query = `
        SELECT sr.timestamp, s.sensor_name, sr.value, pr.status as pump_status
        FROM sensorreadings sr
        JOIN sensors s ON sr.sensor_id = s.sensor_id
        LEFT JOIN pumprelaystatus pr ON sr.timestamp = pr.timestamp
        ORDER BY sr.timestamp;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching historical data:", err);
            return res.status(500).send("Database query failed");
        }
        res.json(results);
    });
});




app.get('/api/analytics', (req, res) => {
    const query = `
        SELECT sensor_id, AVG(value) as average, MAX(value) as max, MIN(value) as min
        FROM sensorreadings
        GROUP BY sensor_id;
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);

        const analytics = results.map((row) => ({
            sensor_id: row.sensor_id,
            average: row.average,
            max: row.max,
            min: row.min,
        }));
        res.json(analytics);
    });
});
app.get('/api/pump-status', (req, res) => {
    const query = "SELECT status FROM pumprelaystatus ORDER BY timestamp DESC LIMIT 1;";
    db.query(query, (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).send("Database error.");
        }

        if (results.length > 0) {
            res.json({ status: results[0].status });
        } else {
            res.json({ status: "OFF" }); // Default if no rows exist
        }
    });
});



// Start server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
