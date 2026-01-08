"""
Real-time Face Recognition Module
Captures webcam feed, detects faces, and recognizes known individuals.
"""

import face_recognition
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from face_db import FaceDatabase
import time

class FaceRecognizer:
    """
    Handles real-time face recognition using webcam.
    """

    def __init__(self, db_connection_string: str = None, tolerance: float = 0.6):
        """
        Initialize the face recognizer.

        Args:
            db_connection_string: MongoDB connection string.
            tolerance: Euclidean distance threshold for face matching (lower = stricter).
        """
        self.db = FaceDatabase(connection_string=db_connection_string)
        self.tolerance = tolerance
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_metadata = []

        # Load known faces from database
        self.load_known_faces()

        # Initialize webcam
        self.video_capture = cv2.VideoCapture(0)
        if not self.video_capture.isOpened():
            raise RuntimeError("Could not open webcam")

        print("Face recognizer initialized successfully")

    def load_known_faces(self):
        """
        Load all known face encodings from the database into memory.
        """
        faces = self.db.get_all_face_encodings()

        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_metadata = []

        for face in faces:
            self.known_face_encodings.append(np.array(face["encoding"]))
            self.known_face_names.append(face["name"])
            self.known_face_metadata.append(face.get("metadata", {}))

        print(f"Loaded {len(self.known_face_encodings)} known faces from database")

    def recognize_faces_in_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, List[str], List[Tuple[int, int, int, int]]]:
        """
        Detect and recognize faces in a video frame.

        Args:
            frame: Video frame as numpy array (BGR format).

        Returns:
            Tuple of (processed_frame, face_names, face_locations)
        """
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Find face locations using HOG model
        face_locations = face_recognition.face_locations(rgb_frame, model="hog")

        if not face_locations:
            return frame, [], []

        # Extract face encodings
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        face_names = []
        for face_encoding in face_encodings:
            # If there are no known faces in DB, default to Unknown
            if len(self.known_face_encodings) == 0:
                name = "Unknown"
            else:
                # Compare with known faces
                matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding, tolerance=self.tolerance)
                name = "Unknown"

                # Find the best match safely
                face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                if len(face_distances) > 0:
                    best_match_index = np.argmin(face_distances)
                    if best_match_index < len(matches) and matches[best_match_index]:
                        name = self.known_face_names[best_match_index]

            face_names.append(name)

        # Draw rectangles and names on the frame
        for (top, right, bottom, left), name in zip(face_locations, face_names):
            # Draw rectangle around face
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)

            # Draw name label
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 255, 0), cv2.FILLED)
            cv2.putText(frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 1.0, (255, 255, 255), 1)

        return frame, face_names, face_locations

    def run_recognition_loop(self):
        """
        Run the real-time face recognition loop.
        Press 'q' to quit.
        """
        print("Starting face recognition. Press 'q' to quit.")

        frame_count = 0
        start_time = time.time()

        try:
            while True:
                # Capture frame-by-frame
                ret, frame = self.video_capture.read()

                if not ret:
                    print("Failed to capture frame")
                    break

                # Process frame for face recognition
                processed_frame, face_names, face_locations = self.recognize_faces_in_frame(frame)

                # Display the resulting frame
                cv2.imshow('Face Recognition', processed_frame)

                # Print recognition results every 30 frames
                frame_count += 1
                if frame_count % 30 == 0:
                    fps = frame_count / (time.time() - start_time)
                    print(f"FPS: {fps:.2f}, Detected faces: {len(face_names)}")
                    if face_names:
                        print(f"Recognized: {', '.join(face_names)}")

                # Break loop on 'q' key press
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

        finally:
            # Release resources
            self.video_capture.release()
            cv2.destroyAllWindows()
            self.db.close_connection()
            print("Face recognition stopped")

def main():
    """
    Main function to run face recognition.
    """
    # You can pass MongoDB connection string here
    # For local MongoDB: "mongodb://localhost:27017/"
    # For Atlas: "mongodb+srv://username:password@cluster.mongodb.net/"

    recognizer = FaceRecognizer()
    recognizer.run_recognition_loop()

if __name__ == "__main__":
    main()