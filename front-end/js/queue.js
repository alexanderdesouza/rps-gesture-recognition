/*
    queue.js
    This is the JavaScript codebase responsible for the maintenance of the RFQ
    buttons that appear in the queuePane element of the front-end client.

    @author   Wholesale Banking Advanced Analytics
    @updated  24.10.2016
 */


// The current RFQ ID is that selected by the current client :
var client_rfq_id;

// Prototypes to destroy the RFQ buttons on timeout :
Element.prototype.remove = function() {
  this.parentElement.removeChild(this);
}

NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
  for(var i = this.length-1; i >= 0; i--) {
    if(this[i] && this[i].parentElement) {
      this[i].parentElement.removeChild(this[i]);
    }
  }
}


// createRFQbutton Function Definition :
// This function is called whenever a new RFQ messsage event arrives via
// WebSocket; the API end-point is accessed for this.
function createRFQbutton(rfq_id) {

  var buttonWidth = 200;
  var buttonHeight = 66;

  var svgContainer = d3.select("#queue").append("center").append("svg").attr("width",buttonWidth).attr("height",buttonHeight).attr("id","button_container_"+rfq_id);

  var rectangle = svgContainer.append("rect")
      .attr("id", "button_"+rfq_id)
      .attr("x", 3)
      .attr("y", 3)
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("width", buttonWidth-6)
      .attr("height", buttonHeight-6)
      .style("stroke-width", "2px")
      .style("stroke", "#16db65")
      .style("fill", "#02182b");

  var buttonLabelTop = svgContainer.append("text")
                                   .attr("x", buttonWidth/2)
                                   .attr("y", buttonHeight/2 - 10)
                                   .attr("text-anchor", "middle")
                                   .attr("fill", "#ffffff");

  buttonLabelTop.append("tspan")
                .style("font-size", "18px")
                .text(((onWireList[rfq_id].side=="Buy")?("BUY"):("SELL")));

  var buttonLabelMiddle = svgContainer.append("text")
                                      .attr("x", buttonWidth/2)
                                      .attr("y", buttonHeight/2 + 6)
                                      .attr("text-anchor", "middle")
                                      .attr("fill", "#ffffff");

  buttonLabelMiddle.append("tspan")
                   .style("font-size", "16px")
                   .text(onWireList[rfq_id].description);

  var buttonLabelBottom = svgContainer.append("text")
                                      .attr("x", buttonWidth/2)
                                      .attr("y", buttonHeight/2 + 22)
                                      .attr("text-anchor", "middle")
                                      .attr("fill", "#ffffff");

  const volume = fmtbigfigs(100.0*(onWireList[rfq_id].rfq_qty));

  buttonLabelBottom.append("tspan")
                   .style("font-size", "16px")
                   .text(volume + "k");

  var trans = svgContainer.append("rect")
                          .attr("id", "button_overlay_"+rfq_id)
                          .attr("x", 3)
                          .attr("y", 3)
                          .attr("z", 100)
                          .attr("rx", 3)
                          .attr("ry", 3)
                          .attr("width", buttonWidth-6)
                          .attr("height", buttonHeight-6)
                          .style("fill", "#ffffff")
                          .style("opacity", 0.0)
                          .on("mouseover", onMouseOver(rfq_id))
                          .on("mouseout", onMouseOut(rfq_id))
                          .on("click", function() { onRFQclick(rfq_id); });

  console.log("Created RFQ button for RFQ ID "+rfq_id+": "+((onWireList[rfq_id].side=="Buy") ? ("Buy ") : ("Sell "))+onWireList[rfq_id].rfq_qty+"k of "+onWireList[rfq_id].description+".");

}

// onMouseOver and onMouseOut Function Definition :
// Apply and remove highlights when a user mouses over or off of an RFQ button.
function onMouseOver(rfq_id) {
  return function(){
    d3.select("#button_"+rfq_id).style("stroke-width", 4);
  }
}

function onMouseOut(rfq_id) {
  return function(){
    d3.select("#button_"+rfq_id).style("stroke-width", 2);
  }
}


// onRFQclick Function Definition :
// This function processes button clicks of RFQ buttons in the queuePane of the
// front-end web-service. The selected button's color is updated.
function onRFQclick(rfq_id) {

  // If the 'client_rfq_id' is set (i.e., that RFQ is being shown in the
  // visualization at right, perhaps on another client screen) and the
  // 'client_rfq_id' is not equal to this selected RFQs ID, then the selected
  // RFQ is in use, send a busy-signal via WebSocket :
  if (client_rfq_id && client_rfq_id != rfq_id) {
    genWebSocketMessage("free", onWireList[rfq_id].instrument_id, "client_update")
    updateRFQbutton({ id: client_rfq_id, msg_content: "client_update", frontend_status: "free" });
  }

  // Flag the selected RFQ with the status 'in_use' :
  genWebSocketMessage("in_use", onWireList[rfq_id].instrument_id, "client_update");
  updateRFQbutton({ id: rfq_id, msg_content: "client_update", frontend_status: "in_use" });

  // Open the relevant RFQ and set the current ID being shown to that of the
  // selected RFQ :
  removeVisualization();
  drawVisualization(onWireList[rfq_id]);
}


// updateRFQbutton Function Definition :
// This function updates the appearance of the button elements in the queuePane
// whenever (or, as needed) new WebSocket messages arrive (i.e., if the message
// has "msg_content" = "rfq_new"); it also handles those messages for when a
// user selects between buttons, releasing the previous RFQ to the other
// clients on the network.
function updateRFQbutton(msg) {

  // Handy reference to the incomming message ID :
  var rfq_id = msg.id;

  // Add a new RFQ button to the page if the msg contains info for a new RFQ :
  if(d3.select("#button_container_"+rfq_id).empty() && (msg.msg_content==="rfq_new")) {
    createRFQbutton(rfq_id);
    d3.select("#button_"+rfq_id).style("fill", "#02182b");
    d3.select("#button_overlay_"+rfq_id).on("click", function () {onRFQclick(rfq_id)});
  }

  // Adjust the color of the RFQ button as necessary :
  if(msg.msg_content === "client_update") {
      if(msg.frontend_status === "free") {
        d3.select("#button_"+rfq_id).style("fill", "#02182b");
        d3.select("#button_overlay_"+rfq_id).on("click", function () {onRFQclick(rfq_id)});
      }
      else if(msg.frontend_status === "in_use") {
        client_rfq_id = rfq_id;
        d3.select("#button_"+rfq_id).style("fill", ((rfq_id===client_rfq_id)? ("#16db65"):("#ff510c")));
        d3.select("#button_overlay_"+rfq_id).on("click", null);
      }
      else if(msg.frontend_status === "submit_price") {
          d3.select("#button_"+rfq_id).style("fill", "#a8a8a8");
          d3.select("#button_overlay_"+rfq_id).on("click", null);
          if (rfq_id === client_rfq_id) {
              client_rfq_id = null;
          }
      }
   }
   else if(["rfq_new", "rfq_update"].includes(msg.msg_content)) {
        if (["CustRejected", "Done"].includes(msg.status_string)) {
            d3.select("#button_container_"+rfq_id).remove();
            if (rfq_id === client_rfq_id) {
              client_rfq_id = null;
            }
        }
   }
   else {
     console.log(msg.msg_content + " status message received for unknown RFQ " + msg.id + " not in 'onWireList'.");
   }

}
