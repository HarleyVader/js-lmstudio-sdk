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
  
  
  
}

# Start the TTS server
start_tts_server() {
  echo "Starting TTS server..."
  
  tts-server --model_name "tts_models/en/jenny/jenny" --use_cuda true &
  T2S_PID=$!
  echo "TTS server started with PID $T2S_PID."
}

# Function to check if a process is running on a specific port
  check_port() {
    local port=$1
    local result=$(sudo lsof -i :$port | grep -v PID )
    if [ -n "$result" ]; then
      local PID=$(echo $result )
      echo "TTS server is running with PID $PID on port $port."
      
  # Kill the TTS server process
  
    pkill -P $PID
      echo "TTS server stopped successfully."
    else
      echo "Failed to stop the TTS server."
    fi
  }
  

  
# Function to restart the server
restart_server() {
  stop_server
  start_server
  check_port 5002
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