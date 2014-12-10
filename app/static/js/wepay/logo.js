/*
 * Logo module. Makes a wepay logo.
 * @date  	2014-12
 * @author 	chris c williams
 *
 * wepay.logo() initiailizes a logo object with a specific size and margins.
 * Following the d3 reusable chart pattern, after initialization the object
 * should be called on a selection, in which the logo is made.
 */

 d3.wepay = d3.wepay || {} // lazy loading of namespace
 d3.wepay.logo = function() {

 	var margin = { top: 100, right: 0, bottom: 0, left: 25 },
 		width  = 300,
 		height = 200;

 	function logo(_selection) {
 		_selection.each(function(_data) {

	 		var logo = d3.select(this).append("svg")
				.attr("class", "logo")
				.attr("width",  width)
				.attr("height", height)
			  .append("g")
			  	.attr("transform", "translate(" + margin.left + ", " + margin.top + ")")
			  	.append("text");
			  
			var we = logo.append("tspan")
				.attr("class", "blue")
				.text("we");

			var pay = logo.append("tspan")
				.attr("class", "green")
				.text("pay")
			
 		});
 	}

    // Public getter/setter methods -------------------------------------------
    // If setting a value, returns the chart for method chaining pattern.
    logo.margin = function(_m) {
    	if (!arguments.length) return margin;
    	margin = _m; 
    	return this;
    }
    logo.width = function(_w) {
    	if (!arguments.length) return width;
    	width = _w;
    	return this;
    }
	logo.height = function(_h) {
    	if (!arguments.length) return height;
    	height = _h;
    	return this;
    }

 	return logo;
 }

 // Currently not used. A minimal text element
 d3.wepay.label = function(text) {
 	var labelText = text ? text : "";

 	function label(_selection) {
 		_selection.each(function(_data) {

 			var labelG = d3.select(this).append("svg")
				.attr("class", "label")
				.attr("width",  width)
				.attr("height", height)
			  .append("g")
			  	.attr("transform", "translate(" + margin.left + ", " + margin.top + ")")
			  	.append("text")
				.text(text);
				
 		});
 	}

 	// Public getter/setter methods -------------------------------------------
    // If setting a value, returns the chart for method chaining pattern.
    label.margin = function(_m) {
    	if (!arguments.length) return margin;
    	margin = _m; 
    	return this;
    }
    label.width = function(_w) {
    	if (!arguments.length) return width;
    	width = _w;
    	return this;
    }
	label.height = function(_h) {
    	if (!arguments.length) return height;
    	height = _h;
    	return this;
    }
    label.text = function(_t) {
    	if (!arguments.length) return labelText;
    	labelText = _t;
    	return this;
    }

 	return label;
 }