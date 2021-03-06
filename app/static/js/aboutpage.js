/*
 * Creates a d3.js map transaction visualziation. 
 * @param dataFile 			Relative path to a parsed .json file of transactions
 * 							Loops on the transactions in this file
 * @param maxPauseMS 		Maximum pause time between transactions, in ms
 *
 * Requires:
 * 		A div#vis element in the html page in which the visualization will be made
 * Depends on:
 * 		wepay/mapChart.js, wepay/util.js
 * 		d3.js, queue.js, topojson.js
 */
function mapWithoutCounter(dataFile, maxpauseMS) {
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
		visHeight   = visWidth / 2.5 // rough map w : h ratio 
		mapWidth    = visWidth; 	 // nb: map will overflow vis container if not clipped by visHeight
	
	// Create the visualization svg, the map is added to this DOM selection
	var vis = d3.select("#vis").append("svg")
		.attr("class", "vis")
		.attr("width",  visWidth)
		.attr("height", visHeight);

	// Initialize map and counter
	d3.wepay._map = d3.wepay.map()
		.width(mapWidth) // scales height automatically
		.txnLifetime(d3.wepay._txnLifetime);

	// Load map first, then fetch data and start vis
	queue(1) // nb: .defer() passes a callback to the funtion, too
		.defer(d3.wepay._map, vis)
		.defer(d3.wepay.util.getData, dataFile) 
	 	.await(d3.wepay._map.start);
}