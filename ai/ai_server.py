import numpy as np
import dectree
import pandas as pd
import itertools

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

pl_hist, ou_hist, pr_hist, ai_hist = dectree.loadGameHistory()
trees   = []
pl_game = []
ou_game = []
pr_game = []
ai_game = []

@app.route('/newGame', methods=['POST','GET','OPTIONS'])
def newGame():

    global LAST_AI_ACTION, PREDICTED_PLAYER_ACTION
    global pl_hist, ou_hist, pr_hist, ai_hist, trees
    global pl_game, ou_game, pr_game, ai_game, tree

    PREDICTED_PLAYER_ACTION = np.random.choice(['rock', 'paper', 'scissors'])
    LAST_AI_ACTION          = win_from(PREDICTED_PLAYER_ACTION)

    if len(pl_game) >= 20 and dectree.checkGameIntegrity(pl_game,ou_game,pr_game,ai_game):
        pl_hist.append(pl_game)
        ou_hist.append(ou_game)
        pr_hist.append(pr_game)
        ai_hist.append(ai_game)
        dectree.saveGameHistory(pl_hist, ou_hist, pr_hist, ai_hist)
    pl_game = []
    ou_game = []
    pr_game = []
    ai_game = []
    tr_game = None

    return "AI ready"





@app.route('/getAction', methods=['POST','GET','OPTIONS'], defaults={'player': None})
@app.route('/getAction/<string:player>', methods=['POST','GET','OPTIONS'])
def getAction(player):

    global LAST_AI_ACTION, PREDICTED_PLAYER_ACTION
    global pl_hist, ou_hist, pr_hist, ai_hist, trees
    global pl_game, ou_game, pr_game, ai_game

    # Update the game data
    if player is None:
        return LAST_AI_ACTION
    player = player.lower()
    if player not in ['rock', 'paper', 'scissors']:
        print("\nCheater. %s not one out of rock/paper/scissors\n"%(str(player)))
        return LAST_AI_ACTION
    pl_game.append(player)
    ou_game.append(outcome(player, LAST_AI_ACTION))
    pr_game.append(PREDICTED_PLAYER_ACTION)
    ai_game.append(LAST_AI_ACTION)

    # Get prediction from historical games
    ndatapoints = len(pl_game)

    if ndatapoints <= 1:
        nturns = 1
        trees = dectree.buildDectrees(pl_hist, ou_hist, pr_hist, ai_hist, nturns)
        if len(trees) > 0:
            point = dectree.buildDatapoint(pl_game, ou_game, pr_game, ai_game, nturns, -1)
            p = [t.predict(point) for t in trees]
            PREDICTED_PLAYER_ACTION = pd.value_counts(p).index[0]
            print("Only %d other trees based"%(len(trees)), pd.value_counts(p))
        else:
            PREDICTED_PLAYER_ACTION = np.random.choice(['rock', 'paper', 'scissors'])
            print("Random", PREDICTED_PLAYER_ACTION)
    else:
        nturns  = 1 if ndatapoints <= 5 else 2# if ndatapoints <= 10 else 3
        point   = dectree.buildDatapoint(pl_game, ou_game, pr_game, ai_game, nturns,-1)
        tree    = dectree.buildDectree(pl_game, ou_game, pr_game, ai_game, nturns)
        targets = tree.targets(point)
        weights = np.ones(len(targets))
        print("this tree\n", pd.value_counts(targets))
        trees  = dectree.buildDectrees(pl_hist, ou_hist, pr_hist, ai_hist, nturns)
        if len(trees) > 0:
            datapoints, datatargets  = dectree.buildDatapoints(pl_game, ou_game, pr_game, ai_game, nturns)
            w = [np.sum([t.predict(p)==r for p,r in zip(datapoints, datatargets)], dtype=float)/len(targets) for t in trees]
            t = [t.predict(point) for t in trees]
            f = pd.DataFrame(list(zip(t, w)), columns=['rps','w'])
            g = f.groupby('rps', as_index=False).sum()
            print("%d other trees based\n"%(len(trees)), g)
            weights = list(itertools.chain( *(weights, w) ))
            targets = list(itertools.chain( *(targets, t) ))
        f = pd.DataFrame(list(zip(targets,weights)), columns=['rps','w'])
        g = f.groupby('rps', as_index=False).sum()
        PREDICTED_PLAYER_ACTION = g.ix[g['w'].idxmax()]['rps']
        print("%d other trees and this based\n"%(len(trees)), g)


    LAST_AI_ACTION = win_from(PREDICTED_PLAYER_ACTION)
    return LAST_AI_ACTION

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
