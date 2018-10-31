/*
    wsmessaging.js
    This is the main JavaScript file in which the initialization of the
    connection between our back- and front-end services is made, and all of the
    methods responsible for processing the WebSocket messages between them are
    handled.

    @author   Wholesale Banking Advanced Analytics
    @updated  01.11.2016
 */


// A list of all of the currently "active" RFQs appearing in the queuePane :
var websocket;


// Create and initialize an EventListener to handle all WebSocket messages :
window.addEventListener("load", init);


// init Function Definition :
// This is the main initialization function for our front-end web-service. It's
// called immediately when a window for the web-service is openned, openning a
// connection to our WebSocket service and polling the database for a list of
// all of the existing RFQs currently "on-the-wire".
function init() {
   openWebSocket();
   retrieveQueue();
}


// openWebSocket Function Definition :
// ...
function openWebSocket() {

  var wsuri = "wss://" + window.location.hostname + "/ws?client_id=" + Date.now();

  websocket = new WebSocket(wsuri);

  websocket.onopen = function(evt) { onOpen(evt) };
  websocket.onclose = function(evt) { onClose(evt) };
  websocket.onmessage = function(evt) { onMessage(evt) };
  websocket.onerror = function(evt) { onError(evt) };

}


// updateConnectionStatus Function Definition :
// This function updates the connection status lights when "connect(ing/ed)"
// or "disconnect(ing/ed)".
function updateConnectionStatus(statusValue) {

  // If that message concerns our front-to-back-end connections update the :
  if (statusValue=="Connected") {
    var statusColor = "#16db65";
    console.log("Connected to WebSocket(s).")
  }
  else if (statusValue=="Disconnected") {
    var statusColor = "#03223d";
    console.log("Disconnected from WebSocket(s).");
  }

  // Update the connectivity status light whenever a new message arrives :
  d3.select("#connectionStatusIndicator")
    .transition().duration(500)
    .style("fill", statusColor);

}


// onOpen Event Function Definition :
// When the page is openned, update the connection status with the verb
// "connected".
function onOpen(evt) {
  updateConnectionStatus("Connected");
}

// onClose Event Function Definition :
// When the page is openned, update the connection status with the verb
// "disconnected".
function onClose(evt) {
  updateConnectionStatus("Disconnected");
}

// onError Event Function Definition :
// Whenever a connection error occurs, update the connection status with the
// verb "disconnected".
function onError(evt) {
  updateConnectionStatus("Disconnected");
}


// onMessage Event Function Definition :
// When a new event message is received we parse the raw JSON and then call the
// "processMessage" method to handle what happens with the message. This later
// function is resposible for determining whether or not update the front-end's
// own internal representation of the data, as well as the visualization
// components on-screen.
function onMessage(evt) {
  var msg = JSON.parse(evt.data);
  playHand(msg);
}


// genWebSocketMessage Function Definition :
// Generate a new WebSocket message. This function requires at least three
// parameters, "frontend_status", "id", and "msg_content", and can additionally
// do nothing else as of yet...
function genWebSocketMessage(frontend_status, id, msg_content) {
  var new_msg = {};

  new_msg["frontend_status"] = frontend_status;
  new_msg["id"] = id;
  new_msg["msg_content"] = msg_content;
  new_msg["timestamp"] = Math.round(Date.now()/1000.0);

  // TODO: Pricing has to occur here, dynamically reading the added field(s)...
  // if (...condition...) {
  //   new_msg["submit_price"] = submit_price;
  // }

  websocket.send(JSON.stringify(new_msg));

}


// remove_onWireList Function Definition :
// Remove an existing RFQ object from the "onWireList" dictionary.
function add_onWireList(rfq_id) {
  onWireList[rfq_id] = new RFQ(rfq_id);
}

// remove_onWireList Function Definition :
// Remove an existing RFQ object from the "onWireList" dictionary.
function remove_onWireList(rfq_id) {
  delete onWireList[rfq_id];
}


// The functions below allow an existing RFQ in the "onWireList" to be updated.
// Updates can consist of three components: the RFQ data, the historic set of
// prior RFQs of the same product, and the set of analytics data for that RFQ.
// Depending on the nature of the update, the relevant function(s) are called.

// updateRFQ Function Definition :
function updateRFQ(msg) {

      if (!(msg.id in onWireList)) {
        add_onWireList(msg.id);
        console.log("Added " + ((msg.msg_content==="rfq_new")? ("new"):("update to")) + " RFQ with ID " + onWireList[msg.id].rfq_id + " to 'onWireList'.");
      }

      for (var key in msg) {
        // The "history" and "analytics" elements are parsed separately, and the
        // RFQ's "ID" field has already been parsed as "rfq_id".
        if ((key != "history") && (key != "analytics") && (key != "id")) {
          onWireList[msg.id][key] = msg[key];
        }
        else if ((key === "history") && (msg[key].length > 0)) {
          updateRFQhistory(msg);
        }
        else if ((key === "analytics") && (msg[key].length > 0)) {
          updateRFQanalytics(msg);
        }
      }

}

// updateRFQhistory Function Definition :
function updateRFQhistory(msg) {

  var header = msg.history[0];

  for (var i = 1; i < msg.history.length; i++) {
    var entry = {};
    for (var j = 0; j < header.length; j++) {
      // Don't include the "live_id" field...
      if (header[j] != "live_id") {
        entry[header[j]] = msg.history[i][j];
      }
    }
    onWireList[msg.id].history.push(entry);
  }

}

// updateRFQanalytics Function Definition :
function updateRFQanalytics(msg) {

  var headerIdx = {};

  for (var i = 0; i < msg.analytics[0].length; i++) {
    headerIdx[msg.analytics[0][i]] = i;
  }

  for (var i = 1; i < msg.analytics.length; i++) {
    onWireList[msg.id].analytics[msg.analytics[i][headerIdx.qtpct]] = msg.analytics[i][headerIdx.hit_rate_prediction];
  }

}

// retrieveQueue Function Definition :
// This function polls the API endpoint to retrieve a JSON structure of all of
// the currently live RFQs, those that are presently "on-the-wire". The returned
// structure is parsed with the above functionalities.
function retrieveQueue() {

  d3.json("/all_live_data", function (error, allLiveData) {

    if (error) throw error;

    allLiveData.forEach(function (msg) {
      msg["msg_content"] = "rfq_new";
      processMessage(msg);
    });

  });

}
