/*
    visualization.js
    This is the main javascript codebase that imports the relevant data from the
    the API endpoints and then generates the core visualization (using D3.js).
    Emphasis here is on responsive design, calculating client and frame
    dimensions, and using those as the basis for building the visualization.

    @author   Wholesale Banking Advanced Analytics
    @updated  04.11.2016
 */


// Format specifications for the number of significant figures to be presented;
// 'fmtsigfigs' limits numbers to two visible decimal places (for prices);
// 'fmtbigfigs' is used for large numbers, truncating decimal places.
const formatPrice = d3.format(",.3f");
var fmtsigfigs = d3.format(",.2f");
var fmtbigfigs = d3.format(",.0f");


// calcHitRate Function Definition :
// This function takes in parameters 'price' (in terms of spread) and the
// 'analytics' array to "look up" the corresponding pre-calculated Hit Rate
// (see the code base in the 'app_analytics' backend system). Linear
// interpolation is used to estimate the Hit Rate between the known fixed points
// returned by the 'app_analytics' backend system, and the result formatted to
// two significant digits.
function calcHitRate(price, analytics) {

    var result;

    var x0 = Math.floor(price);
    var x1 = Math.ceil(price);

    if (x0 == x1) {
      result = analytics[x0];
    }
    else {

      var y0 = analytics[x0];
      var y1 = analytics[x1];

      result = y0 + (price-x0) * ((y1-y0)/(x1-x0));

    }

    return fmtsigfigs(result);

}


// prepareData Function Definition :
// This function targets key fields of an RFQ in the 'onWireList' and applies
// various manipulations (from forcing types and applying scale factors) to
// ensure that the data in state can be visualized by all of the other routines
// and methods in this script.
// TODO: There is some overlap between how the "live" data (for the current RFQ
//       on-the-wire) and its historic RFQ data are handled. Could these be
//       consolidated; the relevant fields appear indented below.
function prepareData(updata) {

  // Calculate the median Volume from all data elements :
  var medianVolume = d3.median(updata.history, function (d) { return d.rfq_qty; });

  // sizeBubble Function Definition :
  // This function is called whenever the volume of an RFQ is to be visualized
  // in the main chart area. Volumes are scaled to the median volume present
  // in the data set, with the median being represented with a bubble 10px in
  // radius; the minimum and maximum allowed radius is 3 and 50, respectively.
  function sizeBubble(price,volume) {
    var radius = Math.min(Math.max(3.0, 10.0*volume/medianVolume), 50.0);
    if (isNaN(price) || (price>+190.0) || (price<-90.0)) {
      radius = 0.0;
    }
    return radius;
  }

  // data.askprice = +fmtsigfigs(parseFloat(data.askprice)); // for demo purposes, these are just random numbers (as below)
  // data.bidprice = +fmtsigfigs(parseFloat(data.bidprice));
  updata.askprice = +fmtsigfigs(Math.random()*5 + 100);
  updata.bidprice = +fmtsigfigs(0 - Math.random()*5);

    updata.crntqtpct = +fmtsigfigs(100.0*parseFloat(updata.crntqtpct));
  updata["position"] = (typeof(updata.position)!="undefined")? (parseFloat(updata.position)+"k"):("Data Unavailable");
    updata.qtpct = +fmtsigfigs(100.0*parseFloat(updata.qtpct));
    updata.rfq_qty = +fmtsigfigs(100.0*parseFloat(updata.rfq_qty));
    updata["rfq_qty_size"] = +sizeBubble(100.0,updata.rfq_qty/100.0);
    if (updata.side == "Buy") {
      updata.status = "Won Buy";
    }
    else if (updata.side == "Sell") {
      updata.status = "Won Sell";
    }

  for (var i = 0; i < updata.history.length; i++) {
    var d = updata.history[i];
    d["nDaysAgo"] = Math.round((updata.timestamp-d.timestamp)/(24*60*60*1000));
      d.qtpct = +fmtsigfigs(100.0*parseFloat(d.qtpct));
      d.rfq_qty = +fmtsigfigs(100.0*parseFloat(d.rfq_qty));
      d["rfq_qty_size"] = +sizeBubble(d.qtpct,d.rfq_qty/100.0);
      if (d.side == "Buy") {
        d.status = (d.status==="Done")? ("Won Buy"):("Lost Buy");
      }
      else if (d.side == "Sell") {
        d.status = (d.status=="Done")? ("Won Sell"):("Lost Sell");
      }
    updata.history[i] = d;
  }

  for (var key in updata.analytics) {
    updata.analytics[key] = 100.0*updata.analytics[key];
  }

  return updata;

}


// euroDate Function Definition :
// This is a helper function referenced by the prepareData function. It accepts
// a UNIX timestamp, a long integer representing the number of milliseconds
// since 1st January, 1970, and converts in into a European-standard
// representation of the date (dd.mm.yyyy).
function euroDate(dateInSeconds) {
  const dateInMs = dateInSeconds*1000;
  var dateObject = new Date(dateInMs);
  var day = (dateObject.getDate()<10)? ("0"+dateObject.getDate()):(dateObject.getDate());
  var month = ((dateObject.getMonth()+1)<10) ? ("0"+(dateObject.getMonth()+1)):((dateObject.getMonth()+1));
  var year = dateObject.getFullYear();
  return day + "." + month + "." + year;
}


// removeVisualization Function Definition :
// Whenever an RFQ is successfully priced (but not necessarily confirmed), or
// simply when the user selects a new RFQ to view in the front-end, this method
// is called to destroy the remove the then current visualization elements
// on-screen.
function removeVisualization() {

  d3.selectAll("#vizTitle *").remove();
  d3.selectAll("#vizD3 *").remove();
  thethingy = null;

  // Add here handling for the appropriate message (see queue.js > updateRFQbutton)...

}


// Visualization Class Definition :
// The Visualization Class allows for the construction of a visualization
// object. A Visualization object must be associated to an HTML div element
// (referenced as 'element' upon construction) from which the dimensions of the
// visualization are calculated; this framework is fixed at instantiation, but
// the class itself provides configurability with respect to how data associated
// to the Visualization Class object is displayed.
class Visualization {

  // Visualization Class Constructor Function Definition :
  // The constructor requires a target div element ID into which the
  // visualization will be placed. It then instantiates variables to which the
  // screen dimensions are associated, from which all other elements of the
  // visualization will be oriented.
  // @param   element   An HTML div element ID; see index.html.
  constructor(element) {

    this.resolution = screen.height / screen.width;
    this.frameWidth = document.getElementById(element).clientWidth;
    this.frameHeight = (this.resolution * this.frameWidth) - document.getElementById("footerPane").clientHeight;

    this.margin = {
                    top: 0.05 * this.frameHeight,
                    right: 0.05 * this.frameWidth,
                    bottom: 0.08 * this.frameHeight,
                    left: 0.08 * this.frameWidth
                  };

    this.canvasWidth = this.frameWidth - this.margin.left - this.margin.right;
    this.canvasHeight = this.frameHeight - this.margin.top - this.margin.bottom;

    this.color = d3.scale.ordinal()
                         .domain(["Lost Buy", "Won Buy", "Won Sell", "Lost Sell"])
                         .range(["#d7263d", "#16db65", "#16db65", "#d7263d"]);

    this.svgCanvas = d3.select("#vizD3")
                       .append("svg")
                       .attr("width", this.canvasWidth + this.margin.left + this.margin.right)
                       .attr("height", this.canvasHeight + this.margin.top + this.margin.bottom);

    this.svg = this.svgCanvas.append("g")
                             .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.x = d3.scale.ordinal().range([this.canvasWidth/6, 2*this.canvasWidth/6, 4*this.canvasWidth/6, 5*this.canvasWidth/6]);
    this.y = d3.scale.linear().range([this.canvasHeight, 0]);

    this.xAxis = d3.svg.axis()
                       .scale(this.x)
                       .orient("bottom")
                       .tickFormat(function(d) {
                         var axislabelmap = { "Lost Buy"  : "lost",
                                              "Won Buy"   : "won",
                                              "Won Sell"  : "won",
                                              "Lost Sell" : "lost"
                                            };
                         return axislabelmap[d];
                       });

     this.yAxis = d3.svg.axis()
                        .scale(this.y)
                        .orient("left");

  }

  // Visualization.associate_data() Function Definition :
  // Class function that allows an RFQ to be associated with the visualization.
  // The data should be passed with associated 'history' and 'analytics' fields,
  // and the entire RFQ will be processed to ensure the data is in the formats
  // required by all of the other Visualization Class functions.
  // @param   aRFQ
  // @        prepdata4vizualization
  associate_data(aRFQ) {

    this.data = JSON.parse(JSON.stringify(aRFQ));
    this.data = prepareData(this.data);

    this.svgCanvas.on("dblclick", function() {
                                              console.log("Successfully priced!");
                                              removeVisualization();
                                              // var submitPrice = "x";
                                              // var confirm = window.confirm( "Are you sure: "+d.side+"ing "+d.rfq_qty+"k of "+d.description.replace(/[^a-zA-Z]/g,"")+" @ "+submitPrice+"?" );
                                              // if (confirm) {
                                              //   genWebSocketMessage("submit_price", d.rfq_id, "client_update", submitPrice);
                                              //   console.log("Client submitted price "+submitPrice+" for RFQ ID "+d.rfq_id+".");
                                              //   removeVisualization();
                                              // }
                                             });

  }

  // ...
  update_all() {
    this.update_title();
    this.update_axes();
    this.update_history();

    if (options["yAxis"]=="Price") {
      this.rescale("Price");
    }

    if (options["ING"]=="checked") {
      this.update_reference("ING");
    }
    if (options["BBG"]=="checked") {
      this.update_reference("BBG");
    }

  }

  // Visualization.update_title() Function Definition :
  // Construct a table at the top of the frame and place within a description
  // of the on the wire RFQ (at left), and the current position (at right) :
  update_title() {
    var title = d3.select("#vizTitle")
                  .append("table")
                  .attr("width", "100%")
                  .append("tr");
    title.append("td")
         .attr("width", "50%")
         .attr("align", "left")
         .append("text")
         .html("<span style='font-size:16px'>" + this.data.cust_firm + "</span><br/>" +
               "<span style='font-size:20px'>" + ((this.data.side==="Buy")? ("BUY "):("SELL ")) + this.data.description + "</span><br/>" +
               "<span style='font-size:20px'>" + this.data.rfq_qty + "k volume</span><br/>" +
               "(<span style='font-size:14px;font-style:italic;'>" + this.data.instrument_id + "</span>)"
         );
    title.append("td")
         .attr("width", "50%")
         .attr("align", "right")
         .append("text")
         .style("font-style", "italic")
         .html("<span style='font-size:20px;'>Position " + this.data.position + "</span>");
  }

  // ...
  // ...
  // ...
  update_axes() {

    // Specify the x- and y-axis domains :
    // (Note the fixed ordinal scale along the x-axis.)
    this.x.domain(["Lost Buy", "Won Buy", "Won Sell", "Lost Sell"]);
    this.y.domain([-100.0, +200.0]);

    // Draw the x-Axis and append categorical text distinguishing Buy and Sell :
    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0,"+this.canvasHeight+")")
        .call(this.xAxis);

    this.svg.append("g")
        .attr("transform", "translate(0,"+this.canvasHeight+")")
        .append("text")
        .attr("class", "axisLabel")
        .attr("x", this.canvasWidth/4)
        .attr("y", 36)
        .text("BUY");

    this.svg.append("g")
        .attr("transform", "translate(0,"+this.canvasHeight+")")
        .append("text")
        .attr("class", "axisLabel")
        .attr("x", 3*this.canvasWidth/4)
        .attr("y", 36)
        .text("SELL");

    // Draw the y-Axis at fixed intervals with major grid lines drawn in :
    this.svg.append("g")
        .attr("class", "y axis")
        .call(this.yAxis);

    this.svg.append("g")
       .attr("class", "grid")
       .style("stroke-dasharray", ("3,4"))
       .call( yAxisGridLines(this.y).tickSize(-this.canvasWidth,0,0).tickFormat("") );

    function yAxisGridLines(y) {
        return d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(10);
    }

  }


  // ...
  // Draw each entry of the 'hist' data set as a "bubble" with the trade
  // 'status' and 'bid_ask_perc' defining the location of the entry within the
  // chart area. For visualization purposes trade 'volume' is scaled (via the
  // 'sizeBubble' function decalred above). The opacity is used to indicate
  // the relative age of the historic RFQ as well ('nDaysAlpha').
  // ...
  update_history() {

    if (d3.selectAll(".bubble")!=null) {
      d3.selectAll(".bubble").remove(); // It would be cool if these were smooth transitions...
    }

    var hist = [];

    for (var i = 0; i < this.data.history.length; i++) {
      if (this.data.history[i].nDaysAgo < options.RFQperiod) {
        hist.push(this.data.history[i]);
      }
    }

    console.log(this.data);
    console.log(hist);

    var x = this.x;
    var y = this.y;

    var color = this.color;

    this.svg.append("g").selectAll("bubble")
            .data(hist).enter()
            .append("circle")
            .attr("class", "bubble")
            .attr("cx", function (d) { return x(d.status); })
            .attr("cy", function (d) { return y(d.qtpct); })
            .attr("r", function (d) { return d.rfq_qty_size; })
            .style("fill", function (d) { return color(d.status); })
            .style("opacity", function (d) { return alpharize(d.nDaysAgo); })
            .on("mouseover", onMouseOver)
            .on("mouseout", onMouseOut);

    function alpharize(nDaysAgo) {
      return ((60-nDaysAgo)/60) * (0.33-0.10) + 0.10;
    }

    // This is the Mouseover/-out Functionality ---------------------------------------------------------------

   this.tooltip = d3.select("#vizD3")
                    .append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0.0);

    // onMouseOver Function Definition :
    function onMouseOver(d) {
      d3.selectAll("#vizD3 .tooltip").transition()
                                 .duration(200)
                                 .style("opacity", 0.9);
      d3.selectAll("#vizD3 .tooltip").html( ((d.side==="Buy")?("Bought on "):("Sold on "))+euroDate(d.timestamp)+":<br/>"+d.rfq_qty+"k @ "+fmtsigfigs(d.qtpct) )
                  .style("left", d3.mouse(this)[0]+132+"px")
                  .style("top", d3.mouse(this)[1]+66+"px");
      focus(x(d.status), y(d.qtpct), d.rfq_qty_size);
    }

    // onMouseOut Function Definition :
    function onMouseOut(d) {
      d3.selectAll("#vizD3 .tooltip").transition()
                  .duration(500)
                  .style("opacity", 0.0);
      d3.selectAll("svg .focus").remove();
    }

    // focus Function Definition :
    // A function that provides highlighting over an individual data element on
    // mouseover.
    function focus(xcoord, ycoord, radius) {
      return d3.select("#vizD3 g").append("g")
                     .append("circle")
                     .attr("class", "focus")
                     .attr("cx", xcoord)
                     .attr("cy", ycoord)
                     .attr("r", radius+2);
                     // NB: Where the fuck do these shifts come from?!
    }

  }

  update_reference(reference) {

    var y = this.y;

    var refask = 100.00;
    var refbid = 0.00;

    if (reference==="BBG") {
      refask = this.data.askprice;
      refbid = this.data.bidprice;
    }
    else if (reference==="ING") {
      refask = 100.00;
      refbid = 0.00;
    }

    if (document.getElementById(reference).checked) {
      this.add_refline("refLine-"+reference,0,y(refbid),d3.select("g.grid").node().getBBox().width,y(refbid));
      this.add_refline("refLine-"+reference,0,y(refask),d3.select("g.grid").node().getBBox().width,y(refask));
      if (reference=="BBG") {
        this.add_label("refLineText", 0, y(refbid)+12, "ref bid "+refbid);
        this.add_label("refLineText", 0, y(refask)-2, "ref ask "+refask);
      }
    }

    else if (!document.getElementById(reference).checked) {
      d3.selectAll("#vizD3 .refLine-"+reference).remove();
      if (d3.selectAll("#vizD3 .refLineText")!=null) {
        d3.selectAll("#vizD3 .refLineText").remove();
      }
    }

  }

  add_label(className, xcoord, ycoord, label) {
    this.svg.append("g")
            .append("text")
            .attr("class", className)
            .attr("transform", "translate("+[this.canvasWidth-42,0]+")")
            .attr("x", xcoord)
            .attr("y", ycoord)
            .text(label);
  }

  add_refline(className, x1, y1, x2, y2) {
    this.svg.append("g")
            .append("line")
            .attr("class", className)
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x2)
            .attr("y2", y2);
  }

  rescale(reference) {
    if (reference=="BASpread") {
      this.y.domain([-100.0,+200.0])
    }
    else if (reference=="Price") {
      this.y.domain([-91.0,+111.0])
    }
    this.svg.select(".y.axis")
            .transition().duration(1500).ease("sin-in-out") // https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
            .call(this.yAxis);
    this.update_history();
  }

}


var thethingy;


// drawVisualization Function Definition :
// This is the primary functional call of the visualization. The queries to the
// respective endpoints, 'live', 'history', and 'analytics', are used here to
// render the chart area and the surrounding information, build tooltips on
// mouse over, etc.
// function drawVisualization(error, live, hist, analytics) {
function drawVisualization(aRFQ) {

    thethingy = new Visualization("vizD3");

    thethingy.associate_data(aRFQ);
    thethingy.update_all();

    // var data = prepareData(aRFQ);
    // console.log(data);
    //
    // // // Get the size of the window frame (providing 1600:900 HD+ resolution) :
    // var frameWidth = document.getElementById("vizD3").clientWidth;
    // var frameHeight = 0.5250 * frameWidth;
    //
    // // Define a set of margins :
    // var margin = {
    //               top: 0.05 * frameHeight,
    //               right: 0.05 * frameWidth,
    //               bottom: 0.08 * frameHeight,
    //               left: 0.08 * frameWidth
    //              };
    //
    // // Define the size of the SVG canvas to draw :
    // var canvasWidth = frameWidth - margin.left - margin.right;
    // var canvasHeight = frameHeight - margin.top - margin.bottom;
    //
    // // Define variables for the co-ordinates of the x- and y-axes :
    // // The x-axis is drawn with fixed positions; the y-axis is drawn across a
    // // fixed range.
    // var x = d3.scale.ordinal().range([canvasWidth/6, 2*canvasWidth/6, 4*canvasWidth/6, 5*canvasWidth/6]);
    // var y = d3.scale.linear().range([canvasHeight, 0]);
    //
    // // Build the main SVG container for the visualization, and within that a new
    // // graphical grouping ('g') offset with respect to the main visualization area.
    // // We append to the container a function that captures double-clicks, and using
    // // the associated price (as displayed on the y-axis), submits that value, via
    // // WebSocket, back to the database.
    // var svgCanvas = d3.select("#vizD3")
    //                   .append("svg")
    //                   .attr("width", canvasWidth + margin.left + margin.right)
    //                   .attr("height", canvasHeight + margin.top + margin.bottom)
    //                   .on("dblclick", function () {
    //                       var submitPrice = d3.select("text#submitPrice").text();
    //                       var confirm = window.confirm( "Are you sure: "+data.side+"ing "+data.rfq_qty+"k of "+data.description.replace(/[^a-zA-Z]/g,"")+" @ "+submitPrice+"?" );
    //                       if (confirm) {
    //                         genWebSocketMessage("submit_price", data.rfq_id, "client_update", submitPrice);
    //                         removeVisualization();
    //                         console.log("Client submitted price "+submitPrice+" for RFQ ID "+data.rfq_id+".");
    //                       }
    //                   });
    //
    // var svg = svgCanvas.append("g")
    //                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    //
    // // Define labels for the x- and y-axes (note the x-axis label remapping) :
    // var xAxis = d3.svg.axis()
    //                   .scale(x)
    //                   .orient("bottom")
    //                   .tickFormat(function(d) {
    //                     var axislabelmap = { "Lost Buy"  : "lost",
    //                                          "Won Buy"   : "won",
    //                                          "Won Sell"  : "won",
    //                                          "Lost Sell" : "lost"
    //                                        };
    //                     return axislabelmap[d];
    //                   });
    //
    // var yAxis = d3.svg.axis()
    //                   .scale(y)
    //                   .orient("left");
    //
    // // Map the color scheme to the x-axis ordinal scale :
    // // Ref: https://coolors.co/fffeff-67b5d1-16db65-d7263d-02182b
    // var color = d3.scale.ordinal()
    //                     .domain(["Lost Buy", "Won Buy", "Won Sell", "Lost Sell"])
    //                     .range(["#d7263d", "#16db65", "#16db65", "#d7263d"]);
    //
    // // Define a new div-element for displaying tooltips on mouse overs :
    // var tooltip = d3.select("#vizD3")
    //                 .append("div")
    //                 .attr("class", "tooltip")
    //                 .style("opacity", 0.0);
    //
    // // Construct a table at the top of the frame and place within a description
    // // of the on the wire RFQ (at left), and the current position (at right) :
    // var titletable = d3.select("#vizTitle")
    //                    .append("table")
    //                    .attr("width", "100%")
    //                    .append("tr");
    //
    // titletable.append("td")
    //           .attr("width", "50%")
    //           .attr("align", "left")
    //           .append("text")
    //           .html("<span style='font-size:16px'>" + data.cust_firm + "</span><br/>" +
    //                 "<span style='font-size:20px'>" + ((data.side==="Buy")? ("BUY "):("SELL ")) + data.description + "</span><br/>" +
    //                 "<span style='font-size:20px'>" + data.rfq_qty + "k volume</span><br/>" +
    //                 "(<span style='font-size:14px;font-style:italic;'>" + data.instrument_id + "</span>)"
    //            );
    //
    // titletable.append("td")
    //           .attr("width", "50%")
    //           .attr("align", "right")
    //           .append("text")
    //           .style("font-style", "italic")
    //           .html("<span style='font-size:20px;'>Position " + data.position + "</span>");
    //
    //
    // // This functionality, calculation of the bubble sizes, has been migrated
    // // to the data preparation function prepareData, since it need only be
    // // calculated once when the data is associated to the visualization class.
    //
    // // Calculate the median Volume from all data elements :
    // var medianVolume = d3.median(data.history, function (d) { return d.rfq_qty; });
    //
    // // sizeBubble Function Definition :
    // // This function is called whenever the volume of an RFQ is to be visualized
    // // in the main chart area. Volumes are scaled to the median volume present
    // // in the data set, with the median being represented with a bubble 10px in
    // // radius; the minimum and maximum allowed radius is 3 and 50, respectively.
    // function sizeBubble(volume) {
    //     var radius = Math.min(Math.max(3.0, 10.0*volume/medianVolume), 50.0);
    //     return radius;
    // }
    //
    //
    // See Visualization Class method draw_axes() ----
    //
    // // Specify the x- and y-axis domains :
    // // (Note the fixed ordinal scale along the x-axis.)
    // x.domain(["Lost Buy", "Won Buy", "Won Sell", "Lost Sell"]);
    // y.domain([-100.0, +200.0]);
    //
    // // Draw the x-Axis and append categorical text distinguishing Buy and Sell :
    // svg.append("g")
    //     .attr("class", "x axis")
    //     .attr("transform", "translate(0,"+canvasHeight+")")
    //     .call(xAxis);
    //
    // svg.append("g")
    //     .attr("transform", "translate(0,"+canvasHeight+")")
    //     .append("text")
    //     .attr("class", "axisLabel")
    //     .attr("x", canvasWidth/4)
    //     .attr("y", 36)
    //     .text("BUY");
    //
    // svg.append("g")
    //     .attr("transform", "translate(0,"+canvasHeight+")")
    //     .append("text")
    //     .attr("class", "axisLabel")
    //     .attr("x", 3*canvasWidth/4)
    //     .attr("y", 36)
    //     .text("SELL");
    //
    // // Draw the y-Axis at fixed intervals with major grid lines drawn in :
    // svg.append("g")
    //     .attr("class", "y axis")
    //     .call(yAxis);
    //
    // svg.append("g")
    //    .attr("class", "grid")
    //    .call( yAxisGridLines().tickSize(-canvasWidth,0,0).tickFormat("") )
    //    .style("stroke-dasharray", ("3,4"));
    //
    // function yAxisGridLines() {
    //     return d3.svg.axis()
    //         .scale(y)
    //         .orient("left")
    //         .ticks(10);
    // }
    //
    //
    // // Draw in a series of annotated lines that indicate ING's advertized
    // // bid/ask percentages, as well as the market reference bid/ask percentages
    // // (in terms of INGs bid/ask percentage) :
    //
    // if (document.getElementById("option1").checked) {
    //   // drawReferencePrice("option1","ING");
    // }
    //
    // // The "BBG" (or other reference) Ask Price :
    // svg.append("g")
    //     .append("line")
    //     .attr("class", "refLine BBG")
    //     .attr("x1", 0)
    //     .attr("y1", y(data.askprice))
    //     .attr("x2", d3.select("g.grid").node().getBBox().width)
    //     .attr("y2", y(data.askprice));
    //
    // // The "BBG" (or other reference) Bid Price :
    // svg.append("g")
    //     .append("line")
    //     .attr("class", "refLine BBG")
    //     .attr("x1", 0)
    //     .attr("y1", y(data.bidprice))
    //     .attr("x2", d3.select("g.grid").node().getBBox().width)
    //     .attr("y2", y(data.bidprice));
    //
    // // Removed the text appendages - perhaps these should appear on hover :
    //
    // svg.append("g")
    //     .append("text")
    //     .attr("class", "refLineText BBG")
    //     .attr("transform", "translate(" + [canvasWidth - 42, 0] + ")")
    //     .attr("x", 0)
    //     .attr("y", y(data.askprice)-2)
    //     .text("ref ask "+data.askprice);
    //
    // svg.append("g")
    //     .append("text")
    //     .attr("class", "refLineText BBG")
    //     .attr("transform", "translate(" + [canvasWidth - 42, 0] + ")")
    //     .attr("x", 0)
    //     .attr("y", y(data.bidprice)+12)
    //     .text("ref bid "+data.bidprice);
    //
    //
    // // The "ING" (again, this could be another reference) Ask Price :
    // svg.append("g")
    //     .append("line")
    //     .attr("class", "refLine ING")
    //     .attr("x1", 0)
    //     .attr("y1", y(100.0))
    //     .attr("x2", d3.select("g.grid").node().getBBox().width)
    //     .attr("y2", y(100.0));
    //
    // // The "ING" (again, this could be another reference) Bid Price :
    // svg.append("g")
    //     .append("line")
    //     .attr("class", "refLine ING")
    //     .attr("x1", 0)
    //     .attr("y1", y(0.0))
    //     .attr("x2", d3.select("g.grid").node().getBBox().width)
    //     .attr("y2", y(0.0));
    //
    //
    // See Visualization Class method populate ----
    //
    // // Draw each entry of the 'hist' data set as a "bubble" with the trade
    // // 'status' and 'bid_ask_perc' defining the location of the entry within the
    // // chart area. For visualization purposes trade 'volume' is scaled (via the
    // // 'sizeBubble' function decalred above). The opacity is used to indicate
    // // the relative age of the historic RFQ as well ('nDaysAlpha').
    // svg.append("g").selectAll("bubble")
    //    .data(data.history).enter()
    //    .append("circle")
    //    .attr("class", "bubble")
    //    .attr("cx", function (d) { return x(d.status); })
    //    .attr("cy", function (d) { return y(price2plot(d.qtpct)); })
    //    .attr("r", function (d) { return sizeBubble(d.rfq_qty); })
    //    .style("fill", function (d) { return color(d.status); })
    //    .style("opacity", function (d) { return d.nDaysAlpha })
    //    .on("mouseover", onMouseOver)
    //    .on("mouseout", onMouseOut);
    //
    // // price2plot Function Definition :
    // function price2plot(real_price) {
    //   var price2plot = real_price;
    //   if (isNaN(real_price)) {
    //     price2plot = +9999.0;
    //   }
    //   if (real_price > +190.0) {
    //     price2plot = +9999.0;
    //   }
    //   else if (real_price < -90.0) {
    //     price2plot = -9999.0;
    //   }
    //   return price2plot;
    // }
    //
    // // onMouseOver Function Definition :
    // function onMouseOver(d) {
    //   tooltip.transition()
    //          .duration(200)
    //          .style("opacity", 0.9);
    //   tooltip.html( ((d.side==="Buy")? ("Bought on "):("Sold on ")) + d.timestamp + ":<br/>" + d.rfq_qty + "k @ " + d.qtpct )
    //          .style("left", d3.mouse(this)[0]+66+"px")
    //          .style("top", d3.mouse(this)[1]+66+"px");
    //   focus(x(d.status), y(d.qtpct), sizeBubble(d.rfq_qty));
    // }
    //
    // // onMouseOut Function Definition :
    // function onMouseOut(d) {
    //   tooltip.transition()
    //          .duration(500)
    //          .style("opacity", 0.0);
    //   svg.selectAll(".focus").remove();
    // }
    //
    // // focus Function Definition :
    // // A function that provides highlighting over an individual data element on
    // // mouseover.
    // function focus(x, y, z) {
    //     return svg.append("g")
    //               .append("circle")
    //               .attr("class", "focus")
    //               .attr("cx", x)
    //               .attr("cy", y)
    //               .attr("r", z+2);
    // }
    //
    //
    // THE PRICER!!!
    //
    //
    // calcInitPos Function Definition :
    // This function accepts an array of dicts containing key-value pairs of
    // {Bid/Ask-percentage (or 'price') : Hit Rate}. calcInitPos is called when
    // a new RFQ is selected from the queue to position the pricer at a target
    // Hit Rate ('targetHR')of 20-%. To do so the function returns the
    // equivalent y-axis coorindate position corresponding to 'targetHR'.
    var initPrice = calcInitPrice(thethingy.data.analytics);
    function calcInitPrice(analytics) {

      var targetHR = 20.0;

      var delta = Infinity;
      var corrPrice = 42.0;

      for (var thePrice in analytics) {
        var newdelta = Math.abs(targetHR-analytics[thePrice]);
        if (newdelta < delta) {
          delta = newdelta;
          corrPrice = thePrice;
        }
      }

      return corrPrice;

    }

    var pricer = thethingy.svg.append("g")
                    .attr("class", "pricer")
                    .data([{x:0, y:thethingy.y(initPrice)}])
                    .attr("transform", function(d) { return "translate("+[0,thethingy.y(initPrice)]+")"; })
                    .attr("cursor", "row-resize")
                    .call( d3.behavior.drag().on("drag", courseAdjust) )
                    .on("wheel.zoom", fineAdjust);

  d3.select("body")
    .on("keyup", function() {
      const keyUp = 38;
      const keyDown = 40;
      const minimalAdjustment = 0.001;
      const actualPrice = thethingy.y(thethingy.y.invert(pricer.data()[0].y));
      if(d3.event.keyCode == keyUp) {
        pricer.data()[0].y = actualPrice - minimalAdjustment;
        makeAdjust(pricer.data()[0]);
      }

      if(d3.event.keyCode == keyDown) {
        pricer.data()[0].y = actualPrice + minimalAdjustment;
        makeAdjust(pricer.data()[0]);
      }
    });


    var pricerLeft = pricer.append("line")
                           .attr("x1", 0)
                           .attr("x2", thethingy.x(thethingy.data.status)-thethingy.data.rfq_qty_size-3);

    var pricerRight = pricer.append("line")
                            .attr("x1", thethingy.x(thethingy.data.status)+thethingy.data.rfq_qty_size+3)
                            .attr("x2", thethingy.canvasWidth);

    var pricerRFQ = pricer.append("circle")
                          .attr("cx", thethingy.x(thethingy.data.status))
                          .attr("r", thethingy.data.rfq_qty_size)
                          .style("fill", "none")
                          .style("stroke-dasharray", ("2,2"));

    var pricerPolygon = pricer.append("polyline")
                              .attr("transform", "translate("+[thethingy.canvasWidth/2,0]+")")
                              .attr("points", "-35,0 -25,25 25,25 35,0 25,-25 -25,-25 -35,0")
                              .style("fill", "#02182b");

    var pricerHitRate = pricer.append("text")
                              .attr("x", thethingy.canvasWidth/2)
                              .attr("text-anchor", "middle")
                              .text(function (d) {
                                  return calcHitRate(initPrice, thethingy.data.analytics)+"-%";
                              });

    var pricerPrice = pricer.append("text")
                            .attr("id", "submitPrice")
                            .attr("text-anchor", "left")
                            .text(function (d) {
                                return formatPrice(initPrice);
                            });

    function courseAdjust(d) {
      d.y += d3.event.dy;
      return makeAdjust(d);
    }

    function fineAdjust(d) {
      d.y += d3.event.wheelDeltaY / 2000.0;
      return makeAdjust(d);
    }

    function makeAdjust(d) {
      d.y = Math.max(0, Math.min(thethingy.canvasHeight, d.y));
      pricer.attr("transform", "translate("+[0,d.y]+")");
      pricerHitRate.text(calcHitRate(thethingy.y.invert(d.y), thethingy.data.analytics)+"-%");
      pricerPrice.text(formatPrice(thethingy.y.invert(d.y)));
    }

}
