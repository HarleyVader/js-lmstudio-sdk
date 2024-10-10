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
echo -e $magenta "\ \  \ \_\  \  \ \  __/|\  \  \    \ \  \/  /|\ \  \|\  \ \ \ \ \  \ \   __/|\ \  \|\  \   " $coloroff
echo -e $magenta " \ \  \|__|  \  \ \ \__|/_\ \  \    \ \   ___  \ \   __  \ \ \ \ \  \ \  \_|/_\ \   __  \  " $coloroff
echo -e $magenta "  \ \  \    \ \  \ \ \__|\ \ \  \____\ \ \ \ \  \ \  \ \  \ \ \ \ \  \ \  \_|\ \ \  \ \  \ " $coloroff
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
  if [[ "$OSTYPE" == "msys" ]]; then
    netstat -ano | findstr :5002 | awk '{print $5}' | xargs taskkill /PID
  else
    lsof -i :5002 | awk 'NR>1 {print $2}' | xargs kill
  fi
  echo "Server stopped."
}

# Function to stop the TTS server
stop_tts_server() {
  echo "Stopping TTS server..."
  
  # Find and kill process running on port 5002
  if lsof -i :5002 >/dev/null; then
    echo "Process running on port 5002 found. Killing it..."
    lsof -i :5002 | awk 'NR!=1 {print $2}' | xargs kill
    if [ $? -eq 0 ]; then
      echo "Process killed successfully."
    else
      echo "Failed to kill the process."
    fi
  else
    echo "No process running on port 5002."
  fi
}

# Function to start the TTS server
# Function to start the TTS server
start_tts_server() {
  if [[ "$OSTYPE" == "msys" ]]; then
    if netstat -ano | findstr :5002 > /dev/null; then
      echo "Process is already running on port 5002. Skipping TTS server start."
    else
      echo "Starting the TTS server on port 5002..."
      
      docker run --rm -d -p 5002:5002 --gpus all --entrypoint /bin/bash ghcr.io/coqui-ai/tts &
      SERVER_PID=$!
    fi
  else
    if ss -tuln | grep :5002 > /dev/null; then
      echo "Process is already running on port 5002. Skipping TTS server start."
    else
      echo "Starting the TTS server on port 5002..."

      docker run --rm -d -p 5002:5002 --gpus all --entrypoint /bin/bash ghcr.io/coqui-ai/tts &
      SERVER_PID=$!
    fi
  fi
}
  
# Function to restart the server
restart_server() {
  stop_server
  stop_tts_server
  start_tts_server
  start_server
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
  elif [ "$cmd" == "stop" ]; then
    stop_server
  elif [ "$cmd" == "start" ]; then
    start_server
  elif [ "$cmd" == "stop-tts" ]; then
    stop_tts_server
  elif [ "$cmd" == "start-tts" ]; then
    start_tts_server
  elif [ "$cmd" == "update" ]; then
    echo update
  elif [ "$cmd" == "normal" ]; then
    echo normal
  else
    echo "Unknown command: $cmd"
  fi
done