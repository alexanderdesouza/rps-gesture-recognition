# Rock-Paper-Scissors

This repo contains all the components for the Rock-paper-scissors.

## Dependencies

```
pip install -r requirements.txt
brew install redis
```

## Run

1. Start Redis:

        redis-server

2. Start gesture-classification

    Either using a pre-trained color-dependent model

        cd classification
        python classification.py -type vgg

    or using a color-independent model using open-cv preprocessing

        cd classification-color-independent
        python recognize.py

3. Start flask-server

        cd classification
        python flask_server.py

4. Start AI server

        cd ai
        python ai_server_0.py

5. Start UI

        cd front-end
        python -m http.server

6. Open `localhost:8000` in a browser (Chrome).
