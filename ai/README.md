To start the ai_server.py:
> export FLASK_APP=ai_server_0.py
> flask run --host=0.0.0.0
It will tell you the local address where it runs. If not type
>ipconfig getifaddr en0
to get the local ip address of your comp

The ai_server exposes two end points
.../newGame to explicitly start a new game
.../getAction/[player] where player is one of rock/paper/scissors. Tells the AI the player's last action (of the previous round, not the current round) and get's the AI's action for the current round
.../getAction implicitly starts a new game (cuz no last action of the player) and gets the AI's first action
