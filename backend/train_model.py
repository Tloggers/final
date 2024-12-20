import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
from db_connector import get_data_from_db

def train_model():
    # Fetch data
    data = get_data_from_db()
    print(data.head())  # Ensure data is loaded correctly

    # Define threshold for classification
    threshold = 5.0  # Set this based on your sensor data

    # Create target labels
    y = (data['value'] > threshold).astype(int)  # 1 if value > threshold, else 0

    # Prepare features (e.g., sensor_name one-hot encoded and timestamp converted)
    X = pd.get_dummies(data[['sensor_name']])  # Encode sensor_name
    X['timestamp'] = pd.to_datetime(data['timestamp']).view(int) // 10**9  # Convert to UNIX time

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train model
    model = RandomForestClassifier(random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred))
    print(f"Accuracy: {accuracy_score(y_test, y_pred)}")

    # Save the model
    joblib.dump(model, "leakage_model.pkl")
    print("Model saved as leakage_model.pkl")

if __name__ == "__main__":
    train_model()
