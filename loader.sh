#!/bin/bash

coloroff='\033[0m'
magenta='\033[0;35m'
red='\033[0;31m' 
green='\033[0;32m' 
blue='\033[0;34m'
cyan='\033[0;36m'
white='\033[0;37m'
yellow='\033[0;33m' 

sleep 1
echo -e $magenta " _____ ______   _______   ___       ___  __    ________  ________   _______   ________     " $coloroff
echo -e $magenta "|\   _ \  _   \|\  ___ \ |\  \     |\  \|\  \ |\   __  \|\   ___  \|\  ___ \ |\   __  \    " $coloroff
echo -e $magenta "\ \ \ \ \_\ \  \ \   __/|\ \  \    \ \  \/  /|\ \  \|\  \ \ \ \ \  \ \   __/|\ \  \|\  \   " $coloroff
echo -e $magenta " \ \ \ \|__| \  \ \  \_|/_\ \  \    \ \   ___  \ \   __  \ \ \ \ \  \ \  \_|/_\ \   __  \  " $coloroff
echo -e $magenta "  \ \  \    \ \  \ \  \_|\ \ \  \____\ \ \ \ \  \ \  \ \  \ \ \ \ \  \ \  \_|\ \ \  \ \  \ " $coloroff
echo -e $magenta "   \ \__\    \ \__\ \_______\ \_______\ \_\ \ \__\ \__\ \__\ \_\ \ \__\ \_______\ \__\ \__\ " $coloroff
echo -e $magenta "    \|__|     \|__|\|_______|\|_______|\|__| \|__|\|__|\|__|\|__| \|__|\|_______|\|__|\|__|" $coloroff

echo -e $cyan "melkanea" $magenta "lazzy" $white "loader" $magenta "nodejs" $cyan "apps" $coloroff

# Define the server file path
SERVER_FILE="server.js"

# Function to start the server
start_server() {
  echo "Starting server..."
  node $SERVER_FILE &
  SERVER_PID=$!
  echo "Server started with PID $SERVER_PID."
  
}

# Function to stop the server
stop_server() {
  echo "Stopping server..."
  
  # Find and kill worker threads
  WORKER_PIDS=$(pgrep -P $SERVER_PID)
  if [ -n "$WORKER_PIDS" ]; then
    echo "Total worker threads: $(echo $WORKER_PIDS | wc -w)"

    echo "Stopping worker threads with PIDs: $WORKER_PIDS"
    
    for pid in $WORKER_PIDS; do
        echo "Stopping worker thread with PID: $pid"
        pkill -P $pid
    done
  fi
if [ -n "$WORKER_PIDS" ]; then
    echo "Total worker threads: $(echo $WORKER_PIDS | wc -w)"

    echo "Stopping worker threads with PIDs: $WORKER_PIDS"
    
    for pid in $WORKER_PIDS; do
        echo "Stopping worker thread with PID: $pid"
        pkill -P $pid
    done
fi

  # Kill the main server process
  kill $SERVER_PID
  if [ $? -eq 0 ]; then
    echo "Server stopped successfully."
  else
    echo "Failed to stop the server."
  fi
}

# Function to stop the TTS server
stop_tts_server() {
  echo "Stopping TTS server..."
  
    # Find and kill process running on port 5002
    if lsof -i :5002 >/dev/null; then
      echo "Process running on port 5002 found. Killing it..."
      lsof -i :5002 | awk 'NR!=1 {print $2}' | xargs kill
      echo "Process killed successfully."
    else
      echo "No process running on port 5002."
    fi
  
}

# Start the TTS server
start_tts_server() {
  echo "Starting TTS server..."

  # Check if process is already running on port 5002
  if lsof -i :5002 >/dev/null; then
    echo "Process is already running on port 5002. Skipping TTS server start."
  else
    tts-server --model_name "tts_models/en/jenny/jenny" --use_cuda true &
    T2S_PID=$!
    echo "TTS server started with PID $T2S_PID."
  fi

}
  
# Function to restart the server
restart_server() {
  stop_server
  start_server
  stop_tts_server
  start_tts_server
}

# Start the server initially
start_server
start_tts_server

# Provide a terminal interface to interact with the server
while true; do
  read -p "Enter command: " cmd
  if [ "$cmd" == "restart" ]; then
    restart_server
  elif [ "$cmd" == "exit" ]; then
    stop_server
    break
  else
    echo "Unknown command: $cmd"
  fi
done