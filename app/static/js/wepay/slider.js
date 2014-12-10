/*
 * Transaction vis slider module. 
 * @author chris c williams
 * @date   2014-12
 *
 * Adds a slider chart function/module to the d3.wepay namespace. The return
 * value follows the d3 reusable chart pattern in the sense that it is 
 * an object and has methods and properties. It also has getter/setter
 * methods to set many slider properties (see Public methdods in code)
 *
 * sliders have sizes, css class handles, initial values, a domain (range) of 
 * values they may take, scales, and labels. labels consist of two parts: 
 * a static text label (the empty string by default), and a numeric value. 
 * The static value can just be set using the labelText() getter/setter. The
 * interface to the numeric value (empty by default) is assigning a function 
 * which is passed the new value of the slider, and the return value of this
 * callback is set as the numeric component of the label. The speed slider in
 * customerpage.js demonstrates this, with a callback that appends "x" to the
 * new numeric value. (e.g., 5 --> 5x).
 *
 * The coolest part about sliders is that upon updating to new value, they
 * execute a callback function which is passed the new slider value. This
 * function can be set using the updateVal() method. In the WePay visualization
 * the callbacks update global private variables in the d3.wepay._x namespace
 * so that the sliders have an effect on some variable in the visualization,
 * e.g., speed or transaction arc lifetime
 */

d3.wepay = d3.wepay || {}; // declare namespace if it doesn't exist 
d3.wepay.slider = function() {
	// Private variables ------------------------------------------------------
	var margin	 		  = { top: 0, right: 0, bottom: 0, left: 25, 
							  speedMargin: 11 },	// margin between slider and label
		width 			  = 150,
		height 		 	  = 75,
		domain            = [1,100], 			// default range of values for slider to take
		initVal           = 1,       			// default initial value of slider. don't use 0 if log scale!
		labelLabelText    = "",
		sliderClass 	  = "slider-g",			// css class for the slider DOM element for styling.
		handleRadius      = 6,      		  	// radius of slider handle circle
		scaleObj          = d3.scale.linear(), 	// linear scale by default, log good for large ranges
		sliderWidth, sliderHeight, slide, sliderHandle, sliderScale, sliderAxis, labelVal, labelLabel, brush;

	function slider(_selection) {
		_selection.each(function(_data) {

			sliderWidth  = width -  margin.left - margin.right,
			sliderHeight = height - margin.top  - margin.bottom;

			var container = d3.select(this).append("g")
				.attr("class", sliderClass)
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			sliderScale = scaleObj
				.domain(domain) 
				.range([0, sliderWidth])
				.clamp(true); 

			brush = d3.svg.brush()
				.x(sliderScale)
				.extent([initVal, initVal]) 
				.on("brush", update);

			sliderAxis = container.append("g")
				.attr("class", "slider-axis")
				.attr("transform", "translate(0," + sliderHeight / 2 + ")")
		      .call( d3.svg.axis().scale(sliderScale).tickSize(0) )
		    	.selectAll(".tick").remove(); // call after axis is made

			slide = container.append("g")
				.attr("class", "slider") // todo need to update classes
				.call(brush);

			// d3 brushes typically support extent and re-sizing, not used when
			// re-purposed as a slider
			slide.selectAll(".extent,.resize").remove();
			slide.select(".background").attr("height", sliderHeight);

			sliderHandle = slide.append("circle")
				.attr("class", "slider-handle")
				.attr("transform", "translate(0," + sliderHeight/2 + ")")
				.attr("r", handleRadius);

			var label = container.append("g")
				.attr("transform", "translate(" + 
					  (+sliderWidth + margin.speedMargin) + "," + sliderHeight/2 + ")")
				.append("text");

			labelVal = label.append("tspan")
				.attr("class", "label-val")
				
			labelLabel = label.append("tspan")
				.attr("class", "label-label")
				.text(labelLabelText);
	
			slide.call(brush.event);
			updateLabel();
		});
	} 
	slider._getLabelValCallback = function() { return ""; }
	slider._setValCallback      = function() { return ""; }

	// Public getter/setter methods -------------------------------------------
	// all support method chaining by returning references to themselves
	slider.initVal = function(_v) { // initial position of slider
		if (!arguments.length) return initVal;
		initVal = _v;
		return this;
	}
	slider.updateVal = function(_sV) { // callback called when updating value
		if (!arguments.length) return slider._setValCallback;
		slider._setValCallback = _sV;
		return this;
	}
	slider.labelText = function(_t) { // text component of the slider label
		if (!arguments.length) return labelLabelText;
		labelLabelText = _t;
		return this;
	}
	slider.getLabelVal = function(_lV) { // callback used to set the val component of slider label
		if (!arguments.length) return slider._getLabelValCallback;
		slider._getLabelValCallback = _lV;
		return this;
	}
	slider.class = function(_c) { // the class for the slider
		if (!arguments.length) return sliderClass;
		sliderClass = _c;
		return this;
	}
	slider.scale = function(_s) { // d3.scale.xxx() object for slider, eg log or linear
		if (!arguments.length) return scaleObj;
		scaleObj = _s;
		return this;
	}
	slider.domain = function(_d) { // set domain of scale
		if (!arguments.length) return domain;
    	domain = _d; 
    	return this;
	}
    slider.margin = function(_m) {
    	if (!arguments.length) return margin;
    	margin = _m; 
    	return this;
    }
    slider.width = function(_w) {
    	if (!arguments.length) return width;
    	width = _w;
    	return this;
    }
	slider.height = function(_h) {
    	if (!arguments.length) return height;
    	height = _h;
    	return this;
    }

    // Private methods --------------------------------------------------------
    /*	
	 * updates the text of the speedlabel slider label to reflect the current
	 * value of speed_multiplier
	 */
	function updateLabel() {
		labelVal.text( slider._getLabelValCallback( brush.extent()[0] ) );
		labelLabel.attr("transform", "translate(" + (+sliderWidth + 
 						 	      +labelVal[0][0].offsetWidth + 
 						 	      +margin.labelSpace) + 
                         	 "," + sliderHeight/2 + ")");
	}
	/*
	 * Updates the speed position of the handle on the slider scale,
	 * and most importantly updates the global speed_multiplier variable
	 * which controls the timing between transaction arcs
	 */
	function update() { 
		var currVal = brush.extent()[0]; // same as [1]
		
		if (d3.event.sourceEvent) { // human event, not programmatic
    		currVal = sliderScale.invert( d3.mouse(this)[0] );
    		brush.extent([currVal, currVal]);
  		}

  		sliderHandle.attr("cx", sliderScale(currVal)); // update handle position
  		slider._setValCallback(currVal); // update the variable the slider maps to
  		updateLabel(); // update label
	}

	return slider; // return closure
}


	


	

