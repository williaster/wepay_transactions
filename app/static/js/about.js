function makeVisualization(dataFile, maxpauseMS, startCt) {
	d3.select("#loading").remove(); 
	
	d3.wepay._maxTransactions = 50000, 	// max transactions summarized in the timeline; 
								  	  	// without an upper limit, could exceed memory.
	d3.wepay._maxPauseMS      = maxpauseMS,  	
										// Maximum pause time between transaction animations.
										// Deviates from reality more by minimizing time
									  	// gap between transactions, but decreasing makes the
										// the speed slider more responsive, especially for
										// slow speeds (speed change doesn't take effect until 
									 	// the next-queued txn fires);
	d3.wepay._startDelayMS    = 2000, 
	d3.wepay._txnLifetime     = 1200,   // how long arcs are displayed
	d3.wepay._speedMultiplier = 5,      // time multiplier (* real time)
	d3.wepay._dataFile    	  = dataFile,     
	d3.wepay._loop 			  = true;   

	var visWidth    = 964,
		visHeight   = 380,
		mapMargin   = { top: 0, right: 0, bottom: 140, left: 0 }, // bottom margin pushes map upward
		mapWidth    = visWidth;
	
	// Create the visualization svg, the map is added to this DOM selection
	var vis = d3.select("#vis").append("svg")
		.attr("class", "vis")
		.attr("width",  visWidth)
		.attr("height", visHeight);

	// Initialize map and counter
	d3.wepay._map = d3.wepay.map()
		.margin(mapMargin)
		.width(mapWidth) // scales height automatically
		.txnLifetime(d3.wepay._txnLifetime);

	d3.wepay._counter = d3.wepay.minCounter()
		.count(startCt);

	// Create map and counter
	vis.call(d3.wepay._map) // make map
	d3.select("#txn-ct")    // make counter, updates the selection that calls it
		.call(d3.wepay._counter); 

	queue() // nb: .defer() passes a callback to the funtion, too
		.defer(d3.wepay.util.getData, dataFile) 
	 	.await(d3.wepay._map.start);
}