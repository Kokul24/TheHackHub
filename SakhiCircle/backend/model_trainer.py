"""
Sakhi-Score: Model Trainer
Generates synthetic SHG data and trains a RandomForest model for credit scoring.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pickle
import os

def generate_synthetic_data(n_samples=1000, random_state=42):
    """
    Generate synthetic data for Self-Help Groups (SHGs).
    
    Features:
    - Savings_Per_Member: Monthly savings per member (100-5000 INR)
    - Attendance_Rate: Meeting attendance percentage (50-100%)
    - Internal_Loan_Repayment: Loan repayment rate (0-100%)
    
    Target:
    - Credit_Score: 0-100 score
    - Risk_Status: 0 = High Risk, 1 = Low Risk
    """
    np.random.seed(random_state)
    
    # Generate features with realistic distributions
    savings = np.random.uniform(100, 5000, n_samples)
    attendance = np.random.uniform(50, 100, n_samples)
    repayment = np.random.uniform(0, 100, n_samples)
    
    # Calculate credit score based on weighted formula
    # Weights: Savings (30%), Attendance (30%), Repayment (40%)
    normalized_savings = (savings - 100) / (5000 - 100) * 100
    
    credit_score = (
        0.30 * normalized_savings +
        0.30 * attendance +
        0.40 * repayment
    )
    
    # Add some noise to make it realistic
    noise = np.random.normal(0, 5, n_samples)
    credit_score = np.clip(credit_score + noise, 0, 100)
    
    # Determine risk status: Low Risk (1) if score >= 60, else High Risk (0)
    risk_status = (credit_score >= 60).astype(int)
    
    # Create DataFrame
    df = pd.DataFrame({
        'Savings_Per_Member': savings,
        'Attendance_Rate': attendance,
        'Internal_Loan_Repayment': repayment,
        'Credit_Score': credit_score,
        'Risk_Status': risk_status
    })
    
    return df

def train_model(df):
    """
    Train a RandomForestClassifier on the SHG data.
    """
    # Features and target
    X = df[['Savings_Per_Member', 'Attendance_Rate', 'Internal_Loan_Repayment']]
    y = df['Risk_Status']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train Random Forest
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print("=" * 50)
    print("🎯 SAKHI-SCORE MODEL TRAINING COMPLETE")
    print("=" * 50)
    print(f"\n📊 Model Accuracy: {accuracy * 100:.2f}%")
    print(f"\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['High Risk', 'Low Risk']))
    
    # Feature importance
    feature_names = ['Savings_Per_Member', 'Attendance_Rate', 'Internal_Loan_Repayment']
    importances = model.feature_importances_
    
    print("\n🔍 Feature Importance:")
    for name, imp in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True):
        print(f"   {name}: {imp * 100:.1f}%")
    
    return model

def save_model(model, filepath='shg_model.pkl'):
    """Save the trained model to disk."""
    with open(filepath, 'wb') as f:
        pickle.dump(model, f)
    print(f"\n✅ Model saved to: {filepath}")

def main():
    print("\n🚀 Starting Sakhi-Score Model Training...\n")
    
    # Generate synthetic data
    print("📦 Generating synthetic SHG data (1000 samples)...")
    df = generate_synthetic_data(n_samples=1000)
    
    # Display sample data
    print("\n📄 Sample Data:")
    print(df.head(10).to_string(index=False))
    
    # Data statistics
    print("\n📈 Data Statistics:")
    print(f"   Total Samples: {len(df)}")
    print(f"   Low Risk SHGs: {(df['Risk_Status'] == 1).sum()} ({(df['Risk_Status'] == 1).mean()*100:.1f}%)")
    print(f"   High Risk SHGs: {(df['Risk_Status'] == 0).sum()} ({(df['Risk_Status'] == 0).mean()*100:.1f}%)")
    
    # Train model
    print("\n🔧 Training RandomForest model...")
    model = train_model(df)
    
    # Save model
    model_path = os.path.join(os.path.dirname(__file__), 'shg_model.pkl')
    save_model(model, model_path)
    
    # Save sample data for reference
    data_path = os.path.join(os.path.dirname(__file__), 'shg_data.csv')
    df.to_csv(data_path, index=False)
    print(f"📊 Sample data saved to: {data_path}")
    
    print("\n" + "=" * 50)
    print("🎉 Training complete! Ready for predictions.")
    print("=" * 50 + "\n")

if __name__ == "__main__":
    main()
