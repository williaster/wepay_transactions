/*
 * Transaction vis counter module. 
 * @author chris c williams
 * @date   2014-12
 *
 * The counter module exposes both wepay.counter() and .minCounter() objects. 
 * Both follow the d3 reusable chart pattern in which, after being initialized 
 * they should be called on a selection which actually creates the DOM element.
 * see the customerpage.js and lobbypage.js scripts for example usage.
 * 
 * The .counter([startCt]) object supports setting properties such as width, 
 * height, margin, label, and count, and takes an optional start count parameter
 * 
 * The .minCounter([startCt]) object supports setting its count, but otherwise
 * only updates the html content of the selection which calls it with the
 * current transaction count.
 */
d3.wepay = d3.wepay || {}; // declare namespace if it doesn't exist 
d3.wepay.counter = function counterLabel(startCt) {
	
	d3.wepay._txnCt = startCt ? startCt : 0;
	
	// Private variables ------------------------------------------------------
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

/*
 * Simpler counter, that sets the text property of the passed selection
 * to the running transaction count. 
 */
d3.wepay.minCounter = function minCounter(startCt) {
	
	d3.wepay._txnCt = startCt ? startCt : 0;
	var selection;

	function counter(_selection) { 
		_selection.each(function() {
			selection = this;
			counter.updateCounter(d3.wepay._txnCt)
		});
	}

	// Sets the count value of the counter to the specified count
	counter.count = function(count) {
		if (!arguments.length) return d3.wepay._txnCt;
		d3.wepay._txnCt = count;
		return this;
	}

	// Updates the selection text to the new count value
	// assumes other components update the d3.wepay._txnCt variable,
	// and only updates the text.
	counter.updateCounter = function(newCt) {
		d3.select(selection).html( d3.wepay.util.numWithCommas(newCt) );
	}

	return counter;
}


