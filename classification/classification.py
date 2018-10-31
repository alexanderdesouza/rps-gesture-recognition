"""
python classification.py -type simple
"""

import cv2
import numpy as np
import argparse
import os
import time
import redis

os.environ['KERAS_BACKEND'] = 'tensorflow'

from keras import backend as K
from keras.models import load_model
from keras.applications import VGG16, MobileNet

from utils import *

r = redis.StrictRedis(host='localhost', port=6379, charset='utf-8', decode_responses=True)

LEARN_DIR = "data/learn"


def learn(frame, pred_class, image_dir=LEARN_DIR, shape=(64, 64)):
        "Save image with predicted class so it can be used for training later"

        # save images
        path = '{}/{}/{}.png'.format(image_dir, pred_class, int(time.time()))
        print('Save image {}'.format(path))

        # get hand images
        hand_img = frame[CAP_REGION_Y:CAP_REGION_BOTTOM, CAP_REGION_X:CAP_REGION_RIGHT, :]
        hand_img_resize = resize_from_array(hand_img, shape[0], shape[1])
        cv2.imwrite(path, hand_img_resize)


def classify(model_type):
    """
    Use opencv2 to classify PRS images
    """


    model = load_model(MODEL_DICT[model_type]['model_file'])
    width = MODEL_DICT[model_type]['width']
    height = MODEL_DICT[model_type]['height']

    if model_type == 'vgg':
        HAND_TYPE_STRING_LIST = ['paper', 'rock', 'scissors']
        model_vgg = VGG16(include_top=False, weights='imagenet')
    elif model_type == 'mobilenet':
        #HAND_TYPE_STRING_LIST = ['nothing', 'paper', 'rock', 'scissors']
        HAND_TYPE_STRING_LIST = ['paper', 'rock', 'scissors']
        model_vgg = MobileNet(include_top=False, weights='imagenet', alpha=0.25, input_shape=(width, height, 3))
    else:
        HAND_TYPE_STRING_LIST = ['paper', 'rock', 'scissors']

    # start camera
    cap = cv2.VideoCapture(0)

    while(1):

        # Capture frames from the camera
        _, frame = cap.read()

        # flip frame to align the movement
        frame = cv2.flip(frame, 1)

        # backup the frame to draw capture area
        show_frame = frame

        # draw capture region
        cv2.rectangle(show_frame, CAP_REGION_LEFTTOP, CAP_REGION_RIGHTBOTTOM, CAP_COLOR, 2)

        # get hand images
        hand_img = frame[CAP_REGION_Y:CAP_REGION_BOTTOM, CAP_REGION_X:CAP_REGION_RIGHT, :]

        try:
            hand_img_resize = resize_from_array(hand_img, width, height)
        except:
            cap = cv2.VideoCapture(0)
            continue

        # Add an extra dimension, and scale the image pixel value
        data = np.expand_dims(hand_img_resize, axis=0)
        data = data / 255.0  # scale, very important!


        # make classification
        if model_type == 'vgg' or model_type == 'mobilenet':
            input_data = model_vgg.predict(data, batch_size=1, verbose=0)
        else:
            input_data = data

        classification = model.predict(input_data, batch_size=1, verbose=0)[0]
        if model_type == 'mobilenet':
            #classification[0] *= 0.05  # inhibit nothing
            # classification[0] = 0
            # classification /= classification[1:].sum()
            classification = classification[1:]/np.sum(classification[1:])

        print("Classified as ", classification)
        result_string = HAND_TYPE_STRING_LIST[np.argmax(classification)]

        # save all images, so gather training data
        # learn(frame, result_string[0])

        r.set('foo', str(result_string))
        print("In the database is ", r.get('foo'))

        cv2.putText(show_frame,
                        result_string,
                        (PREDICT_TEXT_REGION_X, PREDICT_TEXT_REGION_Y),
                        cv2.FONT_HERSHEY_SIMPLEX, 5, 255)

        cv2.imshow('Dilation', show_frame)

        # waiting for keyboard input
        k = cv2.waitKey(300) & 0xFF
        if k == 27:  # close the output video by pressing 'ESC'
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Capture image parameters")
    parser.add_argument("-type",
                        dest="model_type",
                        action="store",
                        default="simple",
                        choices=MODEL_DICT.keys(),
                        help='model type')
    arguments = parser.parse_args()

    # classification
    while(1):
        classify(arguments.model_type)
