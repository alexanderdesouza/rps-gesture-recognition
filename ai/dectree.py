import numpy as np
import pandas as pd
from numbers import Number
import math

def gini(elements):
    """
    Calculates the total gini impurity of a group of elements
    """
    f = pd.value_counts(elements)/len(elements)
    G = f * (1.0 - f)
    return G.sum()

def split_level(data, target, min_samples_leaf=3):
    """
    Calculates the best column and best level to split data at
    to optimize the gini impurity
    """
    if target is None or data is None:
        raise ValueError("None input")
    target = np.array(target)
    score  = None
    column = None
    value  = None
    for feature in range(len(data)):
        feature_values = np.array(data[feature])
        if len(feature_values) != len(target):
            raise ValueError("Feature data length unequal to target length")
        unique_feature_values = pd.unique(feature_values)
        if len(unique_feature_values) <= 1:
            continue
        if np.all([isinstance(x, Number) for x in unique_feature_values]):
            for cv in unique_feature_values:
                if cv is None:
                    continue
                target_group_1 = target[np.where(feature_values>=cv)[0]]
                target_group_2 = target[np.where(feature_values<cv)[0]]
                if len(target_group_1) < min_samples_leaf or len(target_group_2) < min_samples_leaf:
                    continue
                g = gini(target_group_1) + gini(target_group_2)
                if score is None or g < score:
                    score  = g
                    column = feature
                    value  = cv
        else:
            for cv in unique_feature_values:
                if cv is None:
                    continue
                target_group_1 = target[np.where(feature_values==cv)[0]]
                target_group_2 = target[np.where(feature_values!=cv)[0]]
                if len(target_group_1) < min_samples_leaf or len(target_group_2) < min_samples_leaf:
                    continue
                g = gini(target_group_1) + gini(target_group_2)
                if score is None or g < score:
                    score  = g
                    column = feature
                    value  = cv
    return score, column, value

def split(data, target, feature, value):
    """
    Split data at column i at value
    """
    target = np.array(target)
    if feature is None or value is None:
        return data, target
    feature_values = np.array(data[feature])
    if np.all([isinstance(x, Number) for x in feature_values]):
        idx_1 = np.where(feature_values>=value)[0]
        idx_2 = np.where(feature_values<value)[0]
    else:
        idx_1 = np.where(feature_values==value)[0]
        idx_2 = np.where(feature_values!=value)[0]
    return [np.array(row)[idx_1].tolist() for row in data], [np.array(row)[idx_2].tolist() for row in data], target[idx_1], target[idx_2]

class Dectree(object):

    def __init__(self, max_depth=10, min_samples_split=5, min_samples_leaf=3, min_impurity_split=0.2):
        self.max_depth          = max_depth
        self.min_samples_split  = min_samples_split
        self.min_samples_leaf   = min_samples_leaf
        self.min_impurity_split = min_impurity_split

    def fit(self, data, target):
        if target is None or data is None:
            self.__l = True
            self.__t = None
            return
        target = np.array(target)
        if self.max_depth <= 0 or len(target) < self.min_samples_split:
            self.__l = True
            self.__t = target
            return
        g = gini(target)
        if g < self.min_impurity_split:
            self.__l = True
            self.__t = target
            return
        s, c, v = split_level(data, target, self.min_samples_leaf)
        if s is None:
            self.__l = True
            self.__t = target
            return
        self.__l = False
        self.__c = c
        self.__v = v
        d1, d2, t1, t2 = split(data, target, c, v)
        self.__n1 = Dectree(self.max_depth-1, self.min_samples_split, self.min_samples_leaf, self.min_impurity_split)
        self.__n2 = Dectree(self.max_depth-1, self.min_samples_split, self.min_samples_leaf, self.min_impurity_split)
        self.__n1.fit(d1, t1)
        self.__n2.fit(d2, t2)

    def targets(self, x):
        if self.__l == True:
            return self.__t
        else:
            if x is None or len(x) <= self.__c or x[self.__c] is None:
                return np.append(self.__n1.targets(None), self.__n2.targets(None))
            elif isinstance(x[self.__c], Number) and isinstance(self.__v, Number):
                if x[self.__c] >= self.__v:
                    return self.__n1.targets(x)
                else:
                    return self.__n2.targets(x)
            else:
                if x[self.__c] == self.__v:
                    return self.__n1.targets(x)
                else:
                    return self.__n2.targets(x)

    def predict(self, x):
        t = self.targets(x)
        if t is None or len(t) == 0:
            return None
        else:
            vc = pd.value_counts(t)
            return vc.index.values[0]

    def draw(self, offset=""):
        if self.__l == True:
            print("%sLEAF"%(offset))
            if self.__t is None:
                print("NONE")
            else:
                for k,v in pd.value_counts(self.__t).iteritems():
                    print("%s+ %s - %d"%(offset, str(k), v))
        else:
            print("%sNODE"%(offset))
            print("%s + column %d split on %s"%(offset, self.__c, str(self.__v)))
            self.__n1.draw(offset+"__")
            self.__n2.draw(offset+"__")









def loadGameHistory():
    print("Loading previous game data from historical_games.npz")
    try:
        f = np.load("historical_games.npz")
        player_history     = f['player_history'].tolist()
        outcome_history    = f['outcome_history'].tolist()
        prediction_history = f['prediction_history'].tolist()
        ai_history         = f['ai_history'].tolist()
    except:
        player_history     = []
        outcome_history    = []
        prediction_history = []
        ai_history         = []
    return player_history, outcome_history, prediction_history, ai_history

def saveGameHistory(player_history, outcome_history, prediction_history, ai_history):
    if not checkGameHistoryIntegrity(player_history, outcome_history, prediction_history, ai_history, True):
        print("Game history integrity not guaranteed. Boldly refusing to save the data")
        return
    if len(player_history) == 0:
        print("Empty game history. Nothing to save")
        return
    print("Saving game history to historical_games.npz")
    np.savez_compressed("historical_games.npz", player_history=player_history, outcome_history=outcome_history, prediction_history=prediction_history, ai_history=ai_history)

def checkGameIntegrity(player_game, outcome_game, prediction_game, ai_game):
    if len(player_game) != len(outcome_game):
        return False
    if len(player_game) != len(prediction_game):
        return False
    if len(player_game) != len(ai_game):
        return False
    if np.any([play not in ['rock', 'paper', 'scissors'] for play in player_game]):
        return False
    if np.any([play not in ['rock', 'paper', 'scissors'] for play in prediction_game]):
        return False
    if np.any([play not in ['rock', 'paper', 'scissors'] for play in ai_game]):
        return False
    if np.any([out not in ['win', 'draw', 'loss'] for out in outcome_game]):
        return False
    return True

def checkGameHistoryIntegrity(player_history, outcome_history, prediction_history, ai_history, checkIndividualGames=True):
    if len(player_history) != len(outcome_history):
        return False
    if len(player_history) != len(prediction_history):
        return False
    if len(player_history) != len(ai_history):
        return False
    if checkIndividualGames:
        for pl, ou, pr, ai in zip(player_history, outcome_history, prediction_history, ai_history):
            if not checkGameIntegrity(pl, ou, pr, ai):
                return False
    return True

def buildDectree(player_game, outcome_game, prediction_game, ai_game, nturns):
    if not checkGameIntegrity(player_game, outcome_game, prediction_game, ai_game):
        print("Game integrity not guaranteed. Cannot build AI")
        return None
    if len(player_game) <= nturns - 1:
        return None
    target = player_game[nturns : ]
    data   = []
    for turn in range(nturns):
        data.append(player_game[turn : len(player_game)-nturns+turn])
    for turn in range(nturns):
        data.append(outcome_game[turn : len(player_game)-nturns+turn])
    #for turn in range(nturns):
    #    data.append(prediction_game[turn : len(player_game)-nturns+turn])
    for turn in range(nturns):
        data.append(ai_game[turn : len(player_game)-nturns+turn])
    min_samples_leaf   = len(target)//10
    min_samples_split  = 2 * min_samples_leaf
    min_impurity_split = 0.2
    max_depth          = min(6,len(data)//3)
    tree = Dectree(max_depth, min_samples_split, min_samples_leaf, min_impurity_split)
    tree.fit(data, target)
    return tree

def buildDectrees(player_history, outcome_history, prediction_history, ai_history, nturns):
    if not checkGameHistoryIntegrity(player_history, outcome_history, prediction_history, ai_history, False):
        return []
    return [x for x in [buildDectree(pl,ou,pr,ai,nturns) for pl,ou,pr,ai in zip(player_history, outcome_history, prediction_history, ai_history)] if x is not None]

def buildDatapoint(pl, ou, pr, ai, nturns, i=-1):
    if not checkGameIntegrity(pl, ou, pr, ai):
        print("Game integrity not guaranteed")
        return None
    if len(pl) < nturns:
        return None
    while i < 0:
        i += len(pl)
    while i >= len(pl):
        i -= len(pl)
    i += 1
    datapoint = []
    datapoint += pl[i-nturns : i]
    datapoint += ou[i-nturns : i]
    #datapoint += pr[i-nturns : i]
    datapoint += ai[i-nturns : i]
    return datapoint

def buildDatapoints(pl, ou, pr, ai, nturns):
    if not checkGameIntegrity(pl, ou, pr, ai):
        print("Game integrity not guaranteed")
        return None
    if len(pl) < nturns:
        return None
    targetpoints = pl[nturns:]
    datapoints = []
    for i in range(nturns, len(pl)):
        datapoint  = []
        datapoint += pl[i-nturns : i]
        datapoint += ou[i-nturns : i]
        #datapoint += pr[i-nturns : i]
        datapoint += ai[i-nturns : i]
        datapoints.append(datapoint)
    return datapoints, targetpoints
