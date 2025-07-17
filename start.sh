#!/bin/sh

# Start the status monitoring server in the background
echo "Starting status monitoring server..."
cd /app/server && node dist/main.js &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

# Start the Next.js frontend
echo "Starting frontend..."
cd /app && npm start &
FRONTEND_PID=$!

# Function to handle shutdown
shutdown() {
    echo "Shutting down..."
    kill $SERVER_PID
    kill $FRONTEND_PID
    wait $SERVER_PID
    wait $FRONTEND_PID
    exit 0
}

# Handle signals
trap shutdown SIGINT SIGTERM

# Wait for processes
wait $SERVER_PID
wait $FRONTEND_PID