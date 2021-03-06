define(["jquery", "text!./HexagonalBinning.css","./d3.min","./hexbin"], function($, cssContent) {'use strict';
	$("<style>").html(cssContent).appendTo("head");
	return {
		initialProperties : {
			version: 1.0,
			qHyperCubeDef : {
				qDimensions : [],
				qMeasures : [],
				qInitialDataFetch : [{
					qWidth : 3,
					qHeight : 1000
				}]
			}
		},
		definition : {
			type : "items",
			component : "accordion",
			items : {
				dimensions : {
					uses : "dimensions",
					min : 1,
					max: 1
				},
				measures : {
					uses : "measures",
					min : 2,
					max: 2
				},
				sorting : {
					uses : "sorting"
				},
				addons : {
					uses : "addons"
				},
				settings : {
					uses : "settings"
				}
			}
		},
		snapshot : {
			canTakeSnapshot : true
		},
		paint : function($element,layout) {
		
			var self = this;
			
			// get qMatrix data array
			var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
			// create a new array that contains the measure labels
			var measureLabels = layout.qHyperCube.qMeasureInfo.map(function(d) {
				return d.qFallbackTitle;
			});
			// Create a new array for our extension with a row for each row in the qMatrix
			var data = qMatrix.map(function(d) {
				// for each element in the matrix, create a new object that has a property
				// for the grouping dimension, the first metric, and the second metric
				return {
					"Dim1":d[0].qText,
					"Dim1_key":d[0].qElemNumber,
					"Metric1":d[1].qNum,
					"Metric2":d[2].qNum
				}
			});
		 
			// Get the selected counts for the 2 dimensions, which will be used later for custom selection logic
			var selections = {
				dim1_count: layout.qHyperCube.qDimensionInfo[0].qStateCounts.qSelected,
			};
			 
			// Chart object width
			var width = $element.width();
			// Chart object height
			var height = $element.height();
			// Chart object id
			var id = "container_" + layout.qInfo.qId;
		    		 
			// Check to see if the chart element has already been created
			if (document.getElementById(id)) {
				// if it has been created, empty it's contents so we can redraw it
				$("#" + id).empty();
			}
			else {
				// if it hasn't been created, create it with the appropriate id and size
				$element.append($('<div />').attr("id", id).width(width).height(height));
			}

			viz(self,data,measureLabels,width,height,id, selections);

		}
	};
});

var viz = function (self,data,labels,width,height,id,selections) {
	
	// Set up index and array to store points data for hexbin
	var index;
	var points = [];

	// Read in the data for each data point
	for (index = 0; index < data.length; ++index) {
		points.push([data[index].Metric1, data[index].Metric2, data[index].Dim1, data[index].Dim1_key]);
	}

	// Set the margins of the object
	var margin = {top: 20, right: 10, bottom: 50, left: 50},
		width = width - margin.left - margin.right,
		height = height - margin.top - margin.bottom;
	

	// Set the colour scale to mimic Sense Sequential Classes colour scheme
	var color = d3.scale.linear()
		.domain([0, 6])
		.range(["#FEE391", "#993404"])
		.interpolate(d3.interpolateLab);
	
	// Create the hexbin underlying grid
	// Set the radius to a set width of 20 pixels
	var hexbin = d3.hexbin()
		.size([width, height])
		.radius(20);
	
	// Set the x-axis to min and max of Metric 1
	var x = d3.scale.linear()
		.domain(d3.extent(data, function(d) { return d.Metric1; }))
		.range([0, width]);
		
	// Set the y-axis to min and max of Metric 2	
	var y = d3.scale.linear()
		.domain(d3.extent(data, function(d) { return d.Metric2; }))
		.range([0, height]);
		
	// Draw the x-axis
	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
		.tickSize(6, -height);

	// Draw the y-axis	
	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.tickSize(6, -width);

	// Create the svg element	
	var svg = d3.select("#"+id).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Create the mesh for the hexagons
	var mesh = svg.append("clipPath")
		.attr("id", "clip")
		.append("rect")
		.attr("class", "mesh")
		.attr("width", width)
		.attr("height", height);

	// Create the underlying mesh grid and the points within each hexagon
	var hexpoints = svg.append("g")
		.attr("clip-path", "url(#clip)")
	  .selectAll(".hexagon")
		.data(hexbin(points));
	
	// Create, transform and colour the hexagons in the mesh
	var hexpoints2 = hexpoints.enter().append("path")
		.attr("class", "hexagon")
		.attr("d", hexbin.hexagon())
		.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
		.style("fill", function(d) { return color(d.length); });
	
	// Create the y-axis label
	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
		.append("text")
			  .attr("class", "label")
			  .attr("transform", "rotate(-90)")
			  .attr("y", -40)		  
			  .attr("dy", ".71em")
			  .style("text-anchor", "end")
			  .text(labels[1]);
	
	// Create the x-axis label 
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis)
			.append("text")
			  .attr("class", "label")
			  .attr("x", width)
			  .attr("y", 40)
			  .style("text-anchor", "end")
			  .text(labels[0]);
	
	// Create the click function, to enable selections when clicking on a hexagon
	hexpoints2.on("click", function(data) {

		// Set up an array to store the data points in the selected hexagon
		var selectarray = [];
		  
			// Push the Dim1_key from the data array to get the unique selected values
			for (index = 0; index < data.length; ++index) {
				selectarray.push(data[index][3]);	
			}
			
			// Make the selections
			self.backendApi.selectValues(0,selectarray,false);

			// Stop the event propagating in case we add other events later
			d3.event.stopPropagation();
	});

}




	
	
