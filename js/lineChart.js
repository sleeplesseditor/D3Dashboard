LineChart = function (_parentElement, _coin){
    this.parentElement = _parentElement;
    this.coin = _coin;
    this.initVis();
};

LineChart.prototype.initVis = function(){
    var vis = this;

    vis.margin = { left:80, right:100, top:50, bottom:100 };
    vis.height = 500 - vis.margin.top - vis.margin.bottom;
    vis.width = 800 - vis.margin.left - vis.margin.right;

    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)

    vis.g = vis.svg.append("g")
        .attr("transform", "translate(" + vis.margin.left + 
            ", " + vis.margin.top + ")");

    vis.t = function(){ return d3.transition().duration(1000); }

    // Add the line for the first time
    vis.g.append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "grey")
        .attr("stroke-width", "3px");

    // Labels
    vis.xLabel = vis.g.append("text")
        .attr("class", "x axisLabel")
        .attr("y", vis.height + 50)
        .attr("x", vis.width / 2)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Time");
    vis.yLabel = vis.g.append("text")
        .attr("class", "y axisLabel")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -170)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Price (USD)")

    // Scales
    vis.x = d3.scaleTime().range([0, vis.width]);
    vis.y = d3.scaleLinear().range([vis.height, 0]);

    // X-axis
    vis.xAxisCall = d3.axisBottom()
        .ticks(4);
    vis.xAxis = vis.g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + vis.height +")");

    // Y-axis
    vis.yAxisCall = d3.axisLeft()
    vis.yAxis = vis.g.append("g")
        .attr("class", "y axis");

    vis.wrangleData();
};

LineChart.prototype.wrangleData = function(){
    var vis = this;

    vis.coin = $("#coin-select").val()
    vis.yValue = $("#var-select").val()
    vis.sliderValues = $("#date-slider").slider("values");
    vis.dataTimeFiltered = filteredData[vis.coin].filter(function(d){
        return ((d.date >= vis.sliderValues[0]) && (d.date <= vis.sliderValues[1]))
    });

    vis.updateVis();
};

LineChart.prototype.updateVis = function(){
    var vis = this;

    // Update scales
    vis.x.domain(d3.extent(vis.dataTimeFiltered, function(d){ return d.date; }));
    vis.y.domain([d3.min(vis.dataTimeFiltered, function(d){ return d[vis.yValue]; }) / 1.005, 
        d3.max(vis.dataTimeFiltered, function(d){ return d[vis.yValue]; }) * 1.005]);

    // Fix for format values
    var formatSi = d3.format(".2s");
    function formatAbbreviation(x) {
        var s = formatSi(x);
        switch (s[s.length - 1]) {
                case "G": return s.slice(0, -1) + "B";
                case "k": return s.slice(0, -1) + "K";
        }
    return s;
    }

    // Update axes
    vis.xAxisCall.scale(vis.x);
    vis.xAxis.transition(vis.t()).call(vis.xAxisCall);
    vis.yAxisCall.scale(vis.y);
    vis.yAxis.transition(vis.t()).call(vis.yAxisCall.tickFormat(formatAbbreviation));

    // Clear old tooltips
    d3.select(".focus").remove();
    d3.select(".overlay").remove();

    // Tooltip code
    var focus = vis.g.append("g")
        .attr("class", "focus")
        .style("display", "none");
    focus.append("line")
        .attr("class", "x-hover-line hover-line")
        .attr("y1", 0)
        .attr("y2", vis.height);
    focus.append("line")
        .attr("class", "y-hover-line hover-line")
        .attr("x1", 0)
        .attr("x2", vis.width);
    focus.append("circle")
        .attr("r", 5);
    focus.append("text")
        .attr("x", 15)
        .attr("dy", ".31em");
    vis.svg.append("rect")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")")
        .attr("class", "overlay")
        .attr("width", vis.width)
        .attr("height", vis.height)
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); })
        .on("mousemove", mousemove);
        
    function mousemove() {
        var x0 = vis.x.invert(d3.mouse(this)[0]),
            i = bisectDate(vis.dataTimeFiltered, x0, 1),
            d0 = vis.dataTimeFiltered[i - 1],
            d1 = vis.dataTimeFiltered[i],
            d = (d1 && d0) ? (x0 - d0.date > d1.date - x0 ? d1 : d0) : 0;
        focus.attr("transform", "translate(" + vis.x(d.date) + "," + vis.y(d[vis.yValue]) + ")");
        focus.select("text").text(function() { return d3.format("$,")(d[vis.yValue].toFixed(2)); });
        focus.select(".x-hover-line").attr("y2", vis.height - vis.y(d[vis.yValue]));
        focus.select(".y-hover-line").attr("x2", -vis.x(d.date));
    }

    // Path generator
    line = d3.line()
        .x(function(d){ return vis.x(d.date); })
        .y(function(d){ return vis.y(d[vis.yValue]); });

    // Update our line path
    vis.g.select(".line")
        .transition(vis.t)
        .attr("d", line(vis.dataTimeFiltered));

    // Update y-axis label
    var newText = (vis.yValue == "price_usd") ? "Price (USD)" :
        ((yValue == "market_cap") ?  "Market Capitalization (USD)" : "24 Hour Trading Volume (USD)")
    vis.yLabel.text(newText);
};