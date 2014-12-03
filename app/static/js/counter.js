d3.wepay = d3.wepay || {}; // declare namespace if it doesn't exist 



d3.wepay.counter = function counterLabel(startCt) {

	d3.wepay._txnCt = startCt ? startCt : 0;
	
	var margin = { top: 0, right: 0, bottom: 0, left: 0,
				   labelLeft: 0, labelTop: 25 },
		width  = 300,
		height = 300,
		label  = "Total transactions",
		counterCt; 

	function counter(_selection) {
		_selection.each(function(_data) {
			
			var counterWidth  = width -  margin.left - margin.right,
				counterHeight = height - margin.top  - margin.bottom;
			
			var txnCounter = d3.select(this).append("svg")
				.attr("class", "txn-counter")
				.attr("width",  width)
				.attr("height", height)
			  .append("g")
			  	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			counterCt = txnCounter.append("text")
				.attr("class", "transaction-ct")
				.text("" + d3.wepay._txnCt);

			var counterLabel = txnCounter.append("text")
				.attr("class", "ct-label")
				.text(label)
				.attr("transform", "translate(" +  margin.labelLeft + ", " + 
												   margin.labelTop + ")");
		});

	}
	// Public getter/setter methods -------------------------------------------
	// If setting a value, returns the chart for method chaining pattern.
    counter.count = function(_c) {
    	if (!arguments.length) return  d3.wepay._txnCt;
    	d3.wepay._txnCt = +_c; // coerce to number
    	return this;
    }
    counter.label = function(_l) {
    	if (!arguments.length) return label;
    	label = _l;
    	return this;
    }
    counter.margin = function(_m) {
    	if (!arguments.length) return margin;
    	margin = _m; 
    	return this;
    }
    counter.width = function(_w) {
    	if (!arguments.length) return width;
    	width = _w;
    	return this;
    }
	counter.height = function(_h) {
    	if (!arguments.length) return height;
    	height = _h;
    	return this;
    }

   
	// Public methods ---------------------------------------------------------
	/*
	 * Sets the counter label count to the specified count
	 */
	counter.updateCounter = function(newCt) {
		counterCt.text( d3.wepay.util.numWithCommas(newCt) );
	}

	return counter;
}