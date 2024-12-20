from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import numpy as np
from sklearn.linear_model import LinearRegression

app = Flask(__name__)
CORS(app)

# MySQL Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'magicD53@',
    'database': 'waterleakagemonitoringdb'
}

def get_db_connection():
    """Create a database connection."""
    return mysql.connector.connect(**DB_CONFIG)

def fetch_sensor_data(sensor_type):
    """Fetch sensor data from the database based on the sensor type."""
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT s.sensor_name, sr.timestamp, sr.value
        FROM sensorreadings sr
        INNER JOIN sensors s ON sr.sensor_id = s.sensor_id
        WHERE s.sensor_type = %s
        ORDER BY sr.timestamp
    """
    cursor.execute(query, (sensor_type,))
    result = cursor.fetchall()

    cursor.close()
    connection.close()
    return result

def predict_next_value(values):
    """Predict the next value using Linear Regression."""
    if len(values) < 2:
        return values[-1] if values else 0

    X = np.array(range(len(values))).reshape(-1, 1)
    y = np.array(values).reshape(-1, 1)

    model = LinearRegression()
    model.fit(X, y)
    prediction = model.predict([[len(values)]])[0][0]
    return round(prediction, 2)

def process_sensor_data(data, sensor_names):
    """Organize sensor data into structured lists for timestamps and values."""
    timestamps = sorted({row['timestamp'].strftime('%Y-%m-%d %H:%M:%S') for row in data})
    values = {sensor: [0] * len(timestamps) for sensor in sensor_names}

    timestamp_index = {ts: idx for idx, ts in enumerate(timestamps)}
    for row in data:
        index = timestamp_index[row['timestamp'].strftime('%Y-%m-%d %H:%M:%S')]
        if row['sensor_name'] in sensor_names:
            values[row['sensor_name']][index] = row['value']

    return timestamps, values

@app.route('/')
def index():
    return jsonify({'message': 'Water Leakage Monitoring API is running.'})

@app.route('/analytics/Leakage', methods=['GET'])
def leakage_data():
    """Endpoint to fetch and analyze leakage sensor data."""
    data = fetch_sensor_data("Leakage")
    sensor_names = ['Leakage Sensor 1', 'Leakage Sensor 2']

    timestamps, values = process_sensor_data(data, sensor_names)
    leakage1, leakage2 = values['Leakage Sensor 1'], values['Leakage Sensor 2']

    last_leakage_index = next((i for i in reversed(range(len(timestamps))) if leakage1[i] > 0 or leakage2[i] > 0), None)
    last_leakage = {
        "timestamp": timestamps[last_leakage_index] if last_leakage_index is not None else None,
        "leakage1": leakage1[last_leakage_index] if last_leakage_index is not None else 0,
        "leakage2": leakage2[last_leakage_index] if last_leakage_index is not None else 0,
    }

    predictions = {
        "leakage1": predict_next_value(leakage1),
        "leakage2": predict_next_value(leakage2),
    }

    alerts = {
        "sensor1": "No Leakage" if predictions['leakage1'] < 0.25 else 
                    "Leakage likely soon" if predictions['leakage1'] < 0.5 else 
                    "Leakage detected at Sensor 1",
        "sensor2": "No Leakage" if predictions['leakage2'] < 0.25 else 
                    "Leakage likely soon" if predictions['leakage2'] < 0.5 else 
                    "Leakage detected at Sensor 2",
    }

    response = {
        "timestamps": timestamps,
        "values1": leakage1,
        "values2": leakage2,
        "last_leakage": last_leakage,
        "statistics": {
            "total_events": len(data),
            "average_leakage1": round(sum(leakage1) / max(len(leakage1), 1), 2),
            "average_leakage2": round(sum(leakage2) / max(len(leakage2), 1), 2),
            "max_leakage1": max(leakage1, default=0),
            "max_leakage2": max(leakage2, default=0),
        },
        "predictions": predictions,
        "alerts": alerts
    }
    return jsonify(response)

@app.route('/analytics/FlowRate', methods=['GET'])
def flow_rate_data():
    """Endpoint to fetch and analyze flow rate sensor data."""
    data = fetch_sensor_data("FlowRate")
    if not data:
        return jsonify({
            "message": "No data available for flow rate sensors.",
            "predictions": {"flowrate1": 0, "flowrate2": 0},
            "statistics": {},
        })

    sensor_names = ['Flow Sensor 1', 'Flow Sensor 2']
    timestamps, values = process_sensor_data(data, sensor_names)
    flowrate1, flowrate2 = values['Flow Sensor 1'], values['Flow Sensor 2']

    flowrate_differences = [abs(f1 - f2) for f1, f2 in zip(flowrate1, flowrate2)]
    alert_flowrate = [
        f"Leakage is occurring with {diff} L/s" if diff > 2 else "Flow rate difference normal"
        for diff in flowrate_differences
    ]

    predictions = {
        "flowrate1": predict_next_value(flowrate1),
        "flowrate2": predict_next_value(flowrate2),
    }

    response = {
        "timestamps": timestamps,
        "values1": flowrate1,
        "values2": flowrate2,
        "differences": flowrate_differences,
        "statistics": {
            "total_events": len(data),
            "average_flowrate1": round(sum(flowrate1) / max(len(flowrate1), 1), 2),
            "average_flowrate2": round(sum(flowrate2) / max(len(flowrate2), 1), 2),
            "max_flowrate1": max(flowrate1, default=0),
            "max_flowrate2": max(flowrate2, default=0),
        },
        "predictions": predictions,
        "alerts": alert_flowrate
    }
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)
