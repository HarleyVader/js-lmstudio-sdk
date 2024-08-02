echo "[Unit]
Description=bimBot service
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=2

[Service]
Type=simple
User=melkanea
WorkingDirectory=/home/melkanea/bimbot
ExecStart=/bin/bash NadekoRun.sh
Restart=on-failure
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=NadekoBot

[Install]
WantedBy=multi-user.target" | sudo tee /etc/systemd/system/bimbot.service


{
    echo '#!/bin/bash'
    echo ""
    echo "echo \"Running bimbot in the background with auto restart\"
    yt-dlp -U
    
    # If you want Nadeko to be compiled prior to every startup, uncomment the lines
    # below. Note  that it's not necessary unless you are personally modifying the
    # source code.
    #echo \"Compiling bimbot...\"
    #cd \"$PWD\"/bimbot
    #dotnet build src/NadekoBot/NadekoBot.csproj -c Release -o output/
    
    echo \"Starting bimbot...\"
    
    while true; do
        if [[ -d $PWD/nadekobot/output ]]; then
            cd $PWD/nadekobot/output || {
                echo \"Failed to change working directory to $PWD/nadekobot/output\" >&2
                echo \"Ensure that the working directory inside of '/etc/systemd/system/bimbot.service' is correct\"
                echo \"Exiting...\"
                exit 1
            }
        else
            echo \"$PWD/nadekobot/output doesn't exist\"
            exit 1
        fi
    
        dotnet NadekoBot.dll || {
            echo \"An error occurred when trying to start bimbot\"
            echo \"Exiting...\"
            exit 1
        }
    
        echo \"Waiting for 5 seconds...\"
        sleep 5
        yt-dlp -U
        echo \"Restarting bimbot...\"
    done
    
    echo \"Stopping bimbot...\""
    } > NadekoRun.sh