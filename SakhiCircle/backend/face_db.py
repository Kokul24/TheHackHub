"""
Database Connection Module for Facial Recognition System
Handles MongoDB connection and face data operations.
"""

from datetime import datetime

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
from typing import List, Dict, Any, Optional

class FaceDatabase:
    """
    Manages MongoDB connection and operations for facial recognition data.
    """

    def __init__(self, connection_string: Optional[str] = None, database_name: str = "face_recognition"):
        """
        Initialize database connection.

        Args:
            connection_string: MongoDB connection string. If None, uses the hardcoded Atlas connection.
            database_name: Name of the database to use.
        """
        if connection_string is None:
            # Use the same MongoDB Atlas connection as main.py
            connection_string = "mongodb+srv://kokulkrishnan07_db_user:GjivqglXwk2XWWZP@streesquad.6v6zwht.mongodb.net/?appName=Streesquad"

        try:
            self.client = MongoClient(connection_string)
            # Test the connection
            self.client.admin.command('ping')
            print("Successfully connected to MongoDB")
        except ConnectionFailure:
            raise ConnectionError("Failed to connect to MongoDB. Please check your connection string.")

        self.db = self.client[database_name]
        self.collection = self.db["faces"]

    def save_face_encoding(self, name: str, encoding: List[float], metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Save a face encoding to the database.

        Args:
            name: Name of the person.
            encoding: 128-dimensional face encoding vector.
            metadata: Additional metadata (optional).

        Returns:
            The inserted document ID.
        """
        document = {
            "name": name,
            "encoding": encoding,
            "metadata": metadata or {},
            "created_at": datetime.now()
  # Use server time
        }

        result = self.collection.insert_one(document)
        print(f"Saved face encoding for {name}")
        return str(result.inserted_id)

    def get_all_face_encodings(self) -> List[Dict[str, Any]]:
        """
        Retrieve all face encodings from the database.

        Returns:
            List of documents containing name, encoding, and metadata.
        """
        return list(self.collection.find({}, {"_id": 0, "name": 1, "encoding": 1, "metadata": 1}))

    def delete_face_encoding(self, name: str) -> int:
        """
        Delete face encodings for a specific person.

        Args:
            name: Name of the person to delete.

        Returns:
            Number of documents deleted.
        """
        result = self.collection.delete_many({"name": name})
        print(f"Deleted {result.deleted_count} face encodings for {name}")
        return result.deleted_count

    def close_connection(self):
        """
        Close the database connection.
        """
        self.client.close()
        print("Database connection closed")