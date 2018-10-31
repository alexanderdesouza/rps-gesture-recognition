import numpy as np
#import dectree
import pandas as pd

from flask import Flask
from flask_cors import CORS
app = Flask(__name__)
CORS(app)



def outcome(pl1, pl2):
    return "draw" if pl1==pl2 else "win" if (pl1=="rock" and pl2=="scissors") or (pl1=="paper" and pl2=="rock") or (pl1=="scissors" and pl2=="paper") else "loss"

def win_from(action):
    return "rock" if action=="scissors" else "paper" if action=="rock" else "scissors"

def win_with(result, action):
    return "rock" if (result=="win" and action=="scissors") or (result=="draw" and action=="rock") or (result=="loss" and action=="paper") else "paper" if (result=="win" and action=="rock") or (result=="draw" and action=="paper") or (result=="loss" and action=="scissors") else "scissors"





# Globals
PREDICTED_PLAYER_ACTION = np.random.choice(['rock', 'paper', 'scissors'])
LAST_AI_ACTION          = win_from(PREDICTED_PLAYER_ACTION)
GAME_HISTORY            = []


@app.route('/newGame', methods=['POST','GET','OPTIONS'])
#@crossdomain(origin="*")
def newGame():

    global LAST_AI_ACTION, PREDICTED_PLAYER_ACTION, GAME_HISTORY

    GAME_HISTORY            = []
    PREDICTED_PLAYER_ACTION = np.random.choice(['rock', 'paper', 'scissors'])
    LAST_AI_ACTION          = win_from(PREDICTED_PLAYER_ACTION)

    return "AI ready"





@app.route('/getAction', methods=['POST','GET','OPTIONS'], defaults={'player': None})
@app.route('/getAction/<string:player>', methods=['POST','GET','OPTIONS'])
#@crossdomain(origin="*")
def getAction(player):
    print("player played %s"%player)
    global LAST_AI_ACTION, PREDICTED_PLAYER_ACTION, GAME_HISTORY

    if player is None:
        return LAST_AI_ACTION
    player = player.lower()
    if player not in ['rock', 'paper', 'scissors']:
        print("Cheater. %s not in rock/paper/scissors"%(player))
        return LAST_AI_ACTION

    GAME_HISTORY.append({"ai":LAST_AI_ACTION, "player":player})
    if len(GAME_HISTORY) <= 1:
        PREDICTED_PLAYER_ACTION = np.random.choice(['rock', 'paper', 'scissors'])
    else:
        player_last_outcome = outcome(player, LAST_AI_ACTION)
        found_match = False
        for i in range(len(GAME_HISTORY)-1, 0, -1):
            player_outcome = outcome(GAME_HISTORY[i-1]['player'],GAME_HISTORY[i-1]['ai'])
            if player_outcome == player_last_outcome:
                player_wtl = outcome(GAME_HISTORY[i]['player'],GAME_HISTORY[i-1]['ai'])
                PREDICTED_PLAYER_ACTION  = win_with(player_wtl,GAME_HISTORY[-1]['ai'])
                found_match = True
                break
        if found_match == False:
            player_wtl     = outcome(GAME_HISTORY[-1]['player'],GAME_HISTORY[-2]['ai'])
            PREDICTED_PLAYER_ACTION  = win_with(player_wtl, GAME_HISTORY[-1]['ai'])
    LAST_AI_ACTION = win_from(PREDICTED_PLAYER_ACTION)
    print("AI returns %s"%LAST_AI_ACTION)
    return LAST_AI_ACTION


if __name__ == "__main__":
    app.run(port=5000, debug=False)
